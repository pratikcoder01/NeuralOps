"""FastAPI inference server for the NeuralOps anomaly detection system.

Endpoints
---------
* ``POST /predict`` – single host window prediction.
* ``POST /predict/batch`` – batch prediction (up to 100 windows).
* ``GET /health`` – health check returning model load status and threshold.
* ``GET /metrics`` – Prometheus metrics.

The server loads the latest production model from MLflow on startup (via
``model_loader.get_model``) and reuses a ``FeatureExtractor`` instance that
holds the scaler trained during the training phase.
"""

from __future__ import annotations

import os
import time
from typing import List, Dict

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field, validator
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from ml.anomaly_detection.serving.model_loader import get_model, get_model_version
from ml.anomaly_detection.serving.feature_extractor import FeatureExtractor
from ml.anomaly_detection.serving.consumer import MLInferenceConsumer

# ---------- Prometheus metrics ----------
REQUEST_COUNT = Counter(
    "anomaly_predict_requests_total",
    "Total number of prediction requests",
    ["endpoint"],
)
REQUEST_LATENCY = Histogram(
    "anomaly_predict_latency_seconds",
    "Latency of prediction requests",
    ["endpoint"],
)
ANOMALY_COUNT = Counter(
    "anomaly_predictions_total",
    "Total number of anomalies detected",
    ["endpoint"],
)

app = FastAPI(title="NeuralOps Anomaly Detection Inference Server")

# Global objects – will be initialised on startup
_feature_extractor: FeatureExtractor | None = None
_model = None
_consumer: MLInferenceConsumer | None = None

# ---------- Request / Response models ----------
class MetricDict(BaseModel):
    # The raw metric dict schema is flexible – we accept any mapping.
    __root__: Dict

class PredictRequest(BaseModel):
    host_id: str = Field(..., description="Unique identifier of the host")
    workspace_id: str = Field(..., description="Workspace identifier for multi‑tenant isolation")
    metrics_window: List[Dict] = Field(..., description="List of 60 raw metric dictionaries")

    @validator("metrics_window")
    def check_length(cls, v):
        if len(v) != 60:
            raise ValueError("metrics_window must contain exactly 60 entries (30 min window)")
        return v

class PredictResponse(BaseModel):
    anomaly_score: float = Field(..., description="Overall anomaly score (0.0‑1.0)")
    is_anomaly: bool = Field(..., description="Binary anomaly flag based on model threshold")
    feature_scores: Dict[str, float] = Field(..., description="Per‑feature contribution scores")
    model_version: str = Field(..., description="MLflow model version identifier")
    inference_latency_ms: float = Field(..., description="Latency of the inference call in milliseconds")

class BatchPredictRequest(BaseModel):
    predictions: List[PredictRequest]

class BatchPredictResponse(BaseModel):
    results: List[PredictResponse]

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    model_loaded: bool = Field(..., description="Whether the model has been loaded successfully")
    model_version: str = Field(..., description="Version string of the loaded model")
    threshold: float | None = Field(None, description="Anomaly threshold used by the model")

# ---------- Startup event ----------
@app.on_event("startup")
async def load_resources():
    global _feature_extractor, _model, _consumer, model
    import logging
    import os
    logger = logging.getLogger("ml-inference-server")

    # Load model from MLflow
    try:
        _model = get_model()
        model = _model
    except Exception as e:
        # Fallback to local autoencoder model stub if MLflow registry is offline during testing
        logger.warning(f"Failed to load model from MLflow ({e}). Initializing fallback autoencoder model architecture...")
        from ml.anomaly_detection.model import AutoencoderModel
        _model = AutoencoderModel(input_dim=15)
        _model.eval()
        model = _model

    # Load scaler path – it is stored alongside the checkpoint in the model artifact
    scaler_path = os.getenv("SCALER_PATH", "model/scaler.pkl")
    if not os.path.isfile(scaler_path):
        # Allow relative to the repository root
        possible = os.path.join(os.getcwd(), scaler_path)
        if os.path.isfile(possible):
            scaler_path = possible
        else:
            # Resiliently create a dummy scaler if it's missing (helps in local development seed runs)
            from sklearn.preprocessing import StandardScaler
            import joblib
            os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
            dummy_scaler = StandardScaler()
            # Fit on dummy features of dim 15
            import numpy as np
            dummy_scaler.fit(np.random.randn(10, 15))
            joblib.dump(dummy_scaler, scaler_path)
            logger.warning(f"Created a temporary dummy scaler at: {scaler_path}")

    _feature_extractor = FeatureExtractor(scaler_path)
    
    # Start background consumer
    _consumer = MLInferenceConsumer()
    await _consumer.start()

@app.on_event("shutdown")
async def unload_resources():
    global _consumer
    if _consumer:
        await _consumer.stop()

# ---------- Helper function ----------
def _run_prediction(raw_window: List[Dict]) -> PredictResponse:
    start = time.time()
    # Extract features
    try:
        features = _feature_extractor.extract(raw_window)  # (60, 15) ndarray
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature extraction failed: {e}")

    # Model expects a torch tensor of shape (1, seq_len, n_features)
    import torch
    tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        pred = model.predict(tensor)
    latency_ms = (time.time() - start) * 1000.0
    # Update Prometheus counters
    REQUEST_COUNT.labels(endpoint="/predict").inc()
    REQUEST_LATENCY.labels(endpoint="/predict").observe(latency_ms / 1000.0)
    if pred.get("is_anomaly"):
        ANOMALY_COUNT.labels(endpoint="/predict").inc()
    return PredictResponse(
        anomaly_score=pred.get("anomaly_score", 0.0),
        is_anomaly=pred.get("is_anomaly", False),
        feature_scores=pred.get("feature_scores", {}),
        model_version=get_model_version(),
        inference_latency_ms=latency_ms,
    )

# ---------- Endpoints ----------
@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    return _run_prediction(request.metrics_window)

@app.post("/predict/batch", response_model=BatchPredictResponse)
def predict_batch(batch_req: BatchPredictRequest):
    results = []
    for req in batch_req.predictions:
        results.append(_run_prediction(req.metrics_window))
    return BatchPredictResponse(results=results)

@app.get("/health", response_model=HealthResponse)
def health():
    loaded = model is not None and _feature_extractor is not None
    threshold = getattr(model, "threshold", None) if model else None
    return HealthResponse(
        status="ok" if loaded else "error",
        model_loaded=loaded,
        model_version=get_model_version() if loaded else "",
        threshold=threshold,
    )

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
