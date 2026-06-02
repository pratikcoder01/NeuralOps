import asyncio
import logging
from neuralops_agent.config import AgentConfig
from neuralops_agent.collector import MetricsCollector
from neuralops_agent.buffer import MetricsBuffer
from neuralops_agent.registration import register_host
from neuralops_agent.heartbeat import HeartbeatWorker
from neuralops_agent.transport.http_transport import HttpTransport
from neuralops_agent.transport.kafka_transport import KafkaTransport

logger = logging.getLogger("neuralops-agent")

class NeuralOpsAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.collector = MetricsCollector()
        self.buffer = MetricsBuffer(max_size=1000)
        self.host_id = None
        self.transport = None
        self.heartbeat = None
        self._running = False
        self._loop_task: asyncio.Task | None = None

    async def start(self):
        """
        Idempotently registers host, binds transport/heartbeat workers, and begins metric loop.
        """
        if self._running:
            logger.warning("Agent is already running.")
            return

        # 1. Register Host (idempotent, fallback-aware)
        self.host_id = await register_host(self.config)

        # 2. Bind Transport based on config selection
        if self.config.transport_type.upper() == "KAFKA":
            self.transport = KafkaTransport(self.config, self.host_id)
            # Pre-initialize Kafka
            await self.transport.initialize()
        else:
            self.transport = HttpTransport(self.config, self.host_id)

        # 3. Bind and Start Heartbeat loop
        self.heartbeat = HeartbeatWorker(self.config, self.host_id)
        await self.heartbeat.start()

        self._running = True
        self._loop_task = asyncio.create_task(self.run_loop())
        logger.info("NeuralOps telemetry collector agent loop initialized.")

    async def stop(self):
        """
        Gracefully terminates periodic collection, heartbeat worker and flushes remaining buffer.
        """
        if not self._running:
            return
        self._running = False

        logger.info("Stopping NeuralOps telemetry collection agent...")

        # 1. Cancel collection loop task
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass

        # 2. Stop Heartbeat worker
        if self.heartbeat:
            await self.heartbeat.stop()

        # 3. Flush and send final remaining metrics
        remaining_size = await self.buffer.size()
        if remaining_size > 0 and self.transport:
            logger.info(f"Flushing final {remaining_size} metrics from buffer...")
            batch = await self.buffer.flush()
            await self.transport.send(batch)

        # 4. Close Kafka transport if applicable
        if isinstance(self.transport, KafkaTransport):
            await self.transport.close()

        logger.info("NeuralOps telemetry agent stopped successfully.")

    async def run_loop(self):
        """
        Core async collection loop running every config.interval_seconds
        """
        while self._running:
            try:
                # 1. Gather Metrics Snapshot
                metrics = self.collector.collect()
                logger.debug(f"Metrics gathered: CPU={metrics['cpu']['cores']}")

                # 2. Add to in-memory ring buffer
                await self.buffer.add(metrics)

                # 3. Check and flush if flush threshold hit (flushes immediately in dev, or batches)
                if await self.buffer.should_flush(threshold=1) and self.transport:
                    batch = await self.buffer.flush()
                    success = await self.transport.send(batch)
                    if not success:
                        # Re-add to buffer on failure so metrics are not lost
                        for item in batch:
                            await self.buffer.add(item)
            except Exception as e:
                logger.error(f"Error during metrics collection loop iteration: {e}")

            try:
                await asyncio.sleep(self.config.interval_seconds)
            except asyncio.CancelledError:
                break
