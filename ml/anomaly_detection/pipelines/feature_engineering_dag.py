"""Airflow DAG for hourly feature engineering.

The DAG pulls the last 60 raw metric records for each host from MongoDB,
applies the ``FeatureEngineer`` to produce a (60, 15) NumPy array, and writes
the resulting windows to an S3 bucket (or local ``/tmp`` for dev) as Parquet.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
import os
import pandas as pd

# Import our internal utilities – ensure the Python path includes the repo root
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml.anomaly_detection.data.feature_engineering import FeatureEngineer
from ml.anomaly_detection.data.dataset import TimeSeriesDataset
from ml.anomaly_detection.data.preprocessing import Preprocessor

# Placeholder function to fetch raw metrics from MongoDB
def fetch_raw_metrics(**context):
    # In a real deployment this would query MongoDB for each host's last 60 entries
    # For now we return a dummy list of dicts – the FeatureEngineer can handle it
    from ml.anomaly_detection.data.synthetic_generator import _generate_normal_window
    raw = _generate_normal_window()
    return raw

def compute_and_store(**context):
    raw = context["ti"].xcom_pull(task_ids="fetch_raw")
    engineer = FeatureEngineer()
    features = engineer.compute_features(raw)
    # Convert to DataFrame for Parquet storage
    df = pd.DataFrame({"window": [features.tolist()]})
    # Destination – use an env var for bucket/prefix, fallback to local dir
    out_dir = os.getenv("FEATURE_OUTPUT_DIR", "/tmp/feature_engineering")
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    out_path = os.path.join(out_dir, f"features_{ts}.parquet")
    df.to_parquet(out_path, index=False)
    return out_path

default_args = {
    "owner": "ml-team",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "start_date": datetime(2024, 1, 1),
}

with DAG(
    dag_id="feature_engineering_hourly",
    schedule_interval="@hourly",
    default_args=default_args,
    catchup=False,
    tags=["ml", "feature"]
) as dag:
    fetch_raw = PythonOperator(
        task_id="fetch_raw",
        python_callable=fetch_raw_metrics,
        provide_context=True,
    )
    compute_store = PythonOperator(
        task_id="compute_and_store",
        python_callable=compute_and_store,
        provide_context=True,
    )
    fetch_raw >> compute_store
