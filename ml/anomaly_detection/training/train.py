"""Training script for the NeuralOps anomaly detection Transformer.

CLI usage example::

    python -m ml.anomaly_detection.training.train \
        --epochs 30 \
        --batch-size 64 \
        --lr 1e-4 \
        --data-path data/train.parquet \
        --val-path data/val.parquet \
        --experiment-name anomaly_detection \
        --run-name "run-$(date +%s)"

The script:
1. Loads training/validation data from Parquet files (windows of shape (seq_len, n_features)).
2. Fits a ``StandardScaler`` on the training data (via ``Preprocessor``).
3. Builds PyTorch ``DataLoader`` objects.
4. Instantiates ``AnomalyTransformer`` with hyper‑parameters from ``ExperimentConfig``.
5. Trains with Adam optimiser, CosineAnnealingLR scheduler and early stopping.
6. Logs hyper‑parameters, loss curves and final metrics to MLflow.
7. Saves the best checkpoint (including model state and scaler) to ``model/``.
8. Computes a reconstruction‑error threshold on the validation set and stores it on the model.
"""

import argparse
import pathlib
import json
import os
import time
from typing import Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import mlflow
from mlflow import pytorch as mlflow_pytorch

# Local imports – ensure module path works when executed as script
from ml.anomaly_detection.data.dataset import build_dataloaders
from ml.anomaly_detection.data.preprocessing import Preprocessor
from ml.anomaly_detection.models.transformer_autoencoder import AnomalyTransformer
from ml.anomaly_detection.training.experiment_config import ExperimentConfig


def load_parquet(path: pathlib.Path) -> np.ndarray:
    """Load a Parquet file containing a 3‑D array (samples, seq_len, n_features).

    The file is expected to contain a single column ``window`` where each entry
    is a list of lists representing one window.  The function converts it to a
    NumPy ``float32`` array.
    """
    df = pd.read_parquet(path)
    # Assume the column is named "window"
    windows = np.stack(df["window"].values).astype(np.float32)
    return windows


def fit_scaler(preprocessor: Preprocessor, X_train: np.ndarray) -> Preprocessor:
    preprocessor.fit(X_train)
    return preprocessor


def train_model(
    model: AnomalyTransformer,
    train_loader: DataLoader,
    val_loader: DataLoader,
    config: ExperimentConfig,
    device: torch.device,
) -> Tuple[AnomalyTransformer, float]:
    """Train the transformer model with early stopping.

    Returns the best model (state restored) and the best validation loss.
    """
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config.scheduler_T_0)

    best_val_loss = float("inf")
    epochs_no_improve = 0
    best_state_dict = None

    model.to(device)
    model.train()

    for epoch in range(1, config.epochs + 1):
        epoch_losses = []
        for batch in train_loader:
            # batch shape: (batch, seq_len, n_features)
            batch = batch.to(device)
            optimizer.zero_grad()
            recon = model(batch)
            loss = criterion(recon, batch)
            loss.backward()
            optimizer.step()
            epoch_losses.append(loss.item())
        scheduler.step()

        # Validation
        model.eval()
        with torch.no_grad():
            val_losses = []
            for batch in val_loader:
                batch = batch.to(device)
                recon = model(batch)
                loss = criterion(recon, batch)
                val_losses.append(loss.item())
        avg_val = np.mean(val_losses)

        # Logging to MLflow (epoch‑level)
        mlflow.log_metric("train_loss", np.mean(epoch_losses), step=epoch)
        mlflow.log_metric("val_loss", avg_val, step=epoch)

        # Early stopping check
        if avg_val < best_val_loss:
            best_val_loss = avg_val
            best_state_dict = model.state_dict()
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1
        if epochs_no_improve >= config.early_stop_patience:
            mlflow.log_metric("early_stop_epoch", epoch)
            break
        model.train()

    # Load best weights
    if best_state_dict is not None:
        model.load_state_dict(best_state_dict)
    return model, best_val_loss


def compute_threshold(model: AnomalyTransformer, val_loader: DataLoader, device: torch.device) -> float:
    """Fit reconstruction‑error threshold on the validation set.

    Threshold = mean + 3 * std of per‑sample MSE.
    """
    model.eval()
    criterion = nn.MSELoss(reduction="none")
    losses = []
    with torch.no_grad():
        for batch in val_loader:
            batch = batch.to(device)
            recon = model(batch)
            # Compute per‑sample MSE across seq_len and features
            per_sample = criterion(recon, batch).mean(dim=[1, 2])  # shape (batch,)
            losses.extend(per_sample.cpu().numpy())
    losses = np.array(losses)
    threshold = losses.mean() + 3 * losses.std()
    model.threshold = float(threshold)
    return threshold


def main(args: argparse.Namespace) -> None:
    # Resolve paths
    data_path = pathlib.Path(args.data_path).resolve()
    val_path = pathlib.Path(args.val_path).resolve()
    model_dir = pathlib.Path("model").resolve()
    model_dir.mkdir(parents=True, exist_ok=True)

    # Load raw windows (assume parquet with column "window")
    X_train = load_parquet(data_path)
    X_val = load_parquet(val_path)

    # Preprocess / scale
    preprocessor = Preprocessor()
    X_train_scaled = fit_scaler(preprocessor, X_train)
    X_train_scaled = preprocessor.transform(X_train)
    X_val_scaled = preprocessor.transform(X_val)

    # Save scaler for inference
    scaler_path = model_dir / "scaler.pkl"
    preprocessor.save(str(scaler_path))

    # Build dataloaders
    train_loader, val_loader = build_dataloaders(
        X_train_scaled, X_val_scaled, batch_size=args.batch_size
    )

    # Model instantiation
    model = AnomalyTransformer(
        input_dim=args.input_dim,
        latent_dim=args.latent_dim,
        n_heads=args.nhead,
        n_layers=args.num_layers,
    )

    # MLflow setup
    mlflow.set_experiment(args.experiment_name)
    with mlflow.start_run(run_name=args.run_name) as run:
        # Log hyper‑parameters
        mlflow.log_params({
            "input_dim": args.input_dim,
            "seq_len": args.seq_len,
            "latent_dim": args.latent_dim,
            "n_heads": args.nhead,
            "num_layers": args.num_layers,
            "epochs": args.epochs,
            "batch_size": args.batch_size,
            "learning_rate": args.lr,
            "weight_decay": args.weight_decay,
        })

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        best_model, best_val = train_model(
            model, train_loader, val_loader,
            ExperimentConfig(
                input_dim=args.input_dim,
                seq_len=args.seq_len,
                latent_dim=args.latent_dim,
                n_heads=args.nhead,
                num_layers=args.num_layers,
                epochs=args.epochs,
                batch_size=args.batch_size,
                learning_rate=args.lr,
                weight_decay=args.weight_decay,
                early_stop_patience=args.patience,
                scheduler_T_0=args.scheduler_T_0,
                train_data_path=args.data_path,
                val_data_path=args.val_path,
                scaler_path=str(scaler_path),
            ),
            device,
        )

        # Compute threshold on validation set
        threshold = compute_threshold(best_model, val_loader, device)
        mlflow.log_metric("val_threshold", threshold)

        # Save checkpoint (including scaler path for convenience)
        checkpoint_path = model_dir / "checkpoint.pt"
        torch.save({
            "model_state": best_model.state_dict(),
            "scaler_path": str(scaler_path),
            "threshold": threshold,
            "input_dim": args.input_dim,
        }, str(checkpoint_path))
        mlflow.log_artifact(str(checkpoint_path), artifact_path="model")
        mlflow.log_artifact(str(scaler_path), artifact_path="model")

        # Log model to MLflow as a PyTorch model artifact
        mlflow_pytorch.log_model(best_model, "transformer_model")
        print(f"Training completed. Best val loss: {best_val:.6f}, threshold: {threshold:.6f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Anomaly Transformer model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--weight-decay", type=float, default=1e-5, help="Adam weight decay")
    parser.add_argument("--patience", type=int, default=10, help="Early‑stop patience")
    parser.add_argument("--scheduler-T-0", type=int, default=10, help="CosineAnnealingLR T_0")
    parser.add_argument("--input-dim", type=int, default=15, help="Feature dimension")
    parser.add_argument("--seq-len", type=int, default=60, help="Sequence length (timesteps)")
    parser.add_argument("--latent-dim", type=int, default=32, help="Latent dimension for bottleneck")
    parser.add_argument("--nhead", type=int, default=4, help="Transformer attention heads")
    parser.add_argument("--num-layers", type=int, default=3, help="Number of encoder/decoder layers")
    parser.add_argument("--data-path", type=str, required=True, help="Path to training Parquet file")
    parser.add_argument("--val-path", type=str, required=True, help="Path to validation Parquet file")
    parser.add_argument("--experiment-name", type=str, default="anomaly_detection", help="MLflow experiment name")
    parser.add_argument("--run-name", type=str, default=None, help="MLflow run name")

    args = parser.parse_args()
    main(args)