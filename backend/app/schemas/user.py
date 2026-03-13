"""
User schemas
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Any
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str


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
