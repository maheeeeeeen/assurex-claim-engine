"""
AssureX Claim Engine — Authentication Router
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.database_setup import get_session
from src.models import User
from src.auth.service import hash_password, verify_password, create_access_token, get_current_user
from src.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, session: Session = Depends(get_session)):
    """Register a new user account."""
    uname = user_in.username or user_in.email.split("@")[0]
    # Check if username exists
    existing_user = session.exec(select(User).where(User.username == uname)).first()
    if existing_user and user_in.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    elif existing_user:
        uname = f"{uname}_{int(datetime.utcnow().timestamp())}"

    # Check if email exists
    existing_email = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )

    role = user_in.role if user_in.role in ["customer", "reviewer", "admin"] else "customer"

    db_user = User(
        username=uname,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=role,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    token = create_access_token({"sub": db_user.username, "role": db_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": db_user,
    }


@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, session: Session = Depends(get_session)):
    """Authenticate and obtain JWT access token."""
    identifier = login_data.username or login_data.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required",
        )

    user = session.exec(
        select(User).where((User.username == identifier) | (User.email == identifier))
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently logged-in user."""
    return current_user


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Alias for /me."""
    return current_user
