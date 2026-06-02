import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.models.incident import Incident
from src.core.exceptions import NeuralOpsException

logger = logging.getLogger(__name__)

class IncidentService:
    @staticmethod
    async def list_incidents(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        severity: Optional[str] = None,
        status_filter: Optional[str] = None,
        host_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Incident]:
        """Queries database for paginated list of workspace incidents."""
        logger.info(f"Listing incidents for workspace {workspace_id}")
        
        conditions = [Incident.workspace_id == workspace_id]
        if severity:
            conditions.append(Incident.severity == severity)
        if status_filter:
            conditions.append(Incident.status == status_filter)
        if host_id:
            conditions.append(Incident.host_id == host_id)

        query = (
            select(Incident)
            .where(and_(*conditions))
            .order_by(Incident.detected_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_incident_detail(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        incident_id: uuid.UUID
    ) -> Incident:
        """Retrieves single incident details with eager loaded remediation actions."""
        logger.info(f"Getting incident details: {incident_id}")
        
        query = (
            select(Incident)
            .where(Incident.id == incident_id, Incident.workspace_id == workspace_id)
            .options(selectinload(Incident.remediation_actions))
        )
        
        result = await db.execute(query)
        incident = result.scalar_one_or_none()
        if not incident:
            raise NeuralOpsException(
                status_code=404,
                detail=f"Incident with ID '{incident_id}' not found."
            )
        return incident

    @staticmethod
    async def update_incident_status(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        incident_id: uuid.UUID,
        new_status: str
    ) -> Incident:
        """Updates status of active incidents (resolves, investigates, etc)."""
        logger.info(f"Updating incident {incident_id} status to {new_status}")
        
        incident = await IncidentService.get_incident_detail(db, workspace_id, incident_id)
        incident.status = new_status
        
        if new_status == "RESOLVED":
            incident.resolved_at = datetime.now(timezone.utc)
            if incident.detected_at:
                delta = incident.resolved_at - incident.detected_at
                incident.ttr_seconds = delta.total_seconds()

        await db.commit()
        await db.refresh(incident)
        return incident
