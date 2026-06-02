"""Utility for extracting features from raw metric dictionaries at inference time.

The transformer model expects a NumPy array of shape ``(seq_len=60, n_features=15)``.
This module wraps the existing ``FeatureEngineer`` implementation from the
``data`` package so that the FastAPI server can call a single ``extract``
function.
"""

from typing import List, Dict
import numpy as np

from ml.anomaly_detection.data.feature_engineering import FeatureEngineer


class FeatureExtractor:
    """Stateless wrapper around :class:`FeatureEngineer` for inference.

    The extractor creates a fresh ``FeatureEngineer`` instance, fits the scaler
    using a pre‑saved ``scaler.pkl`` (produced during training), and then
    transforms incoming raw metrics into the required feature matrix.
    """

    def __init__(self, scaler_path: str):
        self.engineer = FeatureEngineer()
        # Load the scaler that was persisted during training
        self.engineer.load_scaler(scaler_path)

    def extract(self, raw_metrics: List[Dict]) -> np.ndarray:
        """Convert a list of 60 raw metric dicts into a ``(60, 15)`` array.

        Parameters
        ----------
        raw_metrics: List[Dict]
            Each element corresponds to a 30‑second snapshot of the host's
            infrastructure metrics. The list must contain exactly 60 items.
        """
        if len(raw_metrics) != 60:
            raise ValueError(
                f"Expected 60 metric entries for a full window, got {len(raw_metrics)}"
            )
        features = self.engineer.compute_features(raw_metrics)
        # The `FeatureEngineer` already returns a NumPy array of shape (60, 15)
        # Apply the scaler to match the training distribution
        scaled = self.engineer.scaler.transform(features)
        return scaled
