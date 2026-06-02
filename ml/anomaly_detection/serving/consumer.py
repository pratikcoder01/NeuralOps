import os
import sys
import json
import logging
import asyncio
import uuid
import time
from datetime import datetime, timezone
import httpx
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-inference-consumer")

# Configurations
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
INFERENCE_API_URL = os.getenv("INFERENCE_API_URL", "http://localhost:8080/predict")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# In-memory sliding window buffer per host_id
host_buffers = {}

def translate_metric_payload(payload: dict) -> dict:
    """
    Translates raw metric payload from either the rich nested psutil schema
    or a flattened dictionary into the exact structure required by FeatureEngineer.
    """
    metrics = payload.get("metrics", {})
    
    # 1. If it's a list (rich agent SDK format), extract the latest or convert
    if isinstance(metrics, list):
        if len(metrics) > 0:
            metrics = metrics[-1]  # Grab the latest snapshot in the batch
        else:
            metrics = {}

    # Check if the metrics dict is nested (rich agent SDK structure)
    if "cpu" in metrics and isinstance(metrics["cpu"], dict):
        # Already in nested agent format
        cpu_cores = metrics.get("cpu", {}).get("cores", [0.0])
        mem_used = metrics.get("memory", {}).get("used", 0)
        mem_total = metrics.get("memory", {}).get("total", 1)
        
        io_read = metrics.get("disk", {}).get("read_bytes_delta", 0)
        io_write = metrics.get("disk", {}).get("write_bytes_delta", 0)
        
        net_recv = metrics.get("network", {}).get("bytes_recv_delta", 0)
        net_sent = metrics.get("network", {}).get("bytes_sent_delta", 0)
        
        load_1m = metrics.get("load_average", {}).get("1m", 0.0)
        load_5m = metrics.get("load_average", {}).get("5m", 0.0)
        
        proc_count = metrics.get("processes", {}).get("count", 1)
    else:
        # Flattened format (e.g. synthetic data or simple seed metrics)
        cpu_val = metrics.get("cpu_utilization", metrics.get("cpu", 0.0))
        mem_val = metrics.get("memory_utilization", metrics.get("memory", 0.0))
        disk_val = metrics.get("disk_utilization", metrics.get("disk", 0.0))
        net_val = metrics.get("network_utilization", 0.0)
        
        cpu_cores = [cpu_val]
        mem_total = 100
        mem_used = int(mem_val)
        
        io_read = int(disk_val * 1000)
        io_write = 0
        
        net_recv = int(net_val * 1000)
        net_sent = 0
        
        load_1m = cpu_val / 100.0
        load_5m = cpu_val / 100.0
        
        proc_count = 50

    return {
        "cpu": {"cores": cpu_cores},
        "memory": {"used": mem_used, "total": mem_total},
        "disk": {"io_read": io_read, "io_write": io_write},
        "network": {"bytes_recv": net_recv, "bytes_sent": net_sent, "drops": 0},
        "load_avg": {"1m": load_1m, "5m": load_5m},
        "process_count": proc_count,
        "http_latency_p99": metrics.get("http_latency_p99", 0.0),
        "tcp_retransmit_rate": metrics.get("tcp_retransmit_rate", 0.0)
    }

class MLInferenceConsumer:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.producer: AIOKafkaProducer = None
        self._running = False
        self.redis_client = None

    async def start(self):
        self._running = True
        
        # Connect to Redis for alerting deduplication
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
            logger.info("Connected to Redis successfully for ML alerting locks.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Running without deduplication filters.")

        # Connection retry loop for Kafka
        bootstrap_servers = KAFKA_BOOTSTRAP_SERVERS.split(",")
        while self._running:
            try:
                self.consumer = AIOKafkaConsumer(
                    "raw.metrics",
                    bootstrap_servers=bootstrap_servers,
                    group_id="ml-inference-engine-group",
                    value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                    auto_offset_reset="latest"
                )
                await self.consumer.start()
                
                self.producer = AIOKafkaProducer(
                    bootstrap_servers=bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8')
                )
                await self.producer.start()
                
                logger.info("ML Inference Kafka consumer and producer started successfully.")
                break
            except Exception as e:
                logger.warning(f"Kafka connection failed, retrying in 5 seconds: {e}")
                await asyncio.sleep(5)

        asyncio.create_task(self.consume_loop())

    async def stop(self):
        self._running = False
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        logger.info("ML Inference Kafka background workers stopped.")

    async def consume_loop(self):
        async with httpx.AsyncClient(timeout=15.0) as client:
            while self._running:
                try:
                    async for msg in self.consumer:
                        if not self._running:
                            break
                        
                        payload = msg.value
                        host_id = payload.get("host_id")
                        workspace_id = payload.get("workspace_id")
                        
                        if not host_id or not workspace_id:
                            continue
                        
                        # 1. Translate payload to FeatureEngineer structure
                        snap = translate_metric_payload(payload)
                        
                        # 2. Append to host sliding window buffer
                        if host_id not in host_buffers:
                            host_buffers[host_id] = []
                        
                        host_buffers[host_id].append(snap)
                        
                        # Keep window size capped at 60 points
                        if len(host_buffers[host_id]) > 60:
                            host_buffers[host_id].pop(0)
                        
                        # 3. Handle sliding window: predict only when buffer has full 60 points
                        if len(host_buffers[host_id]) < 60:
                            logger.info(f"Host '{host_id}' buffer accumulating: {len(host_buffers[host_id])}/60 points.")
                            continue
                        
                        # 4. Trigger HTTP prediction call to local serving port 8080
                        await self.evaluate_window(client, host_id, workspace_id, host_buffers[host_id])
                except Exception as e:
                    logger.error(f"Error in ML consume loop iteration: {e}")
                    await asyncio.sleep(2)

    async def evaluate_window(self, client: httpx.AsyncClient, host_id: str, workspace_id: str, window: list):
        try:
            req_body = {
                "host_id": host_id,
                "workspace_id": workspace_id,
                "metrics_window": window
            }
            
            # Request local scoring
            resp = await client.post(INFERENCE_API_URL, json=req_body)
            if resp.status_code != 200:
                logger.error(f"Inference server scoring rejected request: {resp.status_code} - {resp.text}")
                return
            
            result = resp.json()
            anomaly_score = result.get("anomaly_score", 0.0)
            is_anomaly = result.get("is_anomaly", False)
            feature_scores = result.get("feature_scores", {})
            
            logger.info(f"Host '{host_id}' scored: anomaly_score={anomaly_score:.3f}, is_anomaly={is_anomaly}")
            
            # Alert threshold check
            if anomaly_score > 0.7:
                # 5. Redis Alert Deduplication (10-minute lock)
                if self.redis_client:
                    lock_key = f"alert_lock:{host_id}"
                    locked = await self.redis_client.set(lock_key, "1", ex=600, nx=True)
                    if not locked:
                        logger.info(f"Alert lock active for host '{host_id}'. Suppressed alert.")
                        return

                # Derive severity
                if anomaly_score > 0.95:
                    severity = "critical"
                elif anomaly_score > 0.8:
                    severity = "high"
                else:
                    severity = "medium"
                
                # Derive anomaly type (highest contributing feature score)
                anomaly_type = "unknown"
                if feature_scores:
                    anomaly_type = max(feature_scores, key=feature_scores.get)
                
                # Assemble alert payload
                event_payload = {
                    "incident_id": str(uuid.uuid4()),
                    "workspace_id": workspace_id,
                    "host_id": host_id,
                    "severity": severity,
                    "anomaly_score": anomaly_score,
                    "anomaly_type": anomaly_type,
                    "metric_snapshot": window[-1],  # Latest state snapshot
                    "detected_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Publish to Kafka anomaly.events
                logger.info(f"PUBLISHING ANOMALY EVENT: host={host_id}, score={anomaly_score:.3f}, type={anomaly_type}")
                await self.producer.send_and_wait(
                    topic="anomaly.events",
                    key=host_id.encode('utf-8'),
                    value=event_payload
                )
        except Exception as e:
            logger.error(f"Failed to evaluate metrics window for host '{host_id}': {e}")

if __name__ == "__main__":
    # Allow running consumer as standalone executable script
    consumer = MLInferenceConsumer()
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    logger.info("Starting ML Inference consumer service standalone...")
    try:
        loop.run_until_complete(consumer.start())
        # Keep loop running infinitely
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Stopping consumer loops...")
        loop.run_until_complete(consumer.stop())
    finally:
        loop.close()
