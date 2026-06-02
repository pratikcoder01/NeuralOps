import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.host import Host
from src.models.incident import Incident

@pytest.mark.asyncio
async def test_list_incidents_success(client: AsyncClient, seed_data, db_session: AsyncSession):
    """Verifies that authenticated users can fetch paginated workspace incidents lists."""
    # 1. Register a Host and create a mock Incident
    host_id = uuid.uuid4()
    h = Host(
        id=host_id,
        workspace_id=seed_data["workspace_id"],
        hostname="db-master-host",
        ip_address="10.0.1.15",
        status="healthy"
    )
    db_session.add(h)
    await db_session.flush()

    incident_id = uuid.uuid4()
    inc = Incident(
        id=incident_id,
        workspace_id=seed_data["workspace_id"],
        host_id=host_id,
        title="OOM Killer executed",
        severity="CRITICAL",
        status="ACTIVE",
        anomaly_score=0.95
    )
    db_session.add(inc)
    await db_session.commit()
    
    # 2. Login to acquire credentials
    login_payload = {
        "email": seed_data["email"],
        "password": seed_data["password"]
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    token = login_resp.json()["access_token"]
    
    # 3. Query incidents list
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/incidents/", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "OOM Killer executed"
    assert data[0]["severity"] == "CRITICAL"

@pytest.mark.asyncio
async def test_update_incident_state_sre(client: AsyncClient, seed_data, db_session: AsyncSession):
    """Verifies SRE role (or Owner) can patch and update incident status."""
    # 1. Register Host and Incident
    host_id = uuid.uuid4()
    h = Host(
        id=host_id,
        workspace_id=seed_data["workspace_id"],
        hostname="db-master-host",
        ip_address="10.0.1.15",
        status="healthy"
    )
    db_session.add(h)
    await db_session.flush()

    incident_id = uuid.uuid4()
    inc = Incident(
        id=incident_id,
        workspace_id=seed_data["workspace_id"],
        host_id=host_id,
        title="High CPU usage",
        severity="WARNING",
        status="ACTIVE",
        anomaly_score=0.78
    )
    db_session.add(inc)
    await db_session.commit()

    # 2. Log in
    login_payload = {
        "email": seed_data["email"],
        "password": seed_data["password"]
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    token = login_resp.json()["access_token"]

    # 3. Update status to INVESTIGATING
    headers = {"Authorization": f"Bearer {token}"}
    patch_payload = {"status": "RESOLVED"}
    response = await client.patch(
        f"/api/v1/incidents/{incident_id}/status",
        json=patch_payload,
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "RESOLVED"
