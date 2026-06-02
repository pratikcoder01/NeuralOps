# Alerting Service

An Apollo GraphQL server built with **Node.js** and **TypeScript** that structures, queries, and dispatches incident alert payloads, integrating with MongoDB for historical audit trailing.

## GraphQL API Endpoint
- **GraphQL playground**: `http://localhost:4000/`

### Sample Query (Fetch alerts)
```graphql
query GetAlerts {
  alerts {
    id
    hostname
    severity
    triggerName
    message
    status
    createdAt
  }
}
```

### Sample Mutation (Create and trigger alert)
```graphql
mutation TriggerAlert {
  createAlert(
    hostname: "k8s-node-primary-01",
    severity: CRITICAL,
    triggerName: "high_cpu_utilization",
    message: "CPU usage at 98.4%"
  ) {
    id
    status
  }
}
```
