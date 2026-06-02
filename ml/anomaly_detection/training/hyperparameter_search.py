"""Hyperparameter optimization using Optuna for the anomaly detection model.

The study optimises the following parameters:
- latent_dim (int): size of the bottleneck representation
- n_heads (int): number of attention heads
- num_layers (int): number of encoder/decoder layers
- learning_rate (float)
- weight_decay (float)
- batch_size (int)

The objective function trains the model for a limited number of epochs on a
validation split and returns the validation F1 score (higher is better).
"""

import os
import pathlib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import optuna

from ml.anomaly_detection.models.transformer_autoencoder import AnomalyTransformer
from ml.anomaly_detection.data.dataset import build_dataloaders
from ml.anomaly_detection.data.preprocessing import Preprocessor

# Helper to load data (reuse the same function as training)
def _load_data(train_path: pathlib.Path, val_path: pathlib.Path):
    df_train = pd.read_parquet(train_path)
    df_val = pd.read_parquet(val_path)
    X_train = np.stack(df_train["window"].values).astype(np.float32)
    X_val = np.stack(df_val["window"].values).astype(np.float32)
    return X_train, X_val


def _objective(trial: optuna.trial.Trial) -> float:
    # Hyper‑parameters to search
    latent_dim = trial.suggest_int("latent_dim", 16, 64, step=16)
    n_heads = trial.suggest_categorical("n_heads", [2, 4, 8])
    num_layers = trial.suggest_int("num_layers", 2, 5)
    lr = trial.suggest_loguniform("lr", 1e-5, 1e-3)
    weight_decay = trial.suggest_loguniform("weight_decay", 1e-6, 1e-4)
    batch_size = trial.suggest_categorical("batch_size", [16, 32, 64])

    # Paths – these are expected to be set via env vars for flexibility
    train_path = pathlib.Path(os.getenv("TRAIN_DATA_PATH", "data/train.parquet"))
    val_path = pathlib.Path(os.getenv("VAL_DATA_PATH", "data/val.parquet"))

    X_train, X_val = _load_data(train_path, val_path)

    # Preprocess / scale
    preprocessor = Preprocessor()
    preprocessor.fit(X_train)
    X_train_scaled = preprocessor.transform(X_train)
    X_val_scaled = preprocessor.transform(X_val)

    train_loader, val_loader = build_dataloaders(
        X_train_scaled, X_val_scaled, batch_size=batch_size
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AnomalyTransformer(
        input_dim=X_train.shape[2],
        latent_dim=latent_dim,
        n_heads=n_heads,
        n_layers=num_layers,
    ).to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)

    # Simple training loop – limited epochs for speedy HPO
    epochs = 10
    for epoch in range(epochs):
        model.train()
        for batch in train_loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            recon = model(batch)
            loss = criterion(recon, batch)
            loss.backward()
            optimizer.step()
        scheduler.step()

    # Validation – compute per‑sample MSE and derive a threshold
    model.eval()
    all_scores = []
    all_labels = []
    # Load labels from the original parquet (assumes a "label" column)
    df_val = pd.read_parquet(val_path)
    labels = df_val["label"].values.astype(int)
    with torch.no_grad():
        for i, batch in enumerate(val_loader):
            batch = batch.to(device)
            recon = model(batch)
            mse = ((recon - batch) ** 2).mean(dim=[1, 2]).cpu().numpy()
            all_scores.extend(mse)
    # Convert scores into binary predictions using mean+3*std as threshold
    thresh = np.mean(all_scores) + 3 * np.std(all_scores)
    preds = (np.array(all_scores) > thresh).astype(int)
    # Compute F1 (Optuna tries to *maximize* the returned value)
    tp = np.sum((preds == 1) & (labels == 1))
    fp = np.sum((preds == 1) & (labels == 0))
    fn = np.sum((preds == 0) & (labels == 1))
    precision = tp / (tp + fp + 1e-8)
    recall = tp / (tp + fn + 1e-8)
    f1 = 2 * precision * recall / (precision + recall + 1e-8)
    return f1


def run_study(n_trials: int = 30, study_name: str = "anomaly_hpo") -> optuna.Study:
    study = optuna.create_study(
        direction="maximize",
        study_name=study_name,
        sampler=optuna.samplers.TPESampler(seed=42),
    )
    study.optimize(_objective, n_trials=n_trials)
    print("Best trial: ")
    print(study.best_trial)
    return study

if __name__ == "__main__":
    run_study()
