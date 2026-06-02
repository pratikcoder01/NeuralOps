import json
import logging
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError
from src.config import settings

logger = logging.getLogger(__name__)

class AsyncKafkaProducerManager:
    """
    Production async Kafka producer manager wrapper.
    Ensures safe initialization, message serialization, and failure recovery.
    """
    def __init__(self):
        self.producer: AIOKafkaProducer = None
        self.is_connected = False

    async def start(self):
        """Initializes and starts the aiokafka connection pool."""
        logger.info("Initializing async aiokafka producer...")
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                request_timeout_ms=3000,
                max_block_ms=3000
            )
            await self.producer.start()
            self.is_connected = True
            logger.info("aiokafka producer started successfully and connected.")
        except Exception as e:
            self.is_connected = False
            logger.warning(
                f"aiokafka producer failed to connect on startup (running in OFFLINE BYPASS mode): {e}"
            )

    async def stop(self):
        """Stops the aiokafka connection pool."""
        if self.producer and self.is_connected:
            logger.info("Stopping aiokafka producer...")
            await self.producer.stop()
            self.is_connected = False
            self.producer = None
            logger.info("aiokafka producer stopped.")

    async def send_event(self, topic: str, key: str, value: dict) -> bool:
        """
        Asynchronously sends a JSON event to a Kafka topic.
        Bypasses gracefully if the broker is offline to maintain API availability.
        """
        if not self.is_connected or self.producer is None:
            logger.warning(f"Kafka offline. Event bypassed topic '{topic}': {value}")
            return False

        try:
            # Send using async producer futures
            encoded_key = key.encode('utf-8') if key else None
            await self.producer.send_and_wait(
                topic=topic,
                key=encoded_key,
                value=value
            )
            return True
        except KafkaError as ke:
            logger.error(f"Failed to publish event to topic '{topic}' due to KafkaError: {ke}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error publishing event to topic '{topic}': {e}")
            return False

kafka_producer = AsyncKafkaProducerManager()
