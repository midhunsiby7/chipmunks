from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    email: str
    full_name: str
    phone_number: Optional[str] = None
    company_name: Optional[str] = None


class CustomerProfileCreateRequest(BaseModel):
    """Public customer profile initialization. Strictly no role, email, or password."""
    full_name: str = Field(..., min_length=1, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)


class StaffCreateRequest(BaseModel):
    """Admin-only staff provisioning request. Passwords are never accepted."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=255)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone_number: Optional[str] = None
    company_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Public user response schema. Strictly excludes internal firebase_uid."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StaffCreateResponse(BaseModel):
    """Response returned upon staff account creation."""
    user: UserResponse
    email_dispatched: bool = False
    password_setup_link: Optional[str] = None
    email_verification_link: Optional[str] = None


class ResendLinksResponse(BaseModel):
    """Response returned when re-dispatching staff onboarding links."""
    message: str
    email_dispatched: bool = False
    password_setup_link: Optional[str] = None
    email_verification_link: Optional[str] = None
