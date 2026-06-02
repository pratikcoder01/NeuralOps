import asyncio
from typing import List, Dict, Any

class MetricsBuffer:
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._buffer: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def add(self, item: Dict[str, Any]) -> None:
        """
        Appends metric snapshot to the ring buffer. Evicts oldest if capacity exceeded.
        """
        async with self._lock:
            if len(self._buffer) >= self.max_size:
                self._buffer.pop(0) # Evict oldest
            self._buffer.append(item)

    async def size(self) -> int:
        """
        Returns number of items in buffer
        """
        async with self._lock:
            return len(self._buffer)

    async def should_flush(self, threshold: int = 1) -> bool:
        """
        Returns True if the buffer has items exceeding threshold
        """
        async with self._lock:
            return len(self._buffer) >= threshold

    async def flush(self) -> List[Dict[str, Any]]:
        """
        Retrieves all buffered telemetry items and resets the list
        """
        async with self._lock:
            items = list(self._buffer)
            self._buffer.clear()
            return items
