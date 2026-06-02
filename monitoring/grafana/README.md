# Grafana Provisioning & Dashboards

This directory contains automatic datasource and dashboard configuration templates for bootstrapping Grafana.

## Setup
When Grafana launches in `docker-compose.yml`, it automatically loads definitions from `provisioning/`:
- **Datasources**: Automatically connects to the local Prometheus container on port `9090`.
- **Dashboards**: Configures ready-to-use panels detailing machine learning prediction latency, active anomalies count, and remediation trigger execution durations.
