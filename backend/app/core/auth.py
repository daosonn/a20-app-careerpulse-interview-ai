import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Annotated
import os

from .database import get_db
from ..models.models import User

# Initialize Firebase Admin SDK
# Path to service account JSON
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "firebase-service-account.json")

if not firebase_admin._apps:
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback for environments where service account is provided via env vars 
        # or where default credentials are available
        try:
            firebase_admin.initialize_app()
        except Exception as e:
            print(f"Warning: Firebase Admin SDK not initialized: {e}")

security = HTTPBearer()

async def get_current_user(
    token: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token.credentials)
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
            
        return db_user

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Dependency alias
CurrentUser = Annotated[User, Depends(get_current_user)]
