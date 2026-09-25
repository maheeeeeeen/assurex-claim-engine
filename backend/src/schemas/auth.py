"""
AssureX Claim Engine — Authentication Schemas
"""

from typing import Optional
from pydantic import BaseModel


class UserRegister(BaseModel):
    username: Optional[str] = None
    email: str
    password: str
    full_name: str
    role: Optional[str] = "customer"  # customer, reviewer, admin


class UserLogin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    created_at: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
