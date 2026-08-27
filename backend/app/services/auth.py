from typing import Optional
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.errors import RecoverAIException
from app.core.database import get_db

security_bearer = HTTPBearer(auto_error=False)

ALLOWED_ROLES = {"CUSTOMER", "MERCHANT"}

def register_user(db: Session, user_in: UserCreate) -> User:
    """
    Registers a new user (CUSTOMER or MERCHANT). Explicitly rejects AGENT role.
    """
    normalized_role = user_in.role.upper().strip()
    if normalized_role not in ALLOWED_ROLES:
        if normalized_role == "AGENT":
            raise RecoverAIException(
                message="Registration with the AGENT role is prohibited.",
                code="PROHIBITED_ROLE",
                status_code=400
            )
        raise RecoverAIException(
            message=f"Invalid role. Allowed roles are: {', '.join(ALLOWED_ROLES)}",
            code="INVALID_ROLE",
            status_code=400
        )

    normalized_email = user_in.email.strip().lower()
    
    # Check duplicate email
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise RecoverAIException(
            message="An account with this email already exists.",
            code="DUPLICATE_EMAIL",
            status_code=400
        )

    hashed_password = get_password_hash(user_in.password)
    
    new_user = User(
        full_name=user_in.full_name.strip(),
        email=normalized_email,
        password_hash=hashed_password,
        role=normalized_role,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(db: Session, credentials: LoginRequest) -> TokenResponse:
    """
    Authenticates user credentials and returns JWT bearer access token.
    """
    normalized_email = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise RecoverAIException(
            message="Invalid email or password.",
            code="INVALID_CREDENTIALS",
            status_code=401
        )

    if not user.is_active:
        raise RecoverAIException(
            message="Account is inactive.",
            code="ACCOUNT_INACTIVE",
            status_code=401
        )

    token = create_access_token(data={"sub": user.id, "role": user.role})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that validates Bearer token and returns current authenticated User.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_access_token(auth.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
