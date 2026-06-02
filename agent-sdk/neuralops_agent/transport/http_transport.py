import json
import gzip
import httpx
import logging
import asyncio
from typing import List, Dict, Any
from neuralops_agent import __version__
from neuralops_agent.config import AgentConfig

logger = logging.getLogger("neuralops-agent")

class HttpTransport:
    def __init__(self, config: AgentConfig, host_id: str):
        self.config = config
        self.host_id = host_id
        self.ingest_url = f"{self.config.endpoint}/api/v1/metrics/ingest"

    async def send(self, batch: List[Dict[str, Any]]) -> bool:
        """
        Sends buffered telemetry batch to NeuralOps Ingestion API, handles retries, 401, 429 and Gzip.
        """
        if not batch:
            return True

        # Construct payload batch
        payload = {
            "host_id": self.host_id,
            "timestamp": batch[-1].get("timestamp"),
            "metrics": batch
        }

        serialized = json.dumps(payload)
        compressed = False
        body_bytes = serialized.encode("utf-8")

        # Gzip compression if > 10KB
        if len(body_bytes) > 10240:
            body_bytes = gzip.compress(body_bytes)
            compressed = True

        headers = {
            "Content-Type": "application/json",
            "X-NeuralOps-Agent-Version": __version__,
            "X-NeuralOps-Host-ID": self.host_id,
            "Authorization": f"Bearer {self.config.api_key}"
        }

        if compressed:
            headers["Content-Encoding"] = "gzip"

        retries = 3
        backoffs = [1.0, 2.0, 4.0]

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.post(self.ingest_url, content=body_bytes, headers=headers)
                    
                    if resp.status_code in (200, 201, 202):
                        logger.info(f"Successfully transmitted metric batch of size {len(batch)} to Ingestion API.")
                        return True
                    
                    if resp.status_code == 401:
                        logger.error("Invalid API key. Halting subsequent metric transmission retries.")
                        return False

                    if resp.status_code == 429:
                        retry_after = resp.headers.get("Retry-After")
                        delay = float(retry_after) if retry_after and retry_after.isdigit() else backoffs[attempt]
                        logger.warning(f"Rate limited (429). Delaying metrics retry by {delay}s...")
                        await asyncio.sleep(delay)
                        continue

                    logger.warning(f"Ingest API rejected payload: {resp.status_code} - {resp.text}")

            except Exception as e:
                logger.warning(f"Ingest API post failed on attempt {attempt + 1}: {e}")

            if attempt < retries - 1:
                await asyncio.sleep(backoffs[attempt])

        logger.error(f"Failed to transmit metric batch to Ingestion API after {retries} attempts.")
        return False
