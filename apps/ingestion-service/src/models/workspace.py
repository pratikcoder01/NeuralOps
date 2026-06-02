import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models.base import Base

class Workspace(Base):
    """
    Multi-tenant workspace separating host registries and team users.
    """
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), default="free") # free, pro, enterprise
    host_limit: Mapped[int] = mapped_column(Integer, default=10)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    hosts: Mapped[list["Host"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
