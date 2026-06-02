import json
import logging
from typing import List, Dict, Any
from neuralops_agent.config import AgentConfig

logger = logging.getLogger("neuralops-agent")

class KafkaTransport:
    def __init__(self, config: AgentConfig, host_id: str):
        self.config = config
        self.host_id = host_id
        self.producer = None
        self._initialized = False

    async def initialize(self) -> bool:
        """
        Loads aiokafka and establishes connection with target broker cluster
        """
        if self._initialized:
            return True
        try:
            from aiokafka import AIOKafkaProducer
            self.producer = AIOKafkaProducer(bootstrap_servers=self.config.kafka_brokers)
            await self.producer.start()
            self._initialized = True
            logger.info(f"Direct Kafka transport connected successfully to brokers: {self.config.kafka_brokers}")
            return True
        except ImportError:
            logger.error("Direct Kafka transport requires 'aiokafka' package. Please install it first.")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka brokers ({self.config.kafka_brokers}): {e}")
        return False

    async def send(self, batch: List[Dict[str, Any]]) -> bool:
        """
        Pushes metric batch directly onto the raw.metrics stream topic
        """
        if not batch:
            return True

        if not self._initialized:
            success = await self.initialize()
            if not success:
                return False

        payload = {
            "host_id": self.host_id,
            "timestamp": batch[-1].get("timestamp"),
            "metrics": batch
        }

        try:
            serialized = json.dumps(payload).encode("utf-8")
            # Publish to topic raw.metrics
            await self.producer.send_and_wait("raw.metrics", key=self.host_id.encode("utf-8"), value=serialized)
            logger.info(f"Successfully streamed metric batch of size {len(batch)} directly to Kafka topic 'raw.metrics'.")
            return True
        except Exception as e:
            logger.error(f"Failed to stream metrics to Kafka: {e}")
            return False

    async def close(self):
        """
        Gracefully disconnects from broker cluster
        """
        if self.producer and self._initialized:
            try:
                await self.producer.stop()
            except Exception:
                pass
            self._initialized = False
