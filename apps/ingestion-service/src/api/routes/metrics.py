import logging
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.postgres import get_async_db
from src.schemas.metrics import MetricsBatch
from src.services.metrics_service import MetricsService
from src.dependencies import get_current_user_claims

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_host_metrics(
    payload: MetricsBatch,
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Core high-velocity telemetry ingestion route.
    Validates host workspace associations, filters duplicates, stores NoSQL history,
    and publishes metrics to Kafka brokers in background pipelines.
    """
    workspace_id = claims["workspace_id"]
    
    # Delegate to metrics service layer
    ingested = await MetricsService.ingest_metrics_batch(
        db=db,
        workspace_id=workspace_id,
        batch=payload
    )
    
    if not ingested:
        # 202 Accepted is returned, but with a warning indicating deduplication skipped processing
        return Response(
            content='{"status": "deduplicated", "message": "Metrics batch skipped due to deduplication filters."}',
            media_type="application/json",
            status_code=status.HTTP_202_ACCEPTED
        )
        
    return Response(
        content='{"status": "accepted", "message": "Telemetry metrics payload queued successfully."}',
        media_type="application/json",
        status_code=status.HTTP_202_ACCEPTED
    )
