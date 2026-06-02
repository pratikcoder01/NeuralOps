import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

class IsolationForestWrapper:
    ""
    Wrapper around sklearn IsolationForest for point anomaly detection in time-series

    Architecture:
      - Uses last time step features only (point anomaly)
      - Standard scaling applied
      - Converts raw score to 0.0-1.0 range
      - Saves/loads with joblib
    ""

    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.model = IsolationForest(contamination=contamination, n_estimators=n_estimators)
        self.scaler = StandardScaler()
        self.contamination = contamination

    def fit(self, X: np.ndarray):
        ""
        Fit scaler and train IsolationForest
        """
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)

    def predict(self, X: np.ndarray) -> np.ndarray:
        ""
        Predict anomaly scores for a single time window (last timestep)
        """
        X_scaled = self.scaler.transform(X)
        raw_scores = self.model.predict(X_scaled)
        # Convert to 0.0-1.0 range (negative scores are anomalies)
        scores = (1 - (raw_scores + 1)) / 2  # Maps [-1,1] -> [0,1]
        return scores

    def save(self, path: str):
        joblib.dump({
            "model": self.model,
            "scaler": self.scaler
        }, path)

    @classmethod
def load(cls, path):
        data = joblib.load(path)
        wrapper = cls(contamination=data["model"]_.contamination)
        wrapper.scaler = data["scaler"]
        return wrapper