# Automated Remediation Service

A background execution engine built with **FastAPI**, **Celery**, and **Redis** to automate infrastructure fixes (e.g., scaling Pods, purging cache, restarting host services).

## Core Structure
- `main.py`: Gateway API to trigger manual remediation runs and query asynchronous task results.
- `celery_worker.py`: Implements robust background playbook executors.

## Execution commands
- **API Server**:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8001
  ```
- **Celery Worker**:
  ```bash
  celery -A celery_worker.celery_app worker --loglevel=info
  ```
