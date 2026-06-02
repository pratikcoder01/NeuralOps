import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

CONFIG_DIR = Path.home() / ".neuralops"
CONFIG_FILE = CONFIG_DIR / "config.yaml"
HOST_ID_FILE = CONFIG_DIR / "host_id"

class AgentConfig(BaseModel):
    api_key: str = Field(..., description="NeuralOps API Key")
    workspace_id: str = Field(..., description="Workspace ID")
    endpoint: str = Field("http://localhost:8000", description="API endpoint")
    interval_seconds: int = Field(30, description="Collection interval in seconds")
    tags: Dict[str, str] = Field(default_factory=dict, description="Key-value tags")
    log_level: str = Field("INFO", description="Logging level")
    transport_type: str = Field("HTTP", description="HTTP or KAFKA")
    kafka_brokers: str = Field("localhost:9092", description="Kafka brokers comma-separated")

def save_config(config: AgentConfig) -> None:
    """
    Saves AgentConfig schema to ~/.neuralops/config.yaml
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        yaml.safe_dump(config.model_dump(), f)

def load_config() -> Optional[AgentConfig]:
    """
    Loads AgentConfig from ~/.neuralops/config.yaml if it exists
    """
    if not CONFIG_FILE.exists():
        return None
    try:
        with open(CONFIG_FILE, "r") as f:
            data = yaml.safe_load(f)
            if data:
                return AgentConfig(**data)
    except Exception:
        pass
    return None

def get_cached_host_id() -> Optional[str]:
    """
    Reads cached host UUID from ~/.neuralops/host_id
    """
    if HOST_ID_FILE.exists():
        try:
            return HOST_ID_FILE.read_text().strip()
        except Exception:
            pass
    return None

def save_host_id(host_id: str) -> None:
    """
    Caches host UUID inside ~/.neuralops/host_id
    """
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    HOST_ID_FILE.write_text(host_id.strip())
