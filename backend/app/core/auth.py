import asyncio
import json
import os
import time
from pathlib import Path
from typing import Annotated, Any, Dict, Optional

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from ..models.models import User
from app.core.logger import log_func

# Global shared request object to reuse TCP/SSL connections to Google
_GOOGLE_REQUEST = google_requests.Request()

# Simple in-memory cache for verified tokens to avoid repeated network calls to Google
# Token -> (decoded_data, expiry_timestamp)
_TOKEN_CACHE: Dict[str, Any] = {}
_CACHE_TTL = 900 # 15 minutes

# Initialize Firebase Admin SDK
# Path to service account JSON
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "firebase-service-account.json")

def _load_firebase_project_id() -> Optional[str]:
    log_func("_load_firebase_project_id", level=2)
    env_project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
    if env_project_id:
        return env_project_id

    # Local fallback: read from frontend firebase config in this monorepo.
    config_path = (
        Path(__file__).resolve().parents[3]
        / "frontend"
        / "firebase-applet-config.json"
    )
    try:
        with config_path.open("r", encoding="utf-8") as f:
            config = json.load(f)
        project_id = config.get("projectId")
        return project_id if isinstance(project_id, str) and project_id.strip() else None
    except Exception:
        return None

FIREBASE_PROJECT_ID = _load_firebase_project_id()

if not firebase_admin._apps:
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback for environments where service account is provided via env vars 
        # or where default credentials are available
        try:
            options = {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None
            firebase_admin.initialize_app(options=options)
        except Exception as e:
            print(f"Warning: Firebase Admin SDK not initialized: {e}")

security = HTTPBearer()

def _verify_firebase_token(token: str) -> Dict[str, Any]:
    log_func("_verify_firebase_token", level=2)
    errors: list[str] = []

    # Primary path: Firebase Admin SDK (works with service account / ADC).
    if firebase_admin._apps:
        try:
            return auth.verify_id_token(token)
        except Exception as e:
            errors.append(f"admin_verify_failed={e}")

    # Fallback path: verify token with Google certs, no ADC required.
    # We use a strict timeout here to prevent the 14s hang
    try:
        if FIREBASE_PROJECT_ID:
            decoded = google_id_token.verify_firebase_token(
                token,
                _GOOGLE_REQUEST,
                audience=FIREBASE_PROJECT_ID,
            )
        else:
            decoded = google_id_token.verify_firebase_token(token, _GOOGLE_REQUEST)

        if not decoded:
            raise ValueError("verify_firebase_token returned empty payload")
        return decoded
    except Exception as e:
        errors.append(f"google_verify_failed={e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Could not validate credentials: {' | '.join(errors)}",
        headers={"WWW-Authenticate": "Bearer"},
    )

def _verify_firebase_token_with_cache(token: str) -> Dict[str, Any]:
    log_func("_verify_firebase_token_with_cache", level=2)
    now = time.time()
    if token in _TOKEN_CACHE:
        data, expiry = _TOKEN_CACHE[token]
        if now < expiry:
            return data
        else:
            del _TOKEN_CACHE[token]
    
    decoded = _verify_firebase_token(token)
    
    # Cache the result for 5 minutes
    _TOKEN_CACHE[token] = (decoded, now + _CACHE_TTL)
    
    # Cleanup old cache entries occasionally
    if len(_TOKEN_CACHE) > 100:
        expired_keys = [k for k, v in _TOKEN_CACHE.items() if now > v[1]]
        for k in expired_keys: del _TOKEN_CACHE[k]
        
    return decoded

async def get_current_user(
    token: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    log_func("get_current_user")
    try:
        # Verify the ID token (run in thread pool and use local cache)
        # We add a hard 5-second timeout to prevent the initial 14s hang
        try:
            decoded_token = await asyncio.wait_for(
                asyncio.to_thread(_verify_firebase_token_with_cache, token.credentials),
                timeout=20.0
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Authentication timed out after 20 seconds. Please check your network connection to Google Services."
            )
        
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        name = decoded_token.get("name", "User")
        picture = decoded_token.get("picture", "")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing email",
            )

        # Check if user exists in our local DB
        db_user = db.query(User).filter(User.email == email).first()
        
        if not db_user:
            try:
                # Auto-create user record on first successful auth
                db_user = User(
                    email=email,
                    name=name,
                    avatar=picture,
                    is_onboarded=False
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
            except IntegrityError:
                db.rollback()
                # Another request might have created the user simultaneously
                db_user = db.query(User).filter(User.email == email).first()
                if not db_user:
                    # If still not found, it's a different integrity issue
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Database integrity error during user creation"
                    )
            
        return db_user

    except HTTPException:
        # Re-raise HTTPExceptions as-is to preserve status code and detail
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Dependency alias
CurrentUser = Annotated[User, Depends(get_current_user)]
