import logging
import uuid
import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.host import Host
from src.schemas.metrics import MetricsBatch
from src.db.mongo import get_mongo_db
from src.db.redis import get_redis_client
from src.kafka.producer import kafka_producer
from src.core.exceptions import HostDeactivated

logger = logging.getLogger(__name__)

class MetricsService:
    @staticmethod
    async def ingest_metrics_batch(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        batch: MetricsBatch
    ) -> bool:
        """
        Ingests a batch of metrics from a host:
        1. Validates host exists and belongs to the workspace context.
        2. Performs deduplication check via Redis (host_id:timestamp).
        3. Saves to MongoDB raw metrics database collection.
        4. Publishes to Kafka stream broker.
        5. Updates host status and heartbeat in PostgreSQL.
        """
        logger.info(f"Ingesting metric batch for host: {batch.host_id} under workspace: {workspace_id}")
        
        # 1. Validate Host
        result = await db.execute(
            select(Host).where(Host.id == batch.host_id, Host.workspace_id == workspace_id)
        )
        host = result.scalar_one_or_none()
        if not host:
            raise HostDeactivated(f"Host with ID '{batch.host_id}' not found in this workspace context.")
            
        if host.status == "offline":
            # Reactive trigger to revive host on heartbeat ingestion
            host.status = "healthy"

        # 2. Redis Deduplication
        redis_client = get_redis_client()
        if redis_client:
            dedup_key = f"dedup:{batch.host_id}:{batch.timestamp}"
            # Attempt to set unique key with 60 seconds TTL (since batches are sent every 30s)
            is_new = await redis_client.set(dedup_key, "1", ex=60, nx=True)
            if not is_new:
                logger.warning(f"Telemetry deduplication triggered. Skipped batch: {batch.host_id} at {batch.timestamp}")
                return False

        # 3. Store in MongoDB
        mongo_db = get_mongo_db()
        raw_doc = {
            "workspace_id": str(workspace_id),
            "host_id": str(batch.host_id),
            "timestamp": batch.timestamp,
            "metrics": batch.metrics,
            "ingested_at": time.time()
        }
        try:
            await mongo_db["metrics_raw"].insert_one(raw_doc)
            logger.debug(f"Metrics stored in MongoDB metrics_raw collection for {batch.host_id}")
        except Exception as e:
            logger.error(f"Failed to write telemetry data to MongoDB: {e}")
            # Keep moving to ensure stream pipeline availability

        # 4. Stream to Kafka
        kafka_payload = {
            "workspace_id": str(workspace_id),
            "host_id": str(batch.host_id),
            "hostname": host.hostname,
            "timestamp": batch.timestamp,
            "metrics": batch.metrics
        }
        # Publish event asynchronously
        await kafka_producer.send_event(
            topic="raw.metrics",
            key=str(batch.host_id),
            value=kafka_payload
        )

        # 5. Update Postgres Heartbeat
        from datetime import datetime, timezone
        host.last_heartbeat = datetime.now(timezone.utc)
        await db.commit()
        
        return True
