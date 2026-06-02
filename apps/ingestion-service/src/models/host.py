import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base

class Host(Base):
    """
    Host servers or containers running the telemetry monitoring agents.
    """
    __tablename__ = "hosts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    cloud_provider: Mapped[str] = mapped_column(String(50), default="on-premise") # aws, gcp, azure, on-premise
    region: Mapped[str] = mapped_column(String(50), nullable=True)
    tags: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    agent_version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    
    last_heartbeat: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[str] = mapped_column(String(50), default="healthy") # healthy, warning, critical, offline

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="hosts")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="host", cascade="all, delete-orphan")
