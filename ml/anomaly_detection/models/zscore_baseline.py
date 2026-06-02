import numpy as np
from collections import deque

class ZscoreBaseline:
    ""
    Rolling z-score anomaly detector for fast, always-on baseline check

    Architecture:
      - Maintains rolling window statistics per feature
      - Computes z-score for current value
      - Returns normalized anomaly score 0.0-1.0
      - No training required
    ""

    def __init__(self, window_size: int = 1000, threshold: float = 3.0):
        self.window_size = window_size
        self.threshold = threshold
        self.feature_stats = {}  # feature_name -> {mean, std, values_deque}

    def update(self, features: dict) -> None:
        ""
        Update rolling statistics with new feature values
        """
        for name, value in features.items():
            if name not in self.feature_stats:
                self.feature_stats[name] = {
                    "mean": 0.0,
                    "std": 1.0,
                    "values": deque(maxlen=self.window_size)
                }
            self.feature_stats[name]["values"].append(value)
            # Update running statistics
            values = list(self.feature_stats[name]["values"])
            self.feature_stats[name]["mean"] = np.mean(values)
            self.feature_stats[name]["std"] = np.std(values) + 1e-8

    def score(self, features: dict) -> float:
        ""
        Compute anomaly score for current features (0.0-1.0)
        """
        max_zscore = 0.0
        for name, value in features.items():
            if name in self.feature_stats:
                stats = self.feature_stats[name]
                zscore = abs(value - stats["mean"]) / stats["std"]
                max_zscore = max(max_zscore, zscore)
        # Normalize to 0.0-1.0 (cap at threshold)
        return min(max_zscore / self.threshold, 1.0)

    def get_feature_scores(self, features: dict) -> dict:
        ""
        Return per-feature z-scores
        """
        scores = {}
        for name, value in features.items():
            if name in self.feature_stats:
                stats = self.feature_stats[name]
                zscore = abs(value - stats["mean"]) / stats["std"]
                scores[name] = min(zscore / self.threshold, 1.0)
            else:
                scores[name] = 0.0
        return scores