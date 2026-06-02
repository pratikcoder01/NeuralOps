import pytest
from unittest.mock import MagicMock, patch
from neuralops_agent import agent, MetricPlugin
from neuralops_agent.collector import MetricsCollector

def test_metrics_collector_structure():
    collector = MetricsCollector()
    metrics = collector.collect()
    
    # Assert main structural keys exist
    assert "timestamp" in metrics
    assert "cpu" in metrics
    assert "memory" in metrics
    assert "swap" in metrics
    assert "disk" in metrics
    assert "network" in metrics
    assert "processes" in metrics
    assert "load_average" in metrics
    assert "custom" in metrics

    # Assert CPU parameters
    assert "cores" in metrics["cpu"]
    assert "frequency_mhz" in metrics["cpu"]
    
    # Assert Memory parameters
    assert "total" in metrics["memory"]
    assert "percent" in metrics["memory"]

    # Assert Load average
    assert "1m" in metrics["load_average"]

def test_metrics_collector_deltas():
    collector = MetricsCollector()
    
    # Mock psutil IO calls
    mock_disk_1 = MagicMock(read_bytes=1000, write_bytes=500)
    mock_disk_2 = MagicMock(read_bytes=1500, write_bytes=700)
    
    mock_net_1 = MagicMock(bytes_recv=2000, bytes_sent=1000)
    mock_net_2 = MagicMock(bytes_recv=2200, bytes_sent=1100)

    with patch("psutil.disk_io_counters", side_effect=[mock_disk_1, mock_disk_2]), \
         patch("psutil.net_io_counters", side_effect=[mock_net_1, mock_net_2]):
        
        # First collect: deltas are 0
        first = collector.collect()
        assert first["disk"]["read_bytes_delta"] == 0
        assert first["network"]["bytes_recv_delta"] == 0
        
        # Second collect: deltas computed correctly
        second = collector.collect()
        assert second["disk"]["read_bytes_delta"] == 500
        assert second["disk"]["write_bytes_delta"] == 200
        assert second["network"]["bytes_recv_delta"] == 200
        assert second["network"]["bytes_sent_delta"] == 100

def test_plugin_system_registration():
    # Register mock plugin
    @agent.plugin("test_plugin")
    class TestPlugin(MetricPlugin):
        def collect(self) -> dict:
            return {"status": "ok", "value": 42}

    collector = MetricsCollector()
    metrics = collector.collect()
    
    assert "test_plugin" in metrics["custom"]
    assert metrics["custom"]["test_plugin"]["status"] == "ok"
    assert metrics["custom"]["test_plugin"]["value"] == 42
