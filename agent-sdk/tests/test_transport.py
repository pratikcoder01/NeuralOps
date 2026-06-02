import gzip
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from neuralops_agent.config import AgentConfig
from neuralops_agent.transport.http_transport import HttpTransport

@pytest.fixture
def agent_config():
    return AgentConfig(
        api_key="test_key",
        workspace_id="test_ws",
        endpoint="http://localhost:8000",
        interval_seconds=10
    )

@pytest.mark.asyncio
async def test_http_transport_success(agent_config):
    transport = HttpTransport(agent_config, "host-123")
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        
        success = await transport.send([{"timestamp": 123456789, "val": 42}])
        assert success
        assert mock_post.call_count == 1
        
        # Verify Headers
        _, kwargs = mock_post.call_args
        assert "X-NeuralOps-Host-ID" in kwargs["headers"]
        assert kwargs["headers"]["X-NeuralOps-Host-ID"] == "host-123"
        assert kwargs["headers"]["Authorization"] == "Bearer test_key"

@pytest.mark.asyncio
async def test_http_transport_gzip(agent_config):
    transport = HttpTransport(agent_config, "host-123")
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    
    # Large payload > 10KB to trigger Gzip compression
    large_batch = [{"timestamp": i, "data": "x" * 200} for i in range(60)]
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        
        success = await transport.send(large_batch)
        assert success
        assert mock_post.call_count == 1
        
        _, kwargs = mock_post.call_args
        # Content-Encoding header must be gzip
        assert kwargs["headers"]["Content-Encoding"] == "gzip"
        # Body must be valid gzip bytes
        content = gzip.decompress(kwargs["content"]).decode("utf-8")
        parsed = json.loads(content)
        assert parsed["host_id"] == "host-123"
        assert len(parsed["metrics"]) == 60

@pytest.mark.asyncio
async def test_http_transport_401_halt(agent_config):
    transport = HttpTransport(agent_config, "host-123")
    
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        
        success = await transport.send([{"timestamp": 123}])
        assert not success
        # Should halt immediately after first 401 (no retries)
        assert mock_post.call_count == 1
