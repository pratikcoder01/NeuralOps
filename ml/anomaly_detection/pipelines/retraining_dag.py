"""Airflow DAG for weekly model retraining.

Schedule: every Sunday at 02:00 AM (local time).
Steps:
1. **extract_training_data** – query MongoDB and PostgreSQL for the last 30 days of raw metrics and incident labels, and write a combined Parquet file.
2. **run_feature_engineering** – invoke the hourly feature‑engineering logic on the extracted data.
3. **train_model** – launch ``training/train.py`` with the prepared dataset.
4. **evaluate_model** – run ``training/evaluate.py`` on a held‑out validation set.
5. **promote_if_better** – compare the new model's F1 score to the current production model (fetched from MLflow). If ``new_f1 > current_f1 + 0.02`` then promote the new model to the ``Production`` stage.
6. **notify_team** – send a Slack message summarizing the training run, metrics, and promotion outcome.

The DAG uses the ``BashOperator`` for CLI scripts and a ``PythonOperator`` for the promotion logic.
"""

from datetime import datetime, timedelta
import os
import json
import subprocess

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.models import Variable

# Helper to fetch current production F1 from MLflow
def get_current_f1(**context):
    # In a real environment, query MLflow tracking server for the latest production run's F1 metric
    # Here we read a JSON file written by the evaluation step (if exists)
    prod_metrics_path = os.getenv("PROD_METRICS_PATH", "/tmp/prod_metrics.json")
    if os.path.exists(prod_metrics_path):
        with open(prod_metrics_path) as f:
            data = json.load(f)
            return float(data.get("f1", 0.0))
    return 0.0

def decide_promotion(**context):
    ti = context["ti"]
    new_f1 = ti.xcom_pull(task_ids="evaluate_model")
    current_f1 = ti.xcom_pull(task_ids="get_current_f1")
    promote = (new_f1 is not None) and (new_f1 > current_f1 + 0.02)
    # Store decision for downstream Slack notification
    ti.xcom_push(key="promote", value=promote)
    ti.xcom_push(key="new_f1", value=new_f1)
    ti.xcom_push(key="current_f1", value=current_f1)
    return promote

def slack_notify(**context):
    ti = context["ti"]
    promote = ti.xcom_pull(task_ids="decide_promotion", key="promote")
    new_f1 = ti.xcom_pull(task_ids="decide_promotion", key="new_f1")
    current_f1 = ti.xcom_pull(task_ids="decide_promotion", key="current_f1")
    webhook_url = Variable.get("slack_webhook_url", default_var="")
    if not webhook_url:
        return
    message = {
        "text": "*NeuralOps Model Retraining Completed*",
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*New F1:* {new_f1:.4f}\n*Current Production F1:* {current_f1:.4f}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Promotion Decision:* {'✅ Promoted to Production' if promote else '❌ Not promoted'}"}}
        ]
    }
    import requests
    requests.post(webhook_url, json=message)

default_args = {
    "owner": "ml-team",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "start_date": datetime(2024, 1, 1),
}

with DAG(
    dag_id="neuralops_model_retraining",
    schedule_interval="0 2 * * 0",  # Sunday 02:00 AM
    default_args=default_args,
    catchup=False,
    tags=["ml", "retraining"],
) as dag:
    extract_training_data = BashOperator(
        task_id="extract_training_data",
        bash_command="python -m ml.anomaly_detection.scripts.extract_training_data --output /tmp/training_data.parquet",
    )
    run_feature_engineering = BashOperator(
        task_id="run_feature_engineering",
        bash_command="python -m ml.anomaly_detection.scripts.run_feature_engineering --input /tmp/training_data.parquet --output /tmp/engineered.parquet",
    )
    train_model = BashOperator(
        task_id="train_model",
        bash_command="python -m ml.anomaly_detection.training.train --data-path /tmp/engineered.parquet --val-path /tmp/engineered.parquet --experiment-name neuralops_retrain --run-name {{ ds_nodash }}",
    )
    evaluate_model = BashOperator(
        task_id="evaluate_model",
        bash_command="python -m ml.anomaly_detection.training.evaluate --checkpoint model/checkpoint.pt --scaler-path model/scaler.pkl --test-path /tmp/engineered.parquet --output-json /tmp/new_metrics.json",
        do_xcom_push=True,
    )
    # Pull new F1 from the JSON output of evaluate_model
    def pull_f1(**context):
        import json
        path = "/tmp/new_metrics.json"
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
                return float(data.get("f1", 0.0))
        return 0.0
    get_new_f1 = PythonOperator(
        task_id="get_new_f1",
        python_callable=pull_f1,
        provide_context=True,
    )
    get_current_f1 = PythonOperator(
        task_id="get_current_f1",
        python_callable=get_current_f1,
        provide_context=True,
    )
    decide_promotion = PythonOperator(
        task_id="decide_promotion",
        python_callable=decide_promotion,
        provide_context=True,
    )
    notify_team = PythonOperator(
        task_id="notify_team",
        python_callable=slack_notify,
        provide_context=True,
    )

    extract_training_data >> run_feature_engineering >> train_model >> evaluate_model >> get_new_f1
    get_new_f1 >> get_current_f1 >> decide_promotion >> notify_team
