from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any
import uuid

class RemediationActionResponse(BaseModel):
    id: uuid.UUID
    incident_id: uuid.UUID
    workspace_id: uuid.UUID
    runbook_id: uuid.UUID | None = None
    action_type: str
    action_params: dict
    approval_required: bool
    approved_by: uuid.UUID | None = None
    approved_at: datetime | None = None
    status: str
    result_log: str | None = None
    executed_at: datetime | None = None
    duration_seconds: float | None = None

    class Config:
        from_attributes = True

class IncidentBase(BaseModel):
    title: str
    severity: str
    status: str
    anomaly_score: float
    anomaly_type: str | None = None
    metric_snapshot: dict
    llm_explanation: str | None = None
    root_cause_tags: List[str]

class IncidentStatusUpdate(BaseModel):
    status: str

class IncidentSuppressRequest(BaseModel):
    reason: str

class IncidentResponse(IncidentBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    host_id: uuid.UUID
    detected_at: datetime
    resolved_at: datetime | None = None
    ttd_seconds: float | None = None
    ttr_seconds: float | None = None

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    remediation_actions: List[RemediationActionResponse] = []
