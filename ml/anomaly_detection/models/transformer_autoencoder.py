import torch
import torch.nn as nn
from typing import Dict, List

class AnomalyTransformer(nn.Module):
    ""
    Transformer-based autoencoder for multivariate time-series anomaly detection.

    Architecture:
      Input: (batch_size, seq_len=60, n_features=15)
      Encoder: Linear projection → Positional encoding → TransformerEncoder (3 layers, 4 heads)
      Bottleneck: Mean pool across seq_len → Linear to latent_dim=32
      Decoder: Expand latent → Linear → TransformerDecoder (3 layers, 4 heads) → Linear to n_features
      Output: (batch_size, seq_len, n_features)  → reconstruction

    Anomaly score = MSE(input, reconstruction), per-sample
    Feature importance = MSE per feature dimension (which features are most off)
    Threshold = mean + 3*std of training reconstruction errors (fitted on normal data)
    ""

    - Use nn.TransformerEncoderLayer with batch_first=True
    - Implement sinusoidal PositionalEncoding
    - Implement fit_threshold(train_loader) method that sets self.threshold
    - Implement predict(x) → { anomaly_score: float, is_anomaly: bool, feature_scores: dict[str, float] }
    - Use torch.no_grad() in predict
    - Support loading from checkpoint: classmethod from_checkpoint(path)
    - Support export to ONNX for faster inference

    def __init__(self, input_dim: int, latent_dim: int = 32, n_heads: int = 4, n_layers: int = 3):
        super().__init__()
        # Encoder
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=input_dim, nhead=n_heads),
            num_layers=n_layers
        )
        # Bottleneck
        self.bottleneck = nn.Sequential(  # Convert to latent space
            nn.Linear(input_dim * 60, latent_dim),
            nn.ReLU()
        )
        # Decoder
        self.decoder = nn.TransformerDecoder(
            nn.TransformerDecoderLayer(d_model=latent_dim, nhead=n_heads),
            num_layers=n_layers
        )
        self.fc_out = nn.Linear(latent_dim, input_dim * 60)

    def forward(self, x: torch.Tensor) → torch.Tensor:
        """
        x: (batch_size, seq_len=60, n_features=15)
        """
        x = x.transpose(1, 2)  # (batch, n_features, seq_len)
        latent = self.encoder(x)
        latent = self.bottleneck(latent.mean(dim=2))  # Global mean pool
        decoded = self.decoder(latent.unsqueeze(1))  # Expand to seq_len
        decoded = self.fc_out(decoded.transpose(1, 2))  # (batch, seq_len, n_features)
        return decoded

    def fit_threshold(self, train_loader):
        """
        Fit threshold from training reconstruction errors
        """
        self.model.eval()
        losses = []
        with torch.no_grad():
            for batch in train_loader:
                reconstructed = self(batch)
                loss = nn.MSELoss()(reconstructed, batch)
                losses.extend(loss.cpu().numpy())
        self.threshold = np.mean(losses) + 3 * np.std(losses)

    def predict(self, x: torch.Tensor) → Dict[str, float | bool]:
        """
        Predict anomaly status and feature importance
        """
        self.model.eval()
        with torch.no_grad():
            reconstructed = self(x)
            loss = nn.MSELoss()(reconstructed, x)
            anomaly_score = loss.mean().item()
            feature_scores = {f"feature_{i}": loss[:, i].mean().item() for i in range(x.size(2))}
        return {
            "anomaly_score": anomaly_score,
            "is_anomaly": anomaly_score > self.threshold,
            "feature_scores": feature_scores
        }

    @classmethod
def from_checkpoint(cls, path):
        """
        Load model from checkpoint
        """
        checkpoint = torch.load(path)
        model = cls(input_dim=checkpoint["input_dim"])
        model.load_state_dict(checkpoint["state_dict"])
        model.threshold = checkpoint.get("threshold", 0.05)
        return model

    def export_to_onnx(self, path):
        """
        Export model to ONNX format
        """
        # Implementation would require Torch ONNX export code here
        raise NotImplementedError("ONNX export not implemented")