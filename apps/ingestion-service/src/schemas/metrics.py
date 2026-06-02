from pydantic import BaseModel, Field
from typing import Dict
import uuid

class MetricsBatch(BaseModel):
    host_id: uuid.UUID = Field(..., example="4315264b-a25e-44db-b271-419b489a80e1")
    timestamp: float = Field(..., description="Unix epoch timestamp in seconds", example=1680000000.0)
    metrics: Dict[str, float] = Field(
        ...,
        example={
            "cpu_utilization": 84.2,
            "memory_utilization": 72.8,
            "disk_utilization": 45.1
        }
    )
