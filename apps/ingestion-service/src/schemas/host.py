from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class HostBase(BaseModel):
    hostname: str = Field(..., min_length=2, max_length=255)
    ip_address: str = Field(..., min_length=7, max_length=50)
    cloud_provider: str = "on-premise"
    region: str | None = None
    tags: dict = Field(default_factory=dict)
    agent_version: str = "1.0.0"

class HostRegister(HostBase):
    pass

class HostRegisterResponse(BaseModel):
    host_id: uuid.UUID
    api_key: str

class HostResponse(HostBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    last_heartbeat: datetime
    status: str

    class Config:
        from_attributes = True
