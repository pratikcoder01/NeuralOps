from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import uuid
from src.core.rbac import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.READONLY
    avatar_url: str | None = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserResponse(UserBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    last_login_at: datetime | None = None

    class Config:
        from_attributes = True
