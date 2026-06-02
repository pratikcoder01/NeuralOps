import pytest
from neuralops_agent.buffer import MetricsBuffer

@pytest.mark.asyncio
async def test_buffer_add_and_eviction():
    buffer = MetricsBuffer(max_size=3)
    
    await buffer.add({"id": 1})
    await buffer.add({"id": 2})
    await buffer.add({"id": 3})
    
    assert await buffer.size() == 3
    
    # Adding 4th item triggers eviction of oldest (id: 1)
    await buffer.add({"id": 4})
    assert await buffer.size() == 3
    
    items = await buffer.flush()
    assert len(items) == 3
    assert items[0]["id"] == 2
    assert items[1]["id"] == 3
    assert items[2]["id"] == 4

@pytest.mark.asyncio
async def test_buffer_should_flush_and_flush():
    buffer = MetricsBuffer(max_size=10)
    
    assert not await buffer.should_flush(threshold=2)
    
    await buffer.add({"val": "a"})
    assert await buffer.should_flush(threshold=1)
    assert not await buffer.should_flush(threshold=2)
    
    await buffer.add({"val": "b"})
    assert await buffer.should_flush(threshold=2)
    
    # Flush clears the buffer
    items = await buffer.flush()
    assert len(items) == 2
    assert await buffer.size() == 0
    assert not await buffer.should_flush(threshold=1)
