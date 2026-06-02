import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.workspace import WorkspaceResponse, WorkspaceCreate
from src.models.workspace import Workspace
from src.dependencies import get_current_user_claims, RoleEnforcer, AuditLogHook
from src.core.rbac import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/me", response_model=WorkspaceResponse)
async def get_current_workspace(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Retrieves active workspace profile context."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace context not found"
        )
    return workspace

@router.patch(
    "/me",
    response_model=WorkspaceResponse,
    dependencies=[
        Depends(RoleEnforcer(UserRole.ADMIN)),
        Depends(AuditLogHook("workspace_updated", "workspaces").log)
    ]
)
async def update_workspace(
    payload: WorkspaceCreate,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Updates active workspace configuration properties (RBAC: Admin+)."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace context not found"
        )
        
    # Update fields
    workspace.name = payload.name
    workspace.slug = payload.slug
    workspace.plan = payload.plan
    workspace.host_limit = payload.host_limit
    
    await db.commit()
    await db.refresh(workspace)
    return workspace
