from pydantic import BaseModel, EmailStr, Field
import uuid

class RegisterRequest(BaseModel):
    workspace_name: str = Field(..., min_length=2, max_length=100, example="My SaaS Startup")
    email: EmailStr = Field(..., example="owner@mysaas.com")
    name: str = Field(..., min_length=2, max_length=100, example="Alex Mercer")
    password: str = Field(..., min_length=8, max_length=100, example="securePassword123")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="owner@mysaas.com")
    password: str = Field(..., example="securePassword123")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    workspace_id: uuid.UUID
    role: str
    user_id: uuid.UUID | None = None
