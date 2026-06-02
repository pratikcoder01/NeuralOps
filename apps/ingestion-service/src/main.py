import logging
from fastapi import FastAPI, Depends, status, Response
from contextlib import asynccontextmanager
from src.config import settings
from src.api.router import api_router
from src.db.postgres import engine
from src.db.mongo import mongo_manager, get_mongo_db
from src.db.redis import redis_manager, get_redis_client
from src.kafka.producer import kafka_producer
from src.middleware.logging import StructuredLoggingMiddleware
from src.middleware.rate_limit import SlidingWindowRateLimiter

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle context manager managing database connection pools on startup/shutdown."""
    logger.info("Starting up NeuralOps Ingestion Service...")
    
    # 1. Start MongoDB Client Pool
    mongo_manager.connect()
    
    # 2. Start Redis Connection Pool
    redis_manager.connect()
    
    # 3. Start aiokafka Producer Pool
    await kafka_producer.start()
    
    yield
    
    logger.info("Shutting down NeuralOps Ingestion Service connection pools...")
    # 1. Close Kafka
    await kafka_producer.stop()
    
    # 2. Close Redis
    await redis_manager.close()
    
    # 3. Close MongoDB
    mongo_manager.close()
    
    # 4. Close Postgres Engine Pool
    await engine.dispose()
    logger.info("Ingestion Service connection pools closed cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-tenant high-velocity telemetry logs ingestion and self-healing platform APIs.",
    version="1.0.0",
    lifespan=lifespan
)

# Enforce middleware sequence:
# Rate limiting evaluated first, followed by JSON structlogs
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(SlidingWindowRateLimiter)

# Mount Routes
app.include_router(api_router)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Service health state endpoint checking Postgres, Mongo, Redis, and Kafka brokers."""
    pg_ok = False
    try:
        from sqlalchemy import text
        # Perform async query verification
        from src.db.postgres import async_session_maker
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
            pg_ok = True
    except Exception:
        pass

    mongo_ok = False
    try:
        mongo_db = get_mongo_db()
        # Perform mongosh ping
        res = await mongo_db.command("ping")
        mongo_ok = res.get("ok") == 1.0
    except Exception:
        pass

    redis_ok = False
    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        redis_ok = True
    except Exception:
        pass

    kafka_ok = kafka_producer.is_connected

    status_str = "ok" if (pg_ok and mongo_ok and redis_ok and kafka_ok) else "degraded"
    
    return {
        "status": status_str,
        "postgres": pg_ok,
        "mongo": mongo_ok,
        "redis": redis_ok,
        "kafka": kafka_ok
    }
