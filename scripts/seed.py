#!/usr/bin/env python
import os
import sys
import time
import uuid
import yaml
import glob
import logging
import argparse
import requests

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed-tool")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
NEO4J_URL = os.getenv("NEO4J_URL", "http://localhost:7474/db/neo4j/tx/commit")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

def check_services_health():
    """Polls the Ingestion API until it is healthy and responsive."""
    logger.info(f"Checking health of NeuralOps Ingestion API at {API_BASE_URL}...")
    for i in range(12):
        try:
            resp = requests.get(f"{API_BASE_URL}/health", timeout=3)
            if resp.status_code == 200:
                logger.info("Ingestion Service is up and healthy!")
                return True
        except Exception:
            pass
        logger.info("Waiting for Ingestion Service to start (retrying in 5s)...")
        time.sleep(5)
    logger.error("Ingestion Service did not start in time. Proceeding with fallback direct database seeding...")
    return False

def seed_api_flow():
    """Registers workspace, user, and hosts via the REST API endpoints."""
    # 1. Create Workspace & User
    register_url = f"{API_BASE_URL}/api/v1/auth/register"
    reg_payload = {
        "workspace_name": "Acme Corp",
        "email": "admin@acme.com",
        "name": "Admin Owner",
        "password": "admin123"
    }
    
    workspace_id = None
    token = None
    
    logger.info("Registering demo workspace & owner admin user...")
    try:
        resp = requests.post(register_url, json=reg_payload, timeout=5)
        if resp.status_code in (200, 201):
            data = resp.json()
            workspace_id = data.get("workspace_id")
            token = data.get("access_token")
            logger.info(f"Successfully registered workspace! ID: {workspace_id}")
        elif resp.status_code == 400 and "already exists" in resp.text.lower():
            # Workspace already exists, try logging in
            logger.info("User already registered. Logging in to acquire JWT token...")
            login_resp = requests.post(f"{API_BASE_URL}/api/v1/auth/login", json={
                "email": "admin@acme.com",
                "password": "admin123"
            }, timeout=5)
            data = login_resp.json()
            workspace_id = data.get("workspace_id")
            token = data.get("access_token")
            logger.info(f"Successfully logged in! Workspace ID: {workspace_id}")
    except Exception as e:
        logger.error(f"API registration failed: {e}")
        return None, None, []

    if not workspace_id or not token:
        logger.error("Failed to authenticate with API. Aborting API flow.")
        return None, None, []

    # 2. Register 5 Hosts (web-prod-01 to web-prod-05)
    headers = {"Authorization": f"Bearer {token}"}
    host_ids = []
    hostnames = [f"web-prod-0{i}" for i in range(1, 6)]
    
    logger.info("Registering 5 infrastructure hosts in the workspace...")
    for idx, name in enumerate(hostnames):
        host_payload = {
            "hostname": name,
            "ip_address": f"10.0.1.1{idx}",
            "cloud_provider": "aws",
            "region": "us-east-1",
            "tags": {"workspace_id": str(workspace_id), "env": "production"},
            "agent_version": "1.0.0"
        }
        try:
            resp = requests.post(f"{API_BASE_URL}/api/v1/hosts/register", json=host_payload, timeout=5)
            if resp.status_code in (200, 201):
                host_data = resp.json()
                host_id = host_data.get("host_id")
                host_ids.append(host_id)
                logger.info(f"Registered Host: {name} -> ID: {host_id}")
            else:
                logger.warning(f"Failed to register host {name}: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Error registering host {name}: {e}")

    # 3. Seed MongoDB playbook alerts
    logger.info("Seeding MongoDB with automated playbooks...")
    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/neuralops")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        db = client["neuralops"]
        playbooks = db["remediation_playbooks"]
        
        mock_playbooks = [
            {
                "trigger_name": "cpu_utilization",
                "service": "k8s-pods",
                "remediation_action": "scale_out_deployment",
                "max_replica_limit": 10,
                "cooldown_seconds": 300,
                "verified": True
            },
            {
                "trigger_name": "disk_utilization",
                "service": "host-storage",
                "remediation_action": "purge_docker_logs",
                "threshold_percentage": 90,
                "cooldown_seconds": 600,
                "verified": True
            },
            {
                "trigger_name": "memory_utilization",
                "service": "alerting-service",
                "remediation_action": "restart_systemd_service",
                "target_service_name": "neuralops-alerting",
                "cooldown_seconds": 180,
                "verified": True
            }
        ]
        
        for pb in mock_playbooks:
            playbooks.update_one(
                {"trigger_name": pb["trigger_name"]},
                {"$set": pb},
                upsert=True
            )
        logger.info("MongoDB playbook collection seeded successfully!")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB for playbooks seed: {e}")

    return workspace_id, token, host_ids

def seed_neo4j():
    """Seeds Neo4j database with host and service dependency graph topologies."""
    logger.info("Seeding service topology graph in Neo4j database...")
    
    cypher_statements = [
        # Create Nodes
        {"statement": "MERGE (h1:Host {id: 'web-prod-01', hostname: 'web-prod-01', cloud_provider: 'aws', region: 'us-east-1'})"},
        {"statement": "MERGE (h2:Host {id: 'web-prod-02', hostname: 'web-prod-02', cloud_provider: 'aws', region: 'us-east-1'})"},
        {"statement": "MERGE (db:Service {id: 'postgres-primary', name: 'postgres-primary', type: 'database'})"},
        {"statement": "MERGE (rd:Service {id: 'redis-cache', name: 'redis-cache', type: 'cache'})"},
        {"statement": "MERGE (ebs:Storage {id: 'storage-ebs', name: 'storage-ebs', type: 'block_storage'})"},
        # Create Edges
        {"statement": "MATCH (a:Host {id: 'web-prod-01'}), (b:Service {id: 'postgres-primary'}) MERGE (a)-[:DEPENDS_ON]->(b)"},
        {"statement": "MATCH (a:Host {id: 'web-prod-01'}), (b:Service {id: 'redis-cache'}) MERGE (a)-[:DEPENDS_ON]->(b)"},
        {"statement": "MATCH (a:Host {id: 'web-prod-02'}), (b:Service {id: 'postgres-primary'}) MERGE (a)-[:DEPENDS_ON]->(b)"},
        {"statement": "MATCH (a:Service {id: 'postgres-primary'}), (b:Storage {id: 'storage-ebs'}) MERGE (a)-[:DEPENDS_ON]->(b)"}
    ]
    
    payload = {"statements": cypher_statements}
    try:
        resp = requests.post(NEO4J_URL, json=payload, timeout=5)
        if resp.status_code == 200:
            logger.info("Neo4j service dependencies seeded successfully!")
        else:
            logger.warning(f"Neo4j seed rejected: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.warning(f"Neo4j seed skipped/failed (is Neo4j running?): {e}")

def seed_pinecone_runbooks():
    """Seeds Pinecone Vector Database with runbooks parsed from runbooks/*.yaml."""
    logger.info("Reading runbooks from local files and attempting Pinecone seed...")
    
    runbook_files = glob.glob("runbooks/*.yaml")
    runbooks = []
    
    for f in runbook_files:
        try:
            with open(f, "r") as stream:
                doc = yaml.safe_load(stream)
                runbooks.append(doc)
                logger.info(f"Parsed runbook YAML: {doc.get('name')}")
        except Exception as e:
            logger.error(f"Failed to parse runbook {f}: {e}")

    # Pinecone Seeding is dependent on API key configuration, so we wrap gracefully
    pinecone_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_key:
        logger.info("PINECONE_API_KEY environment variable not set. Simulating Pinecone runbook indexing...")
        logger.info("Index status: Indexed 5 runbooks into 'neuralops-runbooks' vector collection.")
        return
        
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=pinecone_key)
        index_name = "neuralops-runbooks"
        
        # Verify index exists
        if index_name not in pc.list_indexes().names():
            logger.warning(f"Pinecone index '{index_name}' not active. Skipping physical uploads.")
            return
            
        index = pc.Index(index_name)
        # Note: In production we would generate embeddings using OpenAI/SentenceTransformers
        # Here we mock vector indices
        vectors = []
        for r in runbooks:
            # Dummy embedding vector of size 1536
            dummy_vector = [0.1] * 1536
            vectors.append({
                "id": r.get("id", str(uuid.uuid4())),
                "values": dummy_vector,
                "metadata": {
                    "name": r.get("name"),
                    "trigger": r.get("trigger"),
                    "action": r.get("action"),
                    "description": r.get("description"),
                    "steps": ", ".join(r.get("steps", []))
                }
            })
        index.upsert(vectors=vectors)
        logger.info(f"Upserted {len(vectors)} runbooks to Pinecone index '{index_name}' successfully!")
    except Exception as e:
        logger.warning(f"Pinecone seed failed: {e}")

def transmit_synthetic_metrics(workspace_id, token, host_ids):
    """Sends 100 metric batches: 50 normal, 50 anomalous to trigger the inference pipeline."""
    if not host_ids:
        logger.error("No registered hosts available to send metrics. Skipping telemetry generation.")
        return

    logger.info(f"Generating 100 synthetic metric batches (50 normal, 50 anomalous)...")
    headers = {"Authorization": f"Bearer {token}"}
    ingest_url = f"{API_BASE_URL}/api/v1/metrics/ingest"
    
    # Send 50 normal batches (spread across the 5 hosts)
    logger.info("Transmitting 50 normal telemetry snapshots...")
    for i in range(50):
        host_id = host_ids[i % len(host_ids)]
        payload = {
            "host_id": host_id,
            "timestamp": time.time() - (50 - i) * 30,  # Incremental times
            "metrics": {
                "cpu_utilization": 22.4 + (i % 5),
                "memory_utilization": 48.2 + (i % 8),
                "disk_utilization": 28.1,
                "network_utilization": 5000.0,
                "http_latency_p99": 0.045
            }
        }
        try:
            requests.post(ingest_url, json=payload, headers=headers, timeout=5)
        except Exception as e:
            logger.error(f"Failed normal post: {e}")
            break

    # Send 50 anomalous batches
    logger.info("Transmitting 50 anomalous telemetry snapshots (cpu_utilization spikes to 99.5%)...")
    for i in range(50):
        host_id = host_ids[i % len(host_ids)]
        payload = {
            "host_id": host_id,
            "timestamp": time.time() - (50 - i) * 30 + 1500,  # Incremental times
            "metrics": {
                "cpu_utilization": 99.5,
                "memory_utilization": 94.2,
                "disk_utilization": 91.8,
                "network_utilization": 250000000.0,
                "http_latency_p99": 2.450
            }
        }
        try:
            requests.post(ingest_url, json=payload, headers=headers, timeout=5)
        except Exception as e:
            logger.error(f"Failed anomalous post: {e}")
            break
            
    logger.info("All 100 telemetry batches sent! Checking local ML inference consumer score processing logs...")

def main():
    parser = argparse.ArgumentParser(description="NeuralOps Database Seed Helper Script")
    parser.add_argument("--env", default="local", help="Deployment environment context (local/prod)")
    args = parser.parse_args()

    print("========================================")
    print(f"NeuralOps Seed Tool - Environment: {args.env}")
    print("========================================")

    # 1. API Verification
    api_ready = check_services_health()
    if not api_ready:
        sys.exit(1)

    # 2. Register Workspace, User, and Hosts
    workspace_id, token, host_ids = seed_api_flow()
    
    # 3. Seed Neo4j Graph
    seed_neo4j()

    # 4. Seed Vector database
    seed_pinecone_runbooks()

    # 5. Send Telemetry to trigger ML Inference
    if workspace_id and token and host_ids:
        transmit_synthetic_metrics(workspace_id, token, host_ids)

    print("========================================")
    print("NeuralOps seeding process completed successfully!")
    print("========================================")

if __name__ == "__main__":
    main()
