"""
Authentication endpoints
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.api.deps import get_current_user, rate_limit_auth
from app.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
    RefreshTokenRequest,
    LogoutRequest,
)
from app.models.user import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    verify_access_token,
    revoke_token_by_payload,
)
from app.config import get_settings

router = APIRouter()
settings = get_settings()


def _token_pair_for_user(user: User) -> dict:
    data = {"sub": user.email, "user_id": str(user.id)}
    access_token = create_access_token(
        data=data,
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )
    refresh_token = create_refresh_token(
        data=data,
        expires_delta=timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_auth),
):
    """Register a new user"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        subscription_tier="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_auth),
):
    """Login and get access token"""
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _token_pair_for_user(user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    body: RefreshTokenRequest,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_auth),
):
    """Refresh access token. Send JSON body: {"refresh_token": "<token>"}."""
    payload = verify_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    revoke_token_by_payload(payload)

    user_id = payload.get("user_id")
    email = payload.get("sub")
    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return _token_pair_for_user(user)


@router.post("/logout")
async def logout(
    body: Optional[LogoutRequest] = None,
    current_user: User = Depends(get_current_user),
):
    """Revoke refresh/access tokens server-side when provided."""
    if body:
        if body.refresh_token:
            payload = verify_refresh_token(body.refresh_token)
            if payload:
                revoke_token_by_payload(payload)
        if body.access_token:
            payload = verify_access_token(body.access_token)
            if payload and str(payload.get("user_id")) == str(current_user.id):
                revoke_token_by_payload(payload)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse, deprecated=True)
async def get_current_user_info_deprecated(
    current_user: User = Depends(get_current_user),
):
    """Deprecated: use GET /api/v1/user/me instead."""
    return current_user
