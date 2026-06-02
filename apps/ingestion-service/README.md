# Ingestion Service

An AI-powered ingestion microservice built with **FastAPI** to collect real-time cloud and host system metrics, persisting them structured in a PostgreSQL database and streaming them to a Kafka broker (`raw.metrics` topic) for pipeline analysis.

## Project Structure
- `main.py`: Entry point containing the endpoints for validation, persistence, and event emission.
- `alembic.ini`: Setup for SQLAlchemy schema migrations.
- `migrations/`: Version scripts for historical database state tracking.

## API Endpoints
- `GET /health`: Complete health status, verifying database & broker connections.
- `POST /ingest`: Process a validated JSON telemetry metric.
- `GET /metrics/recent`: Query the latest logged telemetry items.
