import os
import sys
import click
import asyncio
import psutil
import logging
import subprocess
from pathlib import Path
from neuralops_agent import __version__
from neuralops_agent.config import (
    AgentConfig, save_config, load_config, get_cached_host_id, CONFIG_DIR
)
from neuralops_agent.agent import NeuralOpsAgent
from neuralops_agent.utils.logger import setup_logger

PID_FILE = CONFIG_DIR / "agent.pid"

def get_daemon_pid() -> int | None:
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                return pid
        except Exception:
            pass
    return None

def write_pid(pid: int):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    PID_FILE.write_text(str(pid))

def remove_pid():
    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except Exception:
            pass

@click.group()
@click.version_option(version=__version__)
def main():
    """NeuralOps Agent SDK Command Line Interface."""
    pass

@main.command()
@click.option("--api-key", required=False, help="NeuralOps API Key")
@click.option("--workspace-id", required=False, help="Workspace ID")
@click.option("--endpoint", default="http://localhost:8000", help="API Endpoint")
@click.option("--interval", default=30, type=int, help="Collection interval (s)")
@click.option("--tags", default="", help="Comma separated key=value tags")
@click.option("--daemon", is_flag=True, help="Run as background daemon process")
@click.option("--log-level", default="INFO", help="Output log level")
@click.option("--transport", default="HTTP", help="HTTP or KAFKA")
@click.option("--kafka-brokers", default="localhost:9092", help="Kafka brokers")
def start(api_key, workspace_id, endpoint, interval, tags, daemon, log_level, transport, kafka_brokers):
    """Starts the NeuralOps metrics collection agent loop."""
    logger = setup_logger("neuralops-agent", log_level)
    
    # 1. Parse Tags
    parsed_tags = {}
    if tags:
        for item in tags.split(","):
            if "=" in item:
                k, v = item.split("=", 1)
                parsed_tags[k.strip()] = v.strip()

    # 2. Resolve Config (CLI overrides -> File configuration)
    saved = load_config()
    
    resolved_api_key = api_key or (saved.api_key if saved else None)
    resolved_workspace_id = workspace_id or (saved.workspace_id if saved else None)

    if not resolved_api_key or not resolved_workspace_id:
        click.echo("Error: --api-key and --workspace-id are required on first start or if config.yaml is missing.")
        sys.exit(1)

    config = AgentConfig(
        api_key=resolved_api_key,
        workspace_id=resolved_workspace_id,
        endpoint=endpoint or (saved.endpoint if saved else "http://localhost:8000"),
        interval_seconds=interval,
        tags=parsed_tags or (saved.tags if saved else {}),
        log_level=log_level,
        transport_type=transport,
        kafka_brokers=kafka_brokers
    )

    # Save to yaml
    save_config(config)

    # 3. Check for existing daemon
    active_pid = get_daemon_pid()
    if active_pid:
        click.echo(f"NeuralOps agent is already running in background with PID: {active_pid}")
        sys.exit(0)

    # 4. Handle Daemon spawn (cross-platform detached background process)
    if daemon:
        click.echo("Starting NeuralOps agent in background...")
        # Prepare subprocess arguments excluding daemon flag
        args = [
            sys.executable, "-m", "neuralops_agent", "start",
            "--endpoint", config.endpoint,
            "--interval", str(config.interval_seconds),
            "--log-level", config.log_level,
            "--transport", config.transport_type,
            "--kafka-brokers", config.kafka_brokers
        ]
        
        # Tags formatting back
        if config.tags:
            tag_str = ",".join(f"{k}={v}" for k, v in config.tags.items())
            args.extend(["--tags", tag_str])
            
        # Spawn detached process
        if sys.platform == "win32":
            # Creation flags for detaching in Windows: DETACHED_PROCESS = 0x00000008
            p = subprocess.Popen(args, creationflags=0x00000008, close_fds=True)
        else:
            p = subprocess.Popen(args, start_new_session=True, close_fds=True)

        write_pid(p.pid)
        click.echo(f"Agent successfully started in background. PID: {p.pid}")
        sys.exit(0)

    # 5. Non-daemon foreground start
    logger.info("Initializing NeuralOps Agent...")
    agent = NeuralOpsAgent(config)
    
    loop = asyncio.get_event_loop()
    
    # Register stop triggers
    def stop_agent():
        logger.info("Termination signal received.")
        loop.create_task(agent.stop())
        
    try:
        loop.run_until_complete(agent.start())
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        loop.run_until_complete(agent.stop())
    finally:
        loop.close()

@main.command()
def stop():
    """Stops the active background daemon process."""
    active_pid = get_daemon_pid()
    if not active_pid:
        click.echo("NeuralOps agent is not running in background.")
        sys.exit(0)

    click.echo(f"Stopping NeuralOps agent (PID: {active_pid})...")
    try:
        p = psutil.Process(active_pid)
        p.terminate()
        p.wait(timeout=5.0)
        click.echo("Agent terminated successfully.")
    except psutil.NoSuchProcess:
        click.echo("Process already stopped.")
    except Exception as e:
        click.echo(f"Failed to stop agent smoothly: {e}. Killing process...")
        try:
            p.kill()
        except Exception:
            pass
    finally:
        remove_pid()

@main.command()
def status():
    """Displays operational details of the agent daemon."""
    active_pid = get_daemon_pid()
    status_str = "RUNNING" if active_pid else "STOPPED"
    host_id = get_cached_host_id() or "unregistered"
    config = load_config()

    click.echo("========================================")
    click.echo(" NeuralOps Agent Status Summary")
    click.echo("========================================")
    click.echo(f"Status:            {status_str}")
    click.echo(f"Daemon PID:        {active_pid or 'N/A'}")
    click.echo(f"Host ID:           {host_id}")
    if config:
        click.echo(f"API Endpoint:      {config.endpoint}")
        click.echo(f"Interval:          {config.interval_seconds}s")
        click.echo(f"Transport:         {config.transport_type}")
        click.echo(f"Tags:              {config.tags}")
    else:
        click.echo("Config File:       Not found (Run start once to generate)")
    click.echo("========================================")

@main.command("test-connection")
def test_connection():
    """Tests internet and workspace API key credentials with NeuralOps."""
    config = load_config()
    if not config:
        click.echo("Error: Config not found. Run start once with credentials before testing connection.")
        sys.exit(1)

    import httpx
    click.echo(f"Testing connectivity to Ingestion endpoint: {config.endpoint}...")
    
    url = f"{config.endpoint}/health"
    try:
        resp = httpx.get(url, timeout=4.0)
        if resp.status_code == 200:
            click.echo(f"✓ Connectivity SUCCESS. Health response: {resp.text}")
            sys.exit(0)
        else:
            click.echo(f"✗ Connectivity FAILED. Server returned status code: {resp.status_code}")
    except Exception as e:
        click.echo(f"✗ Connectivity FAILED. Error reaching server: {e}")
    sys.exit(1)
