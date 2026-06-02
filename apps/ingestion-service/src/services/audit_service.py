import logging
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        action: str,
        resource: str,
        resource_id: Optional[str] = None,
        payload: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Asynchronously writes an audit record to the database audit_log table.
        Processes logs inside separate transactions if required, ensuring security.
        """
        logger.info(f"Writing audit trail. Action: {action}, Resource: {resource}")
        
        audit_entry = AuditLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            payload=payload or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_entry)
        await db.commit()
        return audit_entry
