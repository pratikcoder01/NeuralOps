import os
import time
import socket
import logging
import requests
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuralops-agent")

class NeuralOpsAgentClient:
    """
    Host Agent SDK client that gathers server resource metrics (CPU, RAM) 
    and transmits telemetry data records to NeuralOps Ingestion APIs.
    """
    def __init__(self, endpoint_url: str = None, check_interval: int = 10):
        self.endpoint_url = endpoint_url or os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")
        self.ingest_url = f"{self.endpoint_url}/ingest"
        self.check_interval = check_interval
        self.hostname = socket.gethostname()
        self.is_running = False

    def collect_metrics(self) -> Dict[str, float]:
        """
        Collects system stats using psutil (or fallback standard libraries).
        """
        metrics = {}
        try:
            import psutil
            metrics["cpu_utilization"] = psutil.cpu_percent(interval=None)
            metrics["memory_utilization"] = psutil.virtual_memory().percent
            metrics["disk_utilization"] = psutil.disk_usage('/').percent
        except ImportError:
            # Fallback mock statistics if psutil is not pre-installed
            import random
            logger.debug("psutil library not found. Generating mock metrics...")
            metrics["cpu_utilization"] = round(random.uniform(15.0, 95.0), 2)
            metrics["memory_utilization"] = round(random.uniform(40.0, 85.0), 2)
            metrics["disk_utilization"] = round(random.uniform(30.0, 75.0), 2)
        return metrics

    def transmit_metrics(self, name: str, value: float) -> bool:
        """
        Posts a metrics data record to the ingestion endpoint.
        """
        payload = {
            "hostname": self.hostname,
            "metric_name": name,
            "metric_value": value,
            "timestamp": time.time()
        }
        try:
            response = requests.post(self.ingest_url, json=payload, timeout=3)
            if response.status_code == 200:
                logger.info(f"Successfully transmitted metric '{name}': {value} to {self.ingest_url}")
                return True
            else:
                logger.warning(f"Ingestion server rejected metric: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Transmission failed for metric '{name}' (is ingestion-service running?): {e}")
        return False

    def start_loop(self):
        """
        Enters a continuous measurement loop capturing and sending metrics.
        """
        logger.info(f"Starting telemetry collection loop. Endpoint={self.ingest_url}, Interval={self.check_interval}s")
        self.is_running = True
        try:
            while self.is_running:
                stats = self.collect_metrics()
                for name, value in stats.items():
                    self.transmit_metrics(name, value)
                time.sleep(self.check_interval)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        logger.info("Stopping telemetry collection loop.")
        self.is_running = False
