#!/usr/bin/env python
import os
import sys
import time

def main():
    print("========================================")
    print("NeuralOps Platform Database Seed Tool")
    print("========================================")
    
    print("[1/3] Seeding PostgreSQL with mock alert definitions and host registers...")
    try:
        import psycopg2
        conn = psycopg2.connect(
            dsn=os.getenv("DATABASE_URL", "postgresql://neuralops:neuralops@localhost:5432/neuralops"),
            connect_timeout=3
        )
        cursor = conn.cursor()
        # Create table if not exists (in case migrations weren't run)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS host_metrics_config (
                id SERIAL PRIMARY KEY,
                hostname VARCHAR(255) UNIQUE NOT NULL,
                ip_address VARCHAR(50) NOT NULL,
                environment VARCHAR(50) DEFAULT 'production',
                check_interval INT DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Insert mock items
        hosts = [
            ("k8s-node-primary-01", "10.0.1.10", "production"),
            ("k8s-node-worker-02", "10.0.1.11", "production"),
            ("db-master-us-east", "10.0.2.5", "production"),
            ("staging-api-gateway", "10.1.0.4", "staging")
        ]
        for host, ip, env in hosts:
            cursor.execute("""
                INSERT INTO host_metrics_config (hostname, ip_address, environment)
                VALUES (%s, %s, %s)
                ON CONFLICT (hostname) DO NOTHING;
            """, (host, ip, env))
        conn.commit()
        cursor.close()
        conn.close()
        print(" -> PostgreSQL seeded successfully with mock hosts!")
    except Exception as e:
        print(f" -> PostgreSQL seed skipped/failed (is DB running?): {e}")

    print("[2/3] Seeding MongoDB with mock playbook alerts...")
    try:
        from pymongo import MongoClient
        client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/neuralops"), serverSelectionTimeoutMS=3000)
        db = client["neuralops"]
        playbooks = db["remediation_playbooks"]
        
        mock_playbooks = [
            {
                "trigger_name": "high_cpu_utilization",
                "service": "k8s-pods",
                "remediation_action": "scale_out_deployment",
                "max_replica_limit": 10,
                "cooldown_seconds": 300,
                "verified": True
            },
            {
                "trigger_name": "disk_space_exhaustion",
                "service": "host-storage",
                "remediation_action": "purge_docker_logs",
                "threshold_percentage": 90,
                "cooldown_seconds": 600,
                "verified": True
            },
            {
                "trigger_name": "memory_leak_detected",
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
        print(" -> MongoDB seeded successfully with remediation playbooks!")
    except Exception as e:
        print(f" -> MongoDB seed skipped/failed (is DB running?): {e}")

    print("[3/3] Seeding Redis with service heartbeat cache keys...")
    try:
        import redis
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), socket_timeout=3)
        services = ["ingestion-service", "alerting-service", "remediation-service"]
        for svc in services:
            r.set(f"heartbeat:{svc}", "healthy", ex=3600)
        print(" -> Redis seeded successfully with mock heartbeat keys!")
    except Exception as e:
        print(f" -> Redis seed skipped/failed (is DB running?): {e}")

    print("========================================")
    print("Database seeding completed.")
    print("========================================")

if __name__ == "__main__":
    main()
