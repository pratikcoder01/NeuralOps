# NeuralOps Agent SDK

The lightweight, open-source, highly efficient infrastructure metrics collector agent for **NeuralOps** — the AI-powered cloud infrastructure anomaly detection and automated remediation platform.

Gathers resource statistics, manages background heartbeat workers, supports custom operational plugins, and streams metrics directly to the NeuralOps APIs.

## Installation

Install the package via pip:

```bash
pip install neuralops-agent
```

Or for development (editable mode):

```bash
pip install -e .
```

## Quick Start

Register and start the metrics collection loop:

```bash
neuralops-agent start --api-key=your_api_key_here --workspace-id=your_workspace_id_here
```

### Options

* `--api-key TEXT`: Your workspace API Key. (Required)
* `--workspace-id TEXT`: Your target workspace UUID. (Required)
* `--endpoint TEXT`: Ingestion API base url. (Default: `http://localhost:8000`)
* `--interval INTEGER`: Seconds between measurements. (Default: `30` seconds)
* `--tags TEXT`: Key-value tags, e.g., `env=production,region=us-east-1`.
* `--daemon`: Runs as a background daemon process.
* `--log-level TEXT`: Configures stdout severity (`INFO`, `DEBUG`, `WARNING`, `ERROR`). (Default: `INFO`)

## Custom Plugins API

Extend metric collection by registering custom collectors. Registered classes automatically push custom metrics under the `"custom"` payload object:

```python
from neuralops_agent import agent, MetricPlugin

@agent.plugin("database_monitor")
class DatabaseMonitorPlugin(MetricPlugin):
    def collect(self) -> dict:
        # Custom logic here
        return {
            "active_connections": 142,
            "slow_queries_per_sec": 0.4
        }
```

## Docker Execution

Run as an isolated metrics container:

```bash
docker run -d \
  -e NEURALOPS_API_KEY=xxx \
  -e NEURALOPS_WORKSPACE_ID=yyy \
  -e NEURALOPS_ENDPOINT=http://host.docker.internal:8000 \
  neuralops/agent:latest
```
