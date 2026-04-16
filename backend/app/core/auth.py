import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Annotated, Optional, Dict, Any
import os
import json
from pathlib import Path
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from .database import get_db
from ..models.models import User

# Initialize Firebase Admin SDK
# Path to service account JSON
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "firebase-service-account.json")

def _load_firebase_project_id() -> Optional[str]:
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
    errors: list[str] = []

    # Primary path: Firebase Admin SDK (works with service account / ADC).
    if firebase_admin._apps:
        try:
            return auth.verify_id_token(token)
        except Exception as e:
            errors.append(f"admin_verify_failed={e}")

    # Fallback path: verify token with Google certs, no ADC required.
    try:
        request = google_requests.Request()
        if FIREBASE_PROJECT_ID:
            decoded = google_id_token.verify_firebase_token(
                token,
                request,
                audience=FIREBASE_PROJECT_ID,
            )
        else:
            decoded = google_id_token.verify_firebase_token(token, request)

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

async def get_current_user(
    token: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    try:
        # Verify the ID token
        decoded_token = _verify_firebase_token(token.credentials)
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
