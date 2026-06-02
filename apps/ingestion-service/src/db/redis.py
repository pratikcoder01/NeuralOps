import logging
import redis.asyncio as aioredis
from src.config import settings

logger = logging.getLogger(__name__)

class RedisClientManager:
    """Async Redis connection pool manager wrapper."""
    def __init__(self):
        self.pool: aioredis.ConnectionPool = None
        self.client: aioredis.Redis = None

    def connect(self):
        logger.info("Initializing async Redis connection pool...")
        self.pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=50
        )
        self.client = aioredis.Redis(connection_pool=self.pool)
        logger.info("Redis connection pool active.")

    async def close(self):
        if self.client:
            logger.info("Closing Redis connection pool...")
            await self.client.close()
            await self.pool.disconnect()
            self.client = None
            self.pool = None

redis_manager = RedisClientManager()

def get_redis_client() -> aioredis.Redis:
    """Returns async Redis client."""
    if redis_manager.client is None:
        redis_manager.connect()
    return redis_manager.client
