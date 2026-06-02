import os
import logging
import time
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from celery_worker import celery_app, execute_remediation_runbook
from celery.result import AsyncResult

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("remediation-service")

app = FastAPI(
    title="NeuralOps Remediation Service",
    description="Automated and manual remediation playbook executor",
    version="1.0.0"
)

class TriggerPayload(BaseModel):
    action: str = Field(..., example="scale_out_deployment")
    target: str = Field(..., example="k8s-pod-deployment-01")
    payload: Dict[str, Any] = Field(default_factory=dict)

# In-memory mock task store for offline fallback execution
mock_task_store = {}

@app.get("/health")
def health():
    # Verify Redis connectivity
    redis_ok = False
    try:
        import redis
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), socket_timeout=2)
        r.ping()
        redis_ok = True
    except Exception:
        pass

    return {
        "status": "healthy" if redis_ok else "degraded",
        "celery_broker": "connected" if redis_ok else "disconnected",
        "timestamp": time.time()
    }

def run_remediation_offline_bg(task_id: str, action: str, target: str, payload: dict):
    # Simulate execution in background if Celery broker is offline
    mock_task_store[task_id] = {"status": "PENDING", "result": None}
    time.sleep(2)
    try:
        # Run synchronously as a thread fallback
        res = execute_remediation_runbook(action, target, payload)
        mock_task_store[task_id] = {"status": "SUCCESS", "result": res}
    except Exception as e:
        mock_task_store[task_id] = {"status": "FAILURE", "result": str(e)}

@app.post("/remediate")
def trigger_remediation(payload: TriggerPayload, background_tasks: BackgroundTasks):
    logger.info(f"Received remediation trigger instruction: {payload.action}")
    
    # Try sending to Celery cluster
    try:
        task = execute_remediation_runbook.delay(
            payload.action,
            payload.target,
            payload.payload
        )
        logger.info(f"Remediation task delegated to Celery broker with task ID: {task.id}")
        return {
            "status": "triggered",
            "task_id": task.id,
            "engine": "celery"
        }
    except Exception as e:
        logger.warning(f"Celery broker is unavailable ({e}). Falling back to local thread execution...")
        # Offline simulation execution
        fallback_task_id = f"fallback-{int(time.time())}"
        background_tasks.add_task(
            run_remediation_offline_bg,
            fallback_task_id,
            payload.action,
            payload.target,
            payload.payload
        )
        return {
            "status": "triggered",
            "task_id": fallback_task_id,
            "engine": "local_thread_fallback"
        }

@app.get("/remediate/status/{task_id}")
def check_remediation_status(task_id: str):
    # 1. Check offline fallback task store first
    if task_id.startswith("fallback-"):
        if task_id in mock_task_store:
            return mock_task_store[task_id]
        return {"status": "NOT_FOUND", "result": None}

    # 2. Check actual Celery task status
    try:
        result = AsyncResult(task_id, app=celery_app)
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None
        }
    except Exception as e:
        logger.error(f"Error querying Celery worker task: {e}")
        raise HTTPException(status_code=500, detail="Failed to reach execution status backend")
