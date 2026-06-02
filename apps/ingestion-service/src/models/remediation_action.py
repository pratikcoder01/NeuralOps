import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base

class RemediationAction(Base):
    """
    Auto-healing tasks triggered by active incidents.
    """
    __tablename__ = "remediation_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    runbook_id: Mapped[uuid.UUID] = mapped_column(nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. restart_service, prune_disk
    action_params: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, APPROVED, EXECUTING, SUCCESS, FAILED, REJECTED
    result_log: Mapped[str] = mapped_column(Text, nullable=True)
    
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)

    # Relationships
    incident: Mapped["Incident"] = relationship(back_populates="remediation_actions")
    approved_by_user: Mapped["User"] = relationship(back_populates="remediations_approved")
