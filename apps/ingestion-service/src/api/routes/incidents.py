import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.incident import IncidentResponse, IncidentDetailResponse, IncidentStatusUpdate, IncidentSuppressRequest
from src.services.incident_service import IncidentService
from src.dependencies import get_current_user_claims, RoleEnforcer, AuditLogHook
from src.core.rbac import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[IncidentResponse])
async def list_workspace_incidents(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    host_id: Optional[uuid.UUID] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Lists workspace alerts and infrastructure incidents (RBAC: any role)."""
    workspace_id = claims["workspace_id"]
    return await IncidentService.list_incidents(
        db=db,
        workspace_id=workspace_id,
        severity=severity,
        status_filter=status_filter,
        host_id=host_id,
        limit=limit,
        offset=offset
    )

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
async def get_incident_details(
    incident_id: uuid.UUID,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Retrieves deep inspection incident details alongside action execution lists."""
    workspace_id = claims["workspace_id"]
    return await IncidentService.get_incident_detail(
        db=db,
        workspace_id=workspace_id,
        incident_id=incident_id
    )

@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse,
    dependencies=[
        Depends(RoleEnforcer(UserRole.SRE)),
        Depends(AuditLogHook("incident_status_updated", "incidents").log)
    ]
)
async def update_incident_state(
    incident_id: uuid.UUID,
    payload: IncidentStatusUpdate,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Updates active incident tracking status (RBAC: SRE+)."""
    workspace_id = claims["workspace_id"]
    return await IncidentService.update_incident_status(
        db=db,
        workspace_id=workspace_id,
        incident_id=incident_id,
        new_status=payload.status
    )

@router.post(
    "/{incident_id}/suppress",
    response_model=IncidentResponse,
    dependencies=[
        Depends(RoleEnforcer(UserRole.ADMIN)),
        Depends(AuditLogHook("incident_suppressed", "incidents").log)
    ]
)
async def suppress_incident(
    incident_id: uuid.UUID,
    payload: IncidentSuppressRequest,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Suppresses alarms and incidents with descriptive operational reason (RBAC: Admin+)."""
    workspace_id = claims["workspace_id"]
    # Enforces suppression in service layer
    return await IncidentService.update_incident_status(
        db=db,
        workspace_id=workspace_id,
        incident_id=incident_id,
        new_status="SUPPRESSED"
    )
