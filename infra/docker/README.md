# Docker Deployment Strategies

This directory stores shared scripts and configurations for building, running, and managing docker-based deployments.

## Image Strategies
Each microservice manages its own Docker environment:
- **apps/ingestion-service**: Python Builder + Runner. Runs FastAPI on port 8000.
- **apps/alerting-service**: Node builder compiling TypeScript. Runs Apollo on port 4000.
- **apps/remediation-service**: Python FastAPI + Celery. Port 8001.

## Local Registry Builds
To build all microservice containers locally:
```bash
docker build -t neuralops/ingestion-service:latest ./apps/ingestion-service
docker build -t neuralops/alerting-service:latest ./apps/alerting-service
docker build -t neuralops/remediation-service:latest ./apps/remediation-service
```
