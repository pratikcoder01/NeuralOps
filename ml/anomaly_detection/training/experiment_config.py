"""Experiment configuration dataclass for the anomaly detection training pipeline.

All hyper‑parameters are stored here so they can be reproduced via MLflow
logging and Optuna tuning. The dataclass is JSON‑serialisable via the
``asdict`` helper from ``dataclasses``.
"""

from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ExperimentConfig:
    # Model architecture
    input_dim: int = 15          # number of features per timestep
    seq_len: int = 60            # timesteps per window
    latent_dim: int = 32
    n_heads: int = 4
    num_layers: int = 3

    # Training hyper‑parameters
    epochs: int = 50
    batch_size: int = 32
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    early_stop_patience: int = 10
    scheduler_T_0: int = 10      # CosineAnnealingLR T_0

    # Data handling
    train_data_path: str = "data/train.parquet"
    val_data_path: str = "data/val.parquet"
    scaler_path: str = "model/scaler.pkl"

    # MLflow
    experiment_name: str = "anomaly_detection_experiment"
    run_name: Optional[str] = None

    def to_dict(self) -> dict:
        """Return a plain dict suitable for logging to MLflow or Optuna."""
        return asdict(self)