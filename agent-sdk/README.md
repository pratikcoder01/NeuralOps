# NeuralOps Agent Python SDK

A lightweight telemetry agent SDK designed to monitor node CPU, RAM, and disk utilization, streaming data records to the NeuralOps central ingestion server.

## Installation
```bash
pip install -e .
```

## Quick Start
You can run the telemetry collection daemon programmatically:

```python
from neuralops_agent import NeuralOpsAgentClient

# Instantiate and start metrics collection loop every 5 seconds
client = NeuralOpsAgentClient(
    endpoint_url="http://localhost:8000",
    check_interval=5
)

client.start_loop()
```
