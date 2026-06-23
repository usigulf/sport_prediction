"""
Authentication endpoints
"""
import secrets
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
    AppleSignInRequest,
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
from app.services.apple_auth_service import AppleAuthError, verify_apple_identity_token

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


def _oauth_only_password_hash() -> str:
    """Random bcrypt hash — Apple-only accounts cannot password-login."""
    return get_password_hash(secrets.token_urlsafe(48))


@router.post("/apple", response_model=Token)
async def sign_in_with_apple(
    body: AppleSignInRequest,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_auth),
):
    """Exchange a verified Apple identity token for app JWTs."""
    try:
        claims = verify_apple_identity_token(
            body.identity_token.strip(),
            audience=settings.apple_client_id,
        )
    except AppleAuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple sign-in token",
        )

    apple_sub = claims.get("sub")
    if not apple_sub or not isinstance(apple_sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple sign-in token",
        )

    token_email = claims.get("email")
    if isinstance(token_email, str):
        token_email = token_email.strip().lower()
    else:
        token_email = None

    email = (body.email or token_email or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple did not provide an email. Enable email sharing or use email sign-in.",
        )

    user = db.query(User).filter(User.apple_sub == apple_sub).first()
    if user:
        if user.email != email and token_email and user.email != token_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Apple account email mismatch. Contact support.",
            )
        return _token_pair_for_user(user)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.apple_sub and existing.apple_sub != apple_sub:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered with a different Apple ID",
            )
        existing.apple_sub = apple_sub
        db.commit()
        db.refresh(existing)
        return _token_pair_for_user(existing)

    user = User(
        email=email,
        password_hash=_oauth_only_password_hash(),
        apple_sub=apple_sub,
        subscription_tier="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
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
                token_uid = payload.get("user_id")
                if token_uid is not None and str(token_uid) == str(current_user.id):
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
