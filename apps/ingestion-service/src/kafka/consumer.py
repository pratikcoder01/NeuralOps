import json
import logging
import asyncio
import os
from datetime import datetime, timezone
import uuid
from aiokafka import AIOKafkaConsumer
from src.config import settings

logger = logging.getLogger(__name__)

class AnomalyEventConsumer:
    """
    Asynchronous Kafka consumer that listens to the 'anomaly.events' topic,
    parses anomaly telemetry, and registers a PENDING RemediationAction record
    for the SRE team to review and approve.
    """
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.task: asyncio.Task = None
        self._running = False

    async def start(self):
        """Starts the background Kafka consumption loop."""
        if self._running:
            return
        
        self._running = True
        self.task = asyncio.create_task(self._consume_loop())
        logger.info("Anomaly events Kafka consumer background worker started.")

    async def stop(self):
        """Gracefully stops the consumer connection and task loop."""
        self._running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        if self.consumer:
            await self.consumer.stop()
            logger.info("Anomaly events Kafka consumer stopped.")

    async def _consume_loop(self):
        from src.db.postgres import async_session_maker
        from src.models.remediation_action import RemediationAction
        from sqlalchemy import select

        bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS.split(",")
        topic = "anomaly.events"
        
        logger.info(f"Connecting anomaly events consumer to brokers: {bootstrap_servers}...")
        
        while self._running:
            try:
                self.consumer = AIOKafkaConsumer(
                    topic,
                    bootstrap_servers=bootstrap_servers,
                    group_id="ingestion-anomaly-consumers",
                    value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                    auto_offset_reset="earliest"
                )
                await self.consumer.start()
                logger.info(f"Connected to Kafka and subscribed to topic: '{topic}'")
                break
            except Exception as e:
                logger.warning(f"Kafka consumer connection failed, retrying in 5 seconds: {e}")
                await asyncio.sleep(5)

        while self._running:
            try:
                async for msg in self.consumer:
                    if not self._running:
                        break
                    
                    event = msg.value
                    logger.info(f"Consumed anomaly event: {event.get('incident_id')} on host: {event.get('host_id')}")
                    
                    # 1. Parse Event Details
                    try:
                        incident_uuid = uuid.UUID(event.get("incident_id"))
                        workspace_uuid = uuid.UUID(event.get("workspace_id"))
                        host_uuid = uuid.UUID(event.get("host_id"))
                    except Exception as e:
                        logger.error(f"Malformed event UUID parameters: {e}")
                        continue
                        
                    anomaly_type = event.get("anomaly_type", "").lower()
                    
                    # 2. Derive Remediating Action
                    if "cpu" in anomaly_type:
                        action = "scale_out_deployment"
                    elif "disk" in anomaly_type:
                        action = "purge_docker_logs"
                    elif "mem" in anomaly_type:
                        action = "restart_systemd_service"
                    else:
                        action = "restart_systemd_service"

                    # 3. Save RemediationAction into Database in PENDING status
                    async with async_session_maker() as session:
                        # Check if action already exists for this incident
                        existing_res = await session.execute(
                            select(RemediationAction).where(RemediationAction.incident_id == incident_uuid)
                        )
                        existing_action = existing_res.scalar_one_or_none()
                        
                        if not existing_action:
                            logger.info(f"Registering PENDING remediation action '{action}' for incident '{incident_uuid}'...")
                            new_action = RemediationAction(
                                id=uuid.uuid4(),
                                incident_id=incident_uuid,
                                workspace_id=workspace_uuid,
                                action_type=action,
                                action_params={
                                    "host_id": str(host_uuid),
                                    "anomaly_score": event.get("anomaly_score"),
                                    "anomaly_type": event.get("anomaly_type"),
                                    "metric_snapshot": event.get("metric_snapshot")
                                },
                                approval_required=True,
                                status="PENDING"
                            )
                            session.add(new_action)
                            await session.commit()
                            logger.info(f"Successfully saved RemediationAction: {new_action.id}")
                        else:
                            logger.info(f"RemediationAction already exists for incident '{incident_uuid}'. Skipping creation.")
                            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in anomaly consumer loop: {e}")
                await asyncio.sleep(2)

# Global consumer instance
anomaly_consumer = AnomalyEventConsumer()
