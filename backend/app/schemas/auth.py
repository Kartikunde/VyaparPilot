from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserRegisterRequest(BaseModel):
    business_name: str
    full_name: str
    email: EmailStr
    password: str
    phone: str
    address: Optional[str] = "Industrial Area, Phase 2"
    city: Optional[str] = "Pune"
    state: Optional[str] = "Maharashtra"
    pincode: Optional[str] = "411019"
    gstin: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    business_id: int
    business_name: Optional[str] = None
    business_slug: Optional[str] = None
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
