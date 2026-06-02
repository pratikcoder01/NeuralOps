from pydantic import BaseModel
from typing import Dict, List

class SeverityMetrics(BaseModel):
    INFO: int = 0
    WARNING: int = 0
    CRITICAL: int = 0

class DailyIncidentCount(BaseModel):
    day: str
    count: int

class HostIncidentCount(BaseModel):
    hostname: str
    count: int

class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int
    avg_mttd_seconds: float
    avg_mttr_seconds: float
    incidents_by_severity: Dict[str, int]
    incidents_by_day: List[DailyIncidentCount]
    top_hosts_by_incidents: List[HostIncidentCount]
