# NeuralOps 🧠🚀

An advanced, AI-powered cloud infrastructure anomaly detection and autonomous self-healing remediation platform. NeuralOps leverages high-velocity telemetry pipelines, neural network reconstruction models, and Retrieval-Augmented Generation (RAG) playbook lookup to automatically resolve cloud infrastructure anomalies before they lead to downstream service degradation.

---

## 🏗️ System Architecture

NeuralOps is designed as a modular, event-driven, production-grade monorepo managed by **Turborepo** and **npm Workspaces**. 

```
                                      [Telemetry Collector Nodes]
                                                   │  (Python Agent SDK)
                                                   ▼
                                        ┌────────────────────┐
                                        │ Ingestion Service  │ (FastAPI)
                                        └──────────┬─────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            │ (Structured History)                        │ (Real-time Stream)
                            ▼                                             ▼
                 ┌────────────────────┐                        ┌────────────────────┐
                 │ PostgreSQL (RDS)   │                        │   Kafka Broker     │
                 └────────────────────┘                        └──────────┬─────────┘
                                                                          │  (Topic: raw.metrics)
                                                                          ▼
                                                               ┌────────────────────┐
                                                               │ Anomaly Detectors  │ (PyTorch Autoencoders)
                                                               └──────────┬─────────┘
                                                                          │
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
│   └── remediation-service/     (FastAPI + Celery Worker - port 8001)
├── ml/
│   ├── anomaly_detection/       (PyTorch Autoencoder model configs)
│   └── rag/                     (Generative OpenAI & Pinecone runbooks lookup)
├── agent-sdk/                   (Python host package `neuralops-agent`)
├── infra/
│   ├── terraform/               (AWS VPC, RDS, and ECS specifications)
│   ├── k8s/                     (Kubernetes services & deployments manifests)
│   └── docker/                  (Image strategy guides)
├── monitoring/
│   ├── prometheus/              (Prometheus system scraper configs)
│   └── grafana/                 (Automatic datasource provision configs)
├── .github/workflows/           (CI/CD Pipeline configs)
├── docker-compose.yml           (Local container services setup)
├── docker-compose.test.yml      (Ephemeral integration testing setups)
├── turbo.json                   (Turborepo caching pipeline)
├── .env.example                 (Environment variable schemas)
├── .gitignore                   (Clean Node/Python/Secrets filters)
├── Makefile                     (Unified developer shortcuts)
└── README.md                    (This manual)
```

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
Make sure you have the following packages installed:
- [Node.js (v20+)](https://nodejs.org/) & `npm`
- [Python (v3.11+)](https://www.python.org/)
- [Docker Engine & Docker Compose](https://www.docker.com/)

---

### Step-by-Step Setup

#### 1. Clone & Configuration
Initialize your environment configurations:
```bash
cp .env.example .env
```
Install all Node.js workspace dependencies:
```bash
npm install
```

#### 2. Start Infrastructural Services
Spin up local developer resources (Postgres, Mongo, Redis, Zookeeper, Kafka, and administration UIs) via the Makefile:
```bash
make dev
```
This spins up the following services:
- **PostgreSQL 15** on port `5432`
- **MongoDB 7** on port `27017`
- **Redis 7** on port `6379`
- **ZooKeeper** on port `2181`
- **Apache Kafka** on port `9092`
  - Automatically initializes topics: `raw.metrics`, `anomaly.events`, and `remediation.cmds`.

#### 3. Run Database Migrations
Execute Alembic migrations to setup PostgreSQL database tables in the ingestion-service:
```bash
make migrate
```

#### 4. Seed Mock Data
Inject mock host registers, database items, and remediation playbooks:
```bash
make seed
```

#### 5. Launch Telemetry Dashboard (NextJS)
To run the developer server for the Next.js frontend:
```bash
npx turbo run dev --filter=web
```
Access the premium control center at `http://localhost:3000/`.

---

## 🧑‍💻 Microservice Interfaces & Playgrounds

When your services are online, you can audit, test, and view real-time data flows via administration consoles:

| Service UI / Tool | Address | Purpose |
| :--- | :--- | :--- |
| **Next.js Web Client** | `http://localhost:3000` | Real-time interactive dashboard |
| **Ingestion Swagger API** | `http://localhost:8000/docs` | FastAPI Swagger manual for posting metric logs |
| **Apollo GraphQL server** | `http://localhost:4000` | Sandbox workspace to run alert queries & mutations |
| **Remediation API** | `http://localhost:8001/docs` | Trigger or monitor autonomous Celery runbooks |
| **Adminer UI** | `http://localhost:8080` | High-level PostgreSQL visual database editor |
| **Mongo Express UI** | `http://localhost:8081` | Visual editor for playbooks and incident collections |
| **Kafka UI** | `http://localhost:8082` | Real-time topic broker queue analyzer |

---

## 🧪 Running Test Suites

Run integration and unit tests across all applications concurrently via Turborepo:
```bash
make test
```
This validates Next.js client setups, Node GraphQL compilation tests, and executes Python tests.
