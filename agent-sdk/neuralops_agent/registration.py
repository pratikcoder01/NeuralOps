import uuid
import httpx
import logging
from typing import Dict, Any
from neuralops_agent import __version__
from neuralops_agent.config import AgentConfig, get_cached_host_id, save_host_id
from neuralops_agent.utils.platform import gather_platform_metadata

logger = logging.getLogger("neuralops-agent")

async def register_host(config: AgentConfig) -> str:
    """
    Idempotently registers the host with NeuralOps API, falling back to a local UUID if offline.
    """
    cached_id = get_cached_host_id()
    if cached_id:
        logger.info(f"Host already registered with ID: {cached_id}")
        return cached_id

    logger.info("Registering host with NeuralOps Ingestion API...")
    platform_meta = await gather_platform_metadata()
    
    payload = {
        "hostname": platform_meta["hostname"],
        "ip_address": platform_meta["ip_address"],
        "cloud_provider": platform_meta["cloud_provider"],
        "region": platform_meta["region"],
        "tags": config.tags,
        "agent_version": __version__
    }

    url = f"{config.endpoint}/api/v1/hosts/register"
    headers = {
        "X-NeuralOps-Agent-Version": __version__,
        "Authorization": f"Bearer {config.api_key}"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                data = resp.json()
                host_id = data.get("host_id")
                if host_id:
                    save_host_id(host_id)
                    logger.info(f"Host registered successfully. ID: {host_id}")
                    return host_id
            
            logger.warning(f"Ingestion server registration rejected: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.warning(f"Failed to connect to NeuralOps Ingestion API ({e}). Registering in local offline mode.")

    # Offline / Failover Fallback: generate local UUID
    offline_id = f"local-host-{uuid.uuid4()}"
    save_host_id(offline_id)
    logger.info(f"Host registered in local offline fallback mode. ID: {offline_id}")
    return offline_id
