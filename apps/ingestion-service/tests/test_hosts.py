import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.host import Host

@pytest.mark.asyncio
async def test_register_host_success(client: AsyncClient, seed_data):
    """Verifies that monitored host agents can successfully register via metadata tags."""
    payload = {
        "hostname": "prod-web-gateway-01",
        "ip_address": "10.0.1.200",
        "cloud_provider": "aws",
        "region": "us-east-1",
        "tags": {
            "workspace_id": str(seed_data["workspace_id"]),
            "role": "web-node"
        },
        "agent_version": "1.0.0"
    }
    
    response = await client.post("/api/v1/hosts/register", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "host_id" in data
    assert "api_key" in data

@pytest.mark.asyncio
async def test_agent_heartbeat_success(client: AsyncClient, seed_data, db_session: AsyncSession):
    """Verifies that active agents can dispatch periodic status heartbeats."""
    # 1. Pre-register a Host
    host_id = uuid.uuid4()
    h = Host(
        id=host_id,
        workspace_id=seed_data["workspace_id"],
        hostname="prod-cache-01",
        ip_address="10.0.1.80",
        status="warning"
    )
    db_session.add(h)
    await db_session.commit()
    
    # 2. Fire Heartbeat Ping
    response = await client.post(f"/api/v1/hosts/{host_id}/heartbeat")
    assert response.status_code == 204
