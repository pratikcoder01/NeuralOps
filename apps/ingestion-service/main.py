import os
import time
import logging
import json
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from kafka import KafkaProducer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion-service")

# Configurations
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neuralops:neuralops@localhost:5432/neuralops")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = "raw.metrics"

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB Models
class MetricRecord(Base):
    __tablename__ = "metrics"
    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(255), index=True, nullable=False)
    metric_name = Column(String(100), index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(Float, default=time.time)

# Pydantic schemas
class MetricPayload(BaseModel):
    hostname: str = Field(..., example="k8s-node-primary-01")
    metric_name: str = Field(..., example="cpu_utilization")
    metric_value: float = Field(..., example=87.5)
    timestamp: float = Field(default_factory=time.time)

# Initialize Kafka Producer lazily/resiliently
producer = None
try:
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        request_timeout_ms=3000,
        max_block_ms=3000
    )
    logger.info("Kafka Producer initialized successfully.")
except Exception as e:
    logger.warning(f"Kafka connection failed during startup (will retry on demand): {e}")

# FastAPI app
app = FastAPI(
    title="NeuralOps Ingestion Service",
    description="Real-time infrastructure metric logs ingestion and streaming",
    version="1.0.0"
)

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    # Attempt to create tables dynamically if alembic wasn't run
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not create database tables automatically: {e}")

@app.get("/health")
def health_check():
    # Verify DB connectivity
    db_ok = False
    try:
        engine.execute("SELECT 1")
        db_ok = True
    except Exception:
        pass

    # Verify Kafka connectivity
    kafka_ok = producer is not None
    
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "kafka": "connected" if kafka_ok else "disconnected",
        "timestamp": time.time()
    }

def publish_to_kafka(payload: Dict[str, Any]):
    global producer
    if producer is None:
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                request_timeout_ms=2000,
                max_block_ms=2000
            )
        except Exception as e:
            logger.error(f"Failed to publish to Kafka (broker offline): {e}")
            return
            
    try:
        producer.send(KAFKA_TOPIC, payload)
        producer.flush()
        logger.info(f"Published metric to Kafka topic {KAFKA_TOPIC}")
    except Exception as e:
        logger.error(f"Error publishing to Kafka: {e}")

@app.post("/ingest")
def ingest_metric(payload: MetricPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Save to PostgreSQL for structured historical store
    try:
        db_record = MetricRecord(
            hostname=payload.hostname,
            metric_name=payload.metric_name,
            metric_value=payload.metric_value,
            timestamp=payload.timestamp
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
    except Exception as e:
        logger.error(f"Failed to save metric to database: {e}")
        db.rollback()
        # Do not block ingestion if database has a temporary issue
    
    # 2. Publish to Kafka topic raw.metrics in background for stream processing
    metric_dict = payload.dict()
    background_tasks.add_task(publish_to_kafka, metric_dict)

    return {
        "status": "ingested",
        "id": getattr(db_record, "id", None),
        "hostname": payload.hostname,
        "metric_name": payload.metric_name
    }

@app.get("/metrics/recent", response_model=List[Dict[str, Any]])
def get_recent_metrics(limit: int = 20, db: Session = Depends(get_db)):
    records = db.query(MetricRecord).order_by(MetricRecord.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "hostname": r.hostname,
            "metric_name": r.metric_name,
            "metric_value": r.metric_value,
            "timestamp": r.timestamp
        } for r in records
    ]
