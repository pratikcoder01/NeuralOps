"""Singleton model loader for the AnomalyTransformer.

The loader reads the latest production model from the MLflow model registry.
It caches the model and scaler in memory so that the FastAPI endpoint can
reuse them across requests without re‑loading from disk.
"""

import os
import threading
from typing import Optional
import mlflow
import torch

from ml.anomaly_detection.models.transformer_autoencoder import AnomalyTransformer

# Global variables for the singleton pattern
_MODEL_LOCK = threading.Lock()
_MODEL_INSTANCE: Optional[AnomalyTransformer] = None
_SCALER_INSTANCE = None  # Loaded via the FeatureEngineer inside the endpoint
_MODEL_VERSION: Optional[str] = None


def _load_model_from_mlflow(uri: str) -> AnomalyTransformer:
    """Load the latest "Production" model version from MLflow.

    The ``uri`` should be something like ``models:/AnomalyDetector/Production``.
    The function returns a fully initialised ``AnomalyTransformer`` ready for
    inference, with its internal ``threshold`` attribute set from the checkpoint.
    """
    # mlflow.pytorch.load_model returns a torch.nn.Module instance
    model: AnomalyTransformer = mlflow.pytorch.load_model(uri)
    return model


def get_model() -> AnomalyTransformer:
    """Thread‑safe accessor for the cached model.

    If the model has not been loaded yet, it will be retrieved from the MLflow
    registry using the ``MLFLOW_MODEL_URI`` environment variable.
    """
    global _MODEL_INSTANCE, _MODEL_VERSION
    if _MODEL_INSTANCE is not None:
        return _MODEL_INSTANCE

    with _MODEL_LOCK:
        if _MODEL_INSTANCE is None:
            model_uri = os.getenv("MLFLOW_MODEL_URI")
            if not model_uri:
                raise EnvironmentError("MLFLOW_MODEL_URI env var not set for model loading")
            _MODEL_INSTANCE = _load_model_from_mlflow(model_uri)
            _MODEL_VERSION = model_uri
    return _MODEL_INSTANCE

def get_model_version() -> str:
    """Return a human‑readable version identifier for the loaded model."""
    if _MODEL_VERSION is None:
        return "unloaded"
    return _MODEL_VERSION
