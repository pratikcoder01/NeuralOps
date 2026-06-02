import socket
import platform
import httpx
from typing import Dict, Any, Tuple

def get_system_os() -> str:
    """
    Returns detected operating system name
    """
    return platform.system()

def get_hostname() -> str:
    """
    Returns current host hostname
    """
    return socket.gethostname()

async def detect_cloud_provider() -> Tuple[str, str, str]:
    """
    Detects cloud provider (AWS, GCP, Azure) and metadata (region, instance_type)
    Returns: (provider, region, instance_type)
    """
    timeout = httpx.Timeout(1.0)
    
    # 1. Check AWS Metadata (IMDSv2 preferred, fallback to IMDSv1)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Try to get IMDSv2 Token first
            token_resp = await client.put(
                "http://169.254.169.254/latest/api/token",
                headers={"X-aws-ec2-metadata-token-ttl-seconds": "60"}
            )
            headers = {}
            if token_resp.status_code == 200:
                headers = {"X-aws-ec2-metadata-token": token_resp.text}
                
            # Query instance identity document
            identity_resp = await client.get(
                "http://169.254.169.254/latest/dynamic/instance-identity/document",
                headers=headers
            )
            if identity_resp.status_code == 200:
                data = identity_resp.json()
                return "AWS", data.get("region", "unknown"), data.get("instanceType", "unknown")
    except Exception:
        pass

    # 2. Check GCP Metadata
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(
                "http://metadata.google.internal/computeMetadata/v1/instance/?recursive=true",
                headers={"Metadata-Flavor": "Google"}
            )
            if resp.status_code == 200:
                data = resp.json()
                # Parse zone: e.g. "projects/12345/zones/us-central1-a"
                zone = data.get("zone", "unknown").split("/")[-1]
                region = "-".join(zone.split("-")[:-1]) if zone != "unknown" else "unknown"
                return "GCP", region, data.get("machineType", "unknown").split("/")[-1]
    except Exception:
        pass

    # 3. Check Azure Metadata
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(
                "http://169.254.169.254/metadata/instance?api-version=2021-02-01",
                headers={"Metadata": "true"}
            )
            if resp.status_code == 200:
                data = resp.json()
                compute = data.get("compute", {})
                return "AZURE", compute.get("location", "unknown"), compute.get("vmSize", "unknown")
    except Exception:
        pass

    return "unknown", "unknown", "unknown"

async def gather_platform_metadata() -> Dict[str, Any]:
    """
    Aggregates all platform, cloud, and agent specs
    """
    provider, region, instance_type = await detect_cloud_provider()
    
    # Simple IP lookup
    ip_address = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't need to connect, just maps local address interface
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    return {
        "os": get_system_os(),
        "hostname": get_hostname(),
        "ip_address": ip_address,
        "cloud_provider": provider,
        "region": region,
        "instance_type": instance_type,
        "platform_details": platform.platform()
    }
