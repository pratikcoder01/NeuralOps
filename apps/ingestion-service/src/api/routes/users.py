import logging
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.user import UserResponse, UserCreate, UserRoleUpdate
from src.models.user import User
from src.dependencies import get_current_user_claims, RoleEnforcer, AuditLogHook
from src.core.rbac import UserRole
from src.core.security import hash_password

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_workspace_users(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Lists all active users inside the current workspace context."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(
        select(User).where(User.workspace_id == workspace_id).order_by(User.created_at.desc())
    )
    return list(result.scalars().all())

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(RoleEnforcer(UserRole.ADMIN)),
        Depends(AuditLogHook("user_created", "users").log)
    ]
)
async def invite_user(
    payload: UserCreate,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Invites and creates a new user inside the current workspace (RBAC: Admin+)."""
    workspace_id = claims["workspace_id"]
    
    # Check duplicate email
    email_check = await db.execute(select(User).where(User.email == payload.email))
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
        
    hashed = hash_password(payload.password)
    new_user = User(
        workspace_id=workspace_id,
        email=payload.email,
        name=payload.name,
        role=payload.role,
        password_hash=hashed,
        avatar_url=payload.avatar_url
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    dependencies=[
        Depends(RoleEnforcer(UserRole.OWNER)),
        Depends(AuditLogHook("user_role_updated", "users").log)
    ]
)
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Updates roles and permissions of team members (RBAC: Owner only)."""
    workspace_id = claims["workspace_id"]
    
    result = await db.execute(
        select(User).where(and_(User.id == user_id, User.workspace_id == workspace_id))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in workspace"
        )
        
    if user.id == claims["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forbidden: Cannot elevate/downgrade your own role"
        )
        
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user
