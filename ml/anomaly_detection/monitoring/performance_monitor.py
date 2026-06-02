"""Performance monitoring for the anomaly detection inference service.

Tracks:
- Inference latency distribution (Prometheus histogram)
- Anomaly rate over time (Prometheus counter)
- Prediction score distribution (histogram)
- Optionally persists daily aggregates to PostgreSQL for long‑term trend analysis.
"""

from prometheus_client import Counter, Histogram
from datetime import datetime
import numpy as np

# Prometheus metrics – register at import time
INFERENCE_LATENCY = Histogram(
    "anomaly_inference_latency_seconds",
    "Latency of anomaly detection inference calls",
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)
ANOMALY_COUNTER = Counter(
    "anomaly_predictions_total",
    "Total number of predictions flagged as anomalies",
)
SCORE_HISTOGRAM = Histogram(
    "anomaly_score_distribution",
    "Distribution of anomaly scores (0‑1)",
    buckets=[i/20 for i in range(21)],
)

# Optional PostgreSQL persistence (lightweight example)
try:
    from sqlalchemy import create_engine, Table, Column, String, Float, Date, MetaData, insert
    _engine = None
    _metadata = MetaData()
    _daily_table = Table(
        "anomaly_performance_daily",
        _metadata,
        Column("date", Date, primary_key=True),
        Column("avg_latency", Float),
        Column("p95_latency", Float),
        Column("anomaly_rate", Float),
        Column("mean_score", Float),
    )
except Exception:
    _engine = None


def record_inference(latency_seconds: float, anomaly: bool, score: float):
    """Record a single inference observation.

    Parameters
    ----------
    latency_seconds: float – elapsed time of the inference call.
    anomaly: bool – whether the model flagged the window as anomalous.
    score: float – the continuous anomaly score (0‑1).
    """
    INFERENCE_LATENCY.observe(latency_seconds)
    SCORE_HISTOGRAM.observe(score)
    if anomaly:
        ANOMALY_COUNTER.inc()
    # Persist to DB if configured (batch insert could be added for efficiency)
    if _engine:
        today = datetime.utcnow().date()
        # Simple upsert – replace existing row for the day
        stmt = insert(_daily_table).values(
            date=today,
            avg_latency=latency_seconds,  # placeholder – real implementation would aggregate
            p95_latency=latency_seconds,
            anomaly_rate=1.0 if anomaly else 0.0,
            mean_score=score,
        ).on_conflict_do_update(
            index_elements=["date"],
            set_={
                "avg_latency": latency_seconds,
                "p95_latency": latency_seconds,
                "anomaly_rate": (ANOMALY_COUNTER._value.get()),
                "mean_score": score,
            },
        )
        with _engine.begin() as conn:
            conn.execute(stmt)
