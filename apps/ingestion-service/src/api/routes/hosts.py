import logging
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.host import HostResponse, HostRegister, HostRegisterResponse
from src.models.host import Host
from src.models.workspace import Workspace
from src.dependencies import get_current_user_claims, RoleEnforcer, AuditLogHook
from src.core.rbac import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=HostRegisterResponse)
async def register_host(
    payload: HostRegister,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Called by host agents on bootstrap. Resolves workspace context by tags/headers 
    and issues host ID registration.
    """
    logger.info(f"Agent registering host: {payload.hostname}")
    
    # Extract workspace_id from tags (simplifying multi-tenant onboarding)
    ws_tag = payload.tags.get("workspace_id")
    if not ws_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'workspace_id' inside host metadata tags."
        )
        
    try:
        workspace_id = uuid.UUID(ws_tag)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed 'workspace_id' UUID tag."
        )
        
    # Check workspace limit
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target workspace registration token invalid."
        )
        
    hosts_count_result = await db.execute(
        select(Host).where(Host.workspace_id == workspace_id)
    )
    current_hosts = len(hosts_count_result.scalars().all())
    if current_hosts >= workspace.host_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace registration host limit reached."
        )

    # Register host
    new_host = Host(
        workspace_id=workspace_id,
        hostname=payload.hostname,
        ip_address=payload.ip_address,
        cloud_provider=payload.cloud_provider,
        region=payload.region,
        tags=payload.tags,
        agent_version=payload.agent_version,
        status="healthy"
    )
    db.add(new_host)
    await db.commit()
    await db.refresh(new_host)
    
    # Generate a mock api key
    mock_api_key = f"nop_{uuid.uuid4().hex}"
    
    return HostRegisterResponse(
        host_id=new_host.id,
        api_key=mock_api_key
    )

@router.post("/{host_id}/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def agent_heartbeat(
    host_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Triggered by host agents every 60 seconds to update status heartbeats."""
    result = await db.execute(select(Host).where(Host.id == host_id))
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Host not found."
        )
        
    host.last_heartbeat = datetime.now(timezone.utc)
    host.status = "healthy" # Revive if was offline
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/", response_model=List[HostResponse])
async def list_hosts(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Lists all telemetry monitored hosts within the workspace context (RBAC: any role)."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(
        select(Host).where(Host.workspace_id == workspace_id).order_by(Host.hostname.asc())
    )
    return list(result.scalars().all())

@router.delete(
    "/{host_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(RoleEnforcer(UserRole.ADMIN)),
        Depends(AuditLogHook("host_deregistered", "hosts").log)
    ]
)
async def deregister_host(
    host_id: uuid.UUID,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Deletes and deregisters a host from monitoring dashboard arrays (RBAC: Admin+)."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(
        select(Host).where(and_(Host.id == host_id, Host.workspace_id == workspace_id))
    )
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Host not found."
        )
        
    await db.delete(host)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
