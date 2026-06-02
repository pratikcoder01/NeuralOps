"""Drift detection using Population Stability Index (PSI).

The detector compares the distribution of each feature in the current input
window to the reference distribution observed on the training data. PSI is
computed per feature using 10 equal‑frequency bins. Results are stored in a
PostgreSQL table ``drift_metrics`` (schema created on first run). If any
feature exceeds a PSI of 0.2 an ``action_required`` flag is raised.
"""

import numpy as np
import pandas as pd
from scipy.stats import entropy
from sqlalchemy import create_engine, Table, Column, String, Float, MetaData, insert, select
from datetime import datetime

# ------------------------------------------------------------
# Helper: compute PSI for a single feature
# ------------------------------------------------------------
def _psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """Return PSI between two 1‑D arrays.

    Expected and actual values are histogrammed into ``bins`` equal‑frequency
    bins (based on the expected distribution). Zero counts are replaced with a
    small epsilon to avoid division‑by‑zero or log‑of‑zero.
    """
    # Determine bin edges from expected distribution (percentiles)
    quantiles = np.linspace(0, 100, bins + 1)
    bin_edges = np.percentile(expected, quantiles)
    # Ensure unique edges
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) <= 1:
        # Degenerate case – treat as no drift
        return 0.0
    exp_counts, _ = np.histogram(expected, bins=bin_edges)
    act_counts, _ = np.histogram(actual, bins=bin_edges)
    # Convert to percentages
    exp_perc = exp_counts / exp_counts.sum()
    act_perc = act_counts / act_counts.sum()
    # Replace zeros with a tiny epsilon
    epsilon = 1e-6
    exp_perc = np.where(exp_perc == 0, epsilon, exp_perc)
    act_perc = np.where(act_perc == 0, epsilon, act_perc)
    psi_val = np.sum((act_perc - exp_perc) * np.log(act_perc / exp_perc))
    return float(psi_val)

# ------------------------------------------------------------
# DriftDetector class
# ------------------------------------------------------------
class DriftDetector:
    """Compute PSI drift scores and persist daily aggregates.

    Parameters
    ----------
    reference_path: str
        Path to a Parquet file containing training windows (used to compute the
        reference distribution for each feature). The file must have a ``window``
        column compatible with ``FeatureEngineer``.
    db_url: str
        SQLAlchemy database URL for PostgreSQL where drift metrics are stored.
    """

    def __init__(self, reference_path: str, db_url: str):
        self.reference_path = reference_path
        self.db_url = db_url
        self.engine = create_engine(db_url)
        self.metadata = MetaData()
        self.drift_table = Table(
            "drift_metrics",
            self.metadata,
            Column("date", String, primary_key=True),
            Column("feature", String, primary_key=True),
            Column("psi", Float),
        )
        self.metadata.create_all(self.engine)
        # Load reference data once
        self._load_reference()

    def _load_reference(self):
        df = pd.read_parquet(self.reference_path)
        # Each row is a window (list of lists). Stack to (samples, seq_len, n_feat)
        windows = np.stack(df["window"].values)
        # Collapse time dimension – treat each timestep as an independent sample
        self.reference_array = windows.reshape(-1, windows.shape[2])
        # Store per‑feature arrays for faster PSI calculation
        self.ref_features = {i: self.reference_array[:, i] for i in range(self.reference_array.shape[1])}

    def check_drift(self, current_data: np.ndarray) -> dict:
        """Calculate PSI for each feature and persist the daily scores.

        Parameters
        ----------
        current_data: np.ndarray
            Shape ``(samples, seq_len, n_features)`` – e.g. a batch of windows.
        Returns
        -------
        dict
            ``{"feature_psi": {...}, "max_psi": float, "action_required": bool}``
        """
        # Collapse time dimension similar to reference
        flat = current_data.reshape(-1, current_data.shape[2])
        feature_psi = {}
        max_psi = 0.0
        for i in range(flat.shape[1]):
            psi = _psi(self.ref_features[i], flat[:, i])
            feature_psi[f"f{i}"] = psi
            max_psi = max(max_psi, psi)
        action_required = max_psi > 0.2
        # Persist results (one row per feature per day)
        today = datetime.utcnow().strftime("%Y-%m-%d")
        with self.engine.begin() as conn:
            for fname, psi_val in feature_psi.items():
                stmt = insert(self.drift_table).values(date=today, feature=fname, psi=psi_val)
                # Upsert – on conflict update psi
                stmt = stmt.on_conflict_do_update(
                    index_elements=["date", "feature"], set_={"psi": psi_val}
                )
                conn.execute(stmt)
        return {"feature_psi": feature_psi, "max_psi": max_psi, "action_required": action_required}
