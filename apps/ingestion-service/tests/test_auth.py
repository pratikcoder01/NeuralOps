import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_workspace_success(client: AsyncClient):
    """Verifies that registration completely generates tenant workspaces and JWT credentials."""
    payload = {
        "workspace_name": "Test Ingestion Startup",
        "email": "lead@ingestion.com",
        "name": "Jordan Bell",
        "password": "verySecurePassword123"
    }
    
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "owner"
    assert "workspace_id" in data
    
    # Confirm secure cookies set
    assert "refresh_token" in response.cookies

@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, seed_data):
    """Asserts registration fails when using already registered email addresses."""
    payload = {
        "workspace_name": "Another Workspace",
        "email": seed_data["email"], # Duplicate
        "name": "Jordan Bell",
        "password": "verySecurePassword123"
    }
    
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_data):
    """Verifies user login with bcrypt credentials returns access tokens."""
    payload = {
        "email": seed_data["email"],
        "password": seed_data["password"]
    }
    
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "owner"
    
    assert "refresh_token" in response.cookies

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, seed_data):
    """Asserts login fails with incorrect password inputs."""
    payload = {
        "email": seed_data["email"],
        "password": "wrongpassword"
    }
    
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
