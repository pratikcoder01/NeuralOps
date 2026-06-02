# NeuralOps 🧠🚀

An advanced, AI-powered cloud infrastructure anomaly detection and autonomous self-healing remediation platform. NeuralOps leverages high-velocity telemetry pipelines, neural network reconstruction models, and Retrieval-Augmented Generation (RAG) playbook lookup to automatically resolve cloud infrastructure anomalies before they lead to downstream service degradation.

[![NeuralOps Control Center Placeholder](https://raw.githubusercontent.com/pratikcoder01/NeuralOps/main/screenshot_placeholder.png)](https://github.com/pratikcoder01/NeuralOps)

---

## 🏗️ System Architecture

NeuralOps is designed as a modular, event-driven, production-grade monorepo managed by **Turborepo** and **npm Workspaces**. 

```
                                      [Telemetry Collector Nodes]
                                                   │  (Python Agent SDK)
                                                   ▼
                                        ┌────────────────────┐
                                        │ Ingestion Service  │ (FastAPI - Port 8000)
                                        └──────────┬─────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            │ (Structured History)                        │ (Real-time Stream)
                            ▼                                             ▼
                 ┌────────────────────┐                        ┌────────────────────┐
                 │ PostgreSQL (RDS)   │                        │   Kafka Broker     │
                 └──────────┬─────────┘                        └──────────┬─────────┘
                            │                                             │  (Topic: raw.metrics)
                            ▼                                             ▼
                 ┌────────────────────┐                        ┌────────────────────┐
                 │    Neo4j Graph     │                        │ Anomaly Detectors  │ (PyTorch Autoencoders)
                 │ (Service Topology) │                        └──────────┬─────────┘
                 └────────────────────┘                                   │
                                                                          ▼  (Topic: anomaly.events)
                                                               ┌────────────────────┐
                                                               │  Alerting Service  │ (GraphQL Node/Apollo)
                                                               └──────────┬─────────┘
                                                                          │
                                                                          ▼  (Topic: remediation.cmds)
                                                               ┌────────────────────┐
                                                               │ Remediation Engine │ (FastAPI + Celery + RAG)
                                                               └──────────┬─────────┘
                                                                          │
                                                                          ▼
                                                              [Target Cloud Resources]
                                                                (Auto-scale / Purge Logs / Service restarts)
```

### Monorepo Directory Tree

```
neuralops/
├── apps/
│   ├── web/                     (Next.js 14 Web UI Dashboard - port 3000)
│   ├── ingestion-service/       (FastAPI Python server - port 8000)
│   ├── alerting-service/        (TypeScript + Apollo GraphQL server - port 4000)
│   └── remediation-service/     (FastAPI + Celery Worker - port 8001 / 8000 internally)
├── ml/
│   ├── anomaly_detection/       (PyTorch Autoencoder model configs & serving)
│   └── rag/                     (Generative OpenAI & Pinecone runbooks lookup)
├── agent-sdk/                   (Python host package `neuralops-agent`)
├── infra/
│   ├── terraform/               (AWS VPC, RDS, ElastiCache, MSK, EKS Terraform specifications)
│   ├── k8s/                     (Kubernetes services & deployments manifests & Helm chart)
│   └── docker/                  (Image strategy guides)
├── monitoring/
│   ├── prometheus/              (Prometheus system scraper configs & alert rules)
│   └── grafana/                 (Grafana JSON analytics dashboards)
├── .github/workflows/           (CI/CD Pipeline configs for CI, Staging, Prod Blue-Green)
├── docker-compose.yml           (Local container services setup)
├── docker-compose.test.yml      (Ephemeral integration testing setups)
├── turbo.json                   (Turborepo caching pipeline)
├── .env.example                 (Environment variable schemas)
├── Makefile                     (Unified developer shortcuts)
└── README.md                    (This manual)
```

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
Make sure you have the following packages installed:
* **Docker & Docker Compose (v3.8+)**
* **Python (v3.11+)**
* **Node.js (v20+) & npm**
* **kubectl** (Kubernetes CLI)
* **Terraform (v1.5+)**

---

### Quickstart (5 Commands to Run Locally)

Get the complete NeuralOps platform up and running in your local sandbox environment:

```bash
# 1. Clone the repository and navigate to root
git clone https://github.com/pratikcoder01/NeuralOps.git && cd NeuralOps

# 2. Copy configurations and install all Node.js dependencies
cp .env.example .env && npm install

# 3. Spin up all local databases, brokers, and service containers in background
make dev

# 4. Migrate database schemas and seed workspaces, hosts, runbooks, and graph databases
make migrate && make seed

# 5. Compile and run the Next.js interactive frontend dashboard
npx turbo run dev --filter=web
```

Access the premium control center dashboard at **`http://localhost:3000/`**.

---

## ⚙️ Environment Variables Reference

Below is a reference guide detailing the core environment configurations used across services:

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neuralops:neuralops@localhost:5432/neuralops` | Connection URL for core PostgreSQL database store |
| `MONGO_URI` | `mongodb://localhost:27017/neuralops` | MongoDB URL used by alerting-service to archive metric logs |
| `REDIS_URL` | `redis://localhost:6379/0` | Key-value store and Celery broker url |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Address array of Kafka broker instances |
| `NEO4J_URL` | `http://localhost:7474/db/neo4j/tx/commit` | HTTP transactional endpoint for the Neo4j Graph DB |
| `PINECONE_API_KEY` | `""` | Pinecone Cloud API Key for RAG runbook embeddings |
| `OPENAI_API_KEY` | `""` | OpenAI API Key for RAG execution analysis |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | MLflow model tracking registry URI |
| `AIRFLOW_API_URL` | `http://localhost:8083/api/v1` | Apache Airflow REST API endpoint |

---

## 🧑‍💻 Microservice Interfaces & Playgrounds

When your services are online, you can audit, test, and view real-time data flows via administration consoles:

| Service UI / Tool | Address | Purpose |
| :--- | :--- | :--- |
| **Next.js Web Client** | `http://localhost:3000` | Real-time interactive control center dashboard |
| **Ingestion Swagger API** | `http://localhost:8000/docs` | FastAPI Swagger manual for posting metric logs |
| **Apollo GraphQL server** | `http://localhost:4000/graphql` | Sandbox workspace to run alert queries, mutations, and WS subscriptions |
| **Remediation API** | `http://localhost:8001/docs` | Trigger or monitor autonomous Celery runbooks |
| **MLflow Server UI** | `http://localhost:5000` | Model experiment tracking registry dashboard |
| **Airflow Web UI** | `http://localhost:8083` | Apache Airflow DAG orchestrator console |
| **Adminer UI** | `http://localhost:8080` | High-level PostgreSQL visual database editor |
| **Mongo Express UI** | `http://localhost:8081` | Visual editor for playbooks and incident collections |
| **Kafka UI** | `http://localhost:8082` | Real-time topic broker queue analyzer |
| **Neo4j Console** | `http://localhost:7474` | Dependency graph visual editor |

---

## 🧪 Running Test Suites

Validate the code quality and run integration and unit tests across all applications concurrently:

* **Verify all apps** (Turborepo):
  ```bash
  make test
  ```
* **Verify End-to-End Integration Flow** (Pytest E2E):
  ```bash
  make e2e-test
  ```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps to add new features or runbooks:
1. Fork the Project Repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
