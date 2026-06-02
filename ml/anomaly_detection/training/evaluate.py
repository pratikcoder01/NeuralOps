"""Evaluation utilities for the NeuralOps anomaly detection model.

The script loads a trained ``AnomalyTransformer`` checkpoint (including the
scaler and threshold) and computes standard classification metrics on a labeled
test set.
"""

import argparse
import pathlib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    classification_report,
)

from ml.anomaly_detection.models.transformer_autoencoder import AnomalyTransformer
from ml.anomaly_detection.data.preprocessing import Preprocessor


def load_checkpoint(path: pathlib.Path) -> dict:
    return torch.load(str(path), map_location="cpu")


def load_parquet(path: pathlib.Path) -> np.ndarray:
    df = pd.read_parquet(path)
    # Expect columns: "window" (list of list) and "label" (0/1)
    windows = np.stack(df["window"].values).astype(np.float32)
    labels = df["label"].values.astype(int)
    return windows, labels


def evaluate(
    model: AnomalyTransformer,
    scaler: Preprocessor,
    X: np.ndarray,
    y: np.ndarray,
) -> dict:
    model.eval()
    X_scaled = scaler.transform(X)
    with torch.no_grad():
        preds = model.predict(torch.tensor(X_scaled))
    # preds dict contains ``anomaly_score`` and ``is_anomaly``
    y_pred = np.array([int(p["is_anomaly"]) for p in preds])
    y_score = np.array([p["anomaly_score"] for p in preds])

    metrics = {
        "accuracy": accuracy_score(y, y_pred),
        "precision": precision_score(y, y_pred, zero_division=0),
        "recall": recall_score(y, y_pred, zero_division=0),
        "f1": f1_score(y, y_pred, zero_division=0),
        "auc_roc": roc_auc_score(y, y_score),
        "classification_report": classification_report(y, y_pred, zero_division=0),
    }
    return metrics


def main(args: argparse.Namespace) -> None:
    ckpt = load_checkpoint(pathlib.Path(args.checkpoint))
    model = AnomalyTransformer(input_dim=ckpt["input_dim"])
    model.load_state_dict(ckpt["model_state"])
    model.threshold = ckpt.get("threshold", 0.0)

    scaler = Preprocessor()
    scaler.load(args.scaler_path)

    X_test, y_test = load_parquet(pathlib.Path(args.test_path))
    metrics = evaluate(model, scaler, X_test, y_test)

    # Print human‑readable summary
    print("=== Evaluation Summary ===")
    for k, v in metrics.items():
        if k == "classification_report":
            print(v)
        else:
            print(f"{k}: {v:.4f}")

    # Optionally dump JSON for downstream pipelines
    if args.output_json:
        import json
        with open(args.output_json, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"Metrics saved to {args.output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate AnomalyTransformer model")
    parser.add_argument("--checkpoint", type=str, required=True, help="Path to model checkpoint (.pt)")
    parser.add_argument("--scaler-path", type=str, required=True, help="Path to saved scaler.pkl")
    parser.add_argument("--test-path", type=str, required=True, help="Parquet file with test windows and labels")
    parser.add_argument("--output-json", type=str, default=None, help="Optional JSON output file for metrics")
    args = parser.parse_args()
    main(args)