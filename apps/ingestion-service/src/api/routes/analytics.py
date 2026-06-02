import logging
import uuid
import time
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.analytics import AnalyticsSummaryResponse, DailyIncidentCount, HostIncidentCount
from src.models.incident import Incident
from src.models.host import Host
from src.dependencies import get_current_user_claims

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Computes real-time incident aggregates:
    - MTTD (Mean Time to Detect)
    - MTTR (Mean Time to Resolve)
    - Distributions by Severity, Day and Host locations
    """
    workspace_id = claims["workspace_id"]
    logger.info(f"Computing analytics dashboard summary for workspace: {workspace_id}")
    
    # 1. Total Incidents
    total_result = await db.execute(
        select(func.count(Incident.id)).where(Incident.workspace_id == workspace_id)
    )
    total_incidents = total_result.scalar() or 0
    
    # 2. Avg MTTD & MTTR
    avg_times_result = await db.execute(
        select(
            func.avg(Incident.ttd_seconds),
            func.avg(Incident.ttr_seconds)
        ).where(Incident.workspace_id == workspace_id)
    )
    avg_times = avg_times_result.first()
    avg_mttd = float(avg_times[0]) if avg_times and avg_times[0] is not None else 0.0
    avg_mttr = float(avg_times[1]) if avg_times and avg_times[1] is not None else 0.0
    
    # 3. Incidents by Severity
    severity_result = await db.execute(
        select(Incident.severity, func.count(Incident.id))
        .where(Incident.workspace_id == workspace_id)
        .group_by(Incident.severity)
    )
    severity_map = {"INFO": 0, "WARNING": 0, "CRITICAL": 0}
    for row in severity_result.all():
        sev, count = row
        if sev in severity_map:
            severity_map[sev] = count
            
    # 4. Incidents by Day (Last 30 Days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    day_result = await db.execute(
        select(
            func.date_trunc('day', Incident.detected_at).label('day_trunc'),
            func.count(Incident.id)
        )
        .where(and_(Incident.workspace_id == workspace_id, Incident.detected_at >= thirty_days_ago))
        .group_by('day_trunc')
        .order_by('day_trunc')
    )
    incidents_by_day = []
    for row in day_result.all():
        dt, count = row
        day_str = dt.strftime("%Y-%m-%d") if dt else ""
        incidents_by_day.append(DailyIncidentCount(day=day_str, count=count))
        
    # 5. Top Hosts by Incidents
    host_result = await db.execute(
        select(Host.hostname, func.count(Incident.id))
        .join(Incident, Incident.host_id == Host.id)
        .where(Incident.workspace_id == workspace_id)
        .group_by(Host.hostname)
        .order_by(func.count(Incident.id).desc())
        .limit(5)
    )
    top_hosts = []
    for row in host_result.all():
        hostname, count = row
        top_hosts.append(HostIncidentCount(hostname=hostname, count=count))
        
    return AnalyticsSummaryResponse(
        total_incidents=total_incidents,
        avg_mttd_seconds=avg_mttd,
        avg_mttr_seconds=avg_mttr,
        incidents_by_severity=severity_map,
        incidents_by_day=incidents_by_day,
        top_hosts_by_incidents=top_hosts
    )
