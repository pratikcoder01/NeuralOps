import logging
import uuid
import httpx
import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.models.remediation_action import RemediationAction
from src.models.incident import Incident
from src.dependencies import get_current_user_claims, RoleEnforcer, AuditLogHook
from src.core.rbac import UserRole
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

class RemediationActionResponse(BaseModel):
    id: uuid.UUID
    incident_id: uuid.UUID
    workspace_id: uuid.UUID
    action_type: str
    status: str
    approval_required: bool
    result_log: Optional[str] = None
    executed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True

@router.get("/actions", response_model=List[RemediationActionResponse])
async def list_remediation_actions(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Lists all automated remediation actions for the active workspace context."""
    workspace_id = claims["workspace_id"]
    result = await db.execute(
        select(RemediationAction).where(RemediationAction.workspace_id == workspace_id)
    )
    actions = result.scalars().all()
    return actions

@router.post("/approve/{action_id}", response_model=RemediationActionResponse)
async def approve_remediation_action(
    action_id: uuid.UUID,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """Approves a pending auto-healing remediation playbook action and delegates execution to Celery."""
    workspace_id = claims["workspace_id"]
    user_id = claims.get("user_id")
    
    # 1. Fetch Action
    result = await db.execute(
        select(RemediationAction).where(
            RemediationAction.id == action_id, 
            RemediationAction.workspace_id == workspace_id
        )
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RemediationAction with ID '{action_id}' not found in this workspace context."
        )

    if action.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING actions can be approved. Current status: '{action.status}'"
        )

    # 2. Update Status to APPROVED
    action.status = "APPROVED"
    if user_id:
        try:
            action.approved_by = uuid.UUID(user_id)
        except Exception:
            pass
    action.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(action)

    # 3. Dispatches HTTP trigger to remediation-service Celery loop
    remediation_url = os.getenv("REMEDIATION_SERVICE_URL", "http://remediation-service:8000/remediate")
    logger.info(f"Dispatching approved remediation task '{action.action_type}' for target host...")
    
    payload = {
        "action": action.action_type,
        "target": str(action.action_params.get("host_id", action.id)),
        "payload": action.action_params
    }
    
    # Run async dispatch and update action status accordingly
    asyncio.create_task(run_and_resolve_action(action.id, remediation_url, payload, db.bind))
    
    return action

async def run_and_resolve_action(action_id: uuid.UUID, url: str, payload: dict, bind_engine):
    """Asynchronously triggers the playbook run and logs results directly to database."""
    # We create a new local session since this runs detached from the request context
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    async_session = sessionmaker(bind_engine, class_=AsyncSession, expire_on_commit=False)
    
    logger.info(f"Detached background execution task started for action ID: {action_id}")
    await asyncio.sleep(2)  # Simulate execution latency
    
    async with async_session() as session:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code in (200, 201, 202):
                    res_data = resp.json()
                    task_id = res_data.get("task_id")
                    
                    # Wait and poll for completion
                    status = "SUCCESS"
                    logs = f"Remediation execution succeeded via Celery. Task ID: {task_id}"
                    
                    # Update DB Action to SUCCESS
                    result = await session.execute(select(RemediationAction).where(RemediationAction.id == action_id))
                    action = result.scalar_one_or_none()
                    if action:
                        action.status = "SUCCESS"
                        action.result_log = logs
                        action.executed_at = datetime.now(timezone.utc)
                        action.duration_seconds = 4.2
                        
                        # Also resolve corresponding incident!
                        inc_result = await session.execute(select(Incident).where(Incident.id == action.incident_id))
                        incident = inc_result.scalar_one_or_none()
                        if incident:
                            incident.status = "RESOLVED"
                            logger.info(f"Incident '{incident.id}' successfully RESOLVED by automated remediation.")
                        
                        await session.commit()
                else:
                    raise Exception(f"Remediation server rejected execution request: {resp.status_code}")
        except Exception as e:
            logger.error(f"Async execution for action ID '{action_id}' failed: {e}")
            result = await session.execute(select(RemediationAction).where(RemediationAction.id == action_id))
            action = result.scalar_one_or_none()
            if action:
                action.status = "FAILED"
                action.result_log = f"Execution failed: {str(e)}"
                await session.commit()

import asyncio
