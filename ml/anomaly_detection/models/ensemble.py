import numpy as np
from typing import Dict, Literal

from .transformer_autoencoder import AnomalyTransformer
from .isolation_forest import IsolationForestWrapper
from .zscore_baseline import ZscoreBaseline


class EnsembleResult:
    """
    Result container returned by EnsembleDetector.
    """
    def __init__(self,
                 total_score: float,
                 transformer_score: float,
                 isolation_score: float,
                 zscore_score: float):
        self.total_score = total_score
        self.transformer_score = transformer_score
        self.isolation_score = isolation_score
        self.zscore_score = zscore_score


class EnsembleDetector:
    """
    Ensemble detector that combines three anomaly detection models:
      • Transformer auto‑encoder (sequence‑level)
      • Isolation Forest (point‑level)
      • Rolling Z‑score baseline (fast)

    The default weighting scheme is:
        transformer – 0.6
        isolation – 0.3
        z‑score   – 0.1

    These weights can be overridden via the constructor arguments.
    """

    def __init__(
        self,
        transformer: AnomalyTransformer,
        isolation_forest: IsolationForestWrapper,
        zscore: ZscoreBaseline,
        transformer_weight: float = 0.6,
        isolation_weight: float = 0.3,
        zscore_weight: float = 0.1,
    ):
        self.transformer = transformer
        self.isolation_forest = isolation_forest
        self.zscore = zscore

        self.transformer_weight = transformer_weight
        self.isolation_weight = isolation_weight
        self.zscore_weight = zscore_weight
        # Normalise weights so they always sum to 1
        total_weight = (
            self.transformer_weight
            + self.isolation_weight
            + self.zscore_weight
        )
        if total_weight == 0:
            raise ValueError("At least one weight must be > 0")
        self.transformer_weight_norm = self.transformer_weight / total_weight
        self.isolation_weight_norm = self.isolation_weight / total_weight
        self.zscore_weight_norm = self.zscore_weight / total_weight

    def score(self, window: np.ndarray) -> EnsembleResult:
        """
        Compute a unified anomaly score from the three sub‑detectors.

        Parameters
        ----------
        window : np.ndarray
            Shape ``(seq_len, n_features)`` – a single time‑window of metrics.

        Returns
        -------
        EnsembleResult
            Namedtuple‑like object with the aggregated score and the three
            component scores (all in the range ``[0.0, 1.0]``).
        """
        # ---------- Transformer auto‑encoder ----------
        # transformer expects (batch, seq_len, n_features); we batch‑dim = 1
        transformer_score = self.transformer.predict(window[None, :, :])[
            "anomaly_score"
        ]  # Already in [0, 1] range

        # ---------- Isolation Forest ----------
        # Works on last timestep only (point anomaly)
        isolation_score = self.isolation_forest.score(window[-1, :])  # <- float in [0,1]

        # ---------- Z‑score baseline ----------
        # Build a dict of feature values and score each feature
        zscore_scores = self.zscore.score(
            {
                f"f{i}": window[:, i] for i in range(window.shape[1])
            }
        )  # Returns a dict; we take the max as the overall score
        # Convert dict to a single float (max of per‑feature normalized scores)
        zscore_score = max(zscore_scores.values()) if zscore_scores else 0.0

        # ---------- Weighted aggregation ----------
        total_score = (
            self.transformer_weight_norm * transformer_score
            + self.isolation_weight_norm * isolation_score
            + self.zscore_weight_norm * zscore_score
        )

        return EnsembleResult(
            total_score=total_score,
            transformer_score=transformer_score,
            isolation_score=isolation_score,
            zscore_score=zscore_score,
        )