"""
User schemas
"""
import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Any
from datetime import datetime


_PASSWORD_MIN_LEN = 8
_PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).+$")


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < _PASSWORD_MIN_LEN:
            raise ValueError("Password must be at least 8 characters")
        if not _PASSWORD_PATTERN.match(v):
            raise ValueError("Password must include at least one letter and one number")
        return v


class UserResponse(BaseModel):
    id: str
    email: str
    subscription_tier: str
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def id_to_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v) if not isinstance(v, str) else v

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
    access_token: Optional[str] = None


class AppleSignInRequest(BaseModel):
    identity_token: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
