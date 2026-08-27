from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth import register_user, authenticate_user, get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new CUSTOMER or MERCHANT account.
    """
    user = register_user(db=db, user_in=user_in)
    return UserResponse.model_validate(user)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns JWT bearer token.
    """
    return authenticate_user(db=db, credentials=credentials)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user profile. Requires valid Bearer Token.
    """
    return UserResponse.model_validate(current_user)
