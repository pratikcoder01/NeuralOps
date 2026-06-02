import asyncio
import httpx
import logging
from neuralops_agent import __version__
from neuralops_agent.config import AgentConfig

logger = logging.getLogger("neuralops-agent")

class HeartbeatWorker:
    def __init__(self, config: AgentConfig, host_id: str):
        self.config = config
        self.host_id = host_id
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self):
        """
        Starts the periodic heartbeat background loop
        """
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self.run())
        logger.info("Heartbeat worker started successfully.")

    async def stop(self):
        """
        Stops the periodic heartbeat background loop
        """
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Heartbeat worker stopped successfully.")

    async def run(self):
        url = f"{self.config.endpoint}/api/v1/hosts/{self.host_id}/heartbeat"
        headers = {
            "X-NeuralOps-Agent-Version": __version__,
            "X-NeuralOps-Host-ID": self.host_id,
            "Authorization": f"Bearer {self.config.api_key}"
        }

        while self._running:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.post(url, headers=headers)
                    if resp.status_code == 200:
                        logger.debug(f"Heartbeat ping acknowledged successfully by {self.config.endpoint}")
                    else:
                        logger.warning(f"Heartbeat ping rejected by server: {resp.status_code}")
            except Exception as e:
                logger.warning(f"Heartbeat network ping failed (is server online?): {e}")

            # Ping every 60 seconds
            await asyncio.sleep(60)
