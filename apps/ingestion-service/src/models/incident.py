import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base

class Incident(Base):
    """
    Infrastructure anomalies detected by ML processors.
    """
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    host_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="WARNING") # INFO, WARNING, CRITICAL
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE") # ACTIVE, INVESTIGATING, RESOLVED, SUPPRESSED
    
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    anomaly_type: Mapped[str] = mapped_column(String(100), nullable=True)
    metric_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    llm_explanation: Mapped[str] = mapped_column(Text, nullable=True)
    root_cause_tags: Mapped[list[str]] = mapped_column(ARRAY(String(100)), default=list, nullable=False)
    
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    ttd_seconds: Mapped[int] = mapped_column(Float, nullable=True) # Time to detect
    ttr_seconds: Mapped[int] = mapped_column(Float, nullable=True) # Time to resolve

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="incidents")
    host: Mapped["Host"] = relationship(back_populates="incidents")
    remediation_actions: Mapped[list["RemediationAction"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
