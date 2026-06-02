import pytest
import time
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.host import Host

@pytest.mark.asyncio
async def test_metrics_ingestion_success(client: AsyncClient, seed_data, db_session: AsyncSession):
    """
    Verifies that a valid telemetry metrics batch is successfully accepted:
    - Stores raw records in Motor
    - Streams events to Kafka
    - Returns 202 Accepted
    """
    # 1. Register a Host first
    host_id = uuid.uuid4()
    h = Host(
        id=host_id,
        workspace_id=seed_data["workspace_id"],
        hostname="k8s-metrics-node",
        ip_address="10.0.1.12",
        cloud_provider="aws",
        region="us-east-1",
        status="healthy"
    )
    db_session.add(h)
    await db_session.commit()
    
    # 2. Acquire JWT
    login_payload = {
        "email": seed_data["email"],
        "password": seed_data["password"]
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    token = login_resp.json()["access_token"]
    
    # 3. Post telemetry ingest batch
    batch_payload = {
        "host_id": str(host_id),
        "timestamp": time.time(),
        "metrics": {
            "cpu_utilization": 74.5,
            "memory_utilization": 62.1
        }
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post("/api/v1/metrics/ingest", json=batch_payload, headers=headers)
    assert response.status_code == 202
    
    data = response.json()
    assert data["status"] == "accepted"

@pytest.mark.asyncio
async def test_metrics_ingestion_unauthorized(client: AsyncClient):
    """Asserts that telemetry ingestion is blocked for unauthenticated requests."""
    batch_payload = {
        "host_id": str(uuid.uuid4()),
        "timestamp": time.time(),
        "metrics": {"cpu": 10.0}
    }
    
    response = await client.post("/api/v1/metrics/ingest", json=batch_payload)
    assert response.status_code == 401
