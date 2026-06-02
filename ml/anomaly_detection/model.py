import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import StandardScaler
from typing import Tuple, List, Union

class AutoencoderModel(nn.Module):
    """
    A PyTorch Autoencoder neural network model for multi-dimensional telemetry anomalies.
    Reconstructs normal metrics; high reconstruction loss indicates an anomaly.
    """
    def __init__(self, input_dim: int, latent_dim: int = 4):
        super(AutoencoderModel, self).__init__()
        # Encoder network
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, latent_dim),
            nn.ReLU()
        )
        # Decoder network
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim),
            nn.Sigmoid() # Restricts metrics between 0 and 1 (standardized)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

class AnomalyDetector:
    """
    Production wrapper integrating scaling, PyTorch models, and reconstruction
    loss-based scoring thresholds to classify cloud metric vectors.
    """
    def __init__(self, feature_dim: int, latent_dim: int = 4, threshold: float = 0.05):
        self.feature_dim = feature_dim
        self.model = AutoencoderModel(input_dim=feature_dim, latent_dim=latent_dim)
        self.scaler = StandardScaler()
        self.threshold = threshold
        self.criterion = nn.MSELoss(reduction='none')

    def fit(self, X: np.ndarray, epochs: int = 50, batch_size: int = 32, lr: float = 0.001):
        """
        Fits the scaler and trains the Autoencoder on normal baseline metrics.
        """
        # Fit scaling
        X_scaled = self.scaler.fit_transform(X)
        X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
        
        optimizer = optim.Adam(self.model.parameters(), lr=lr)
        self.model.train()
        
        for epoch in range(epochs):
            permutation = torch.randperm(X_tensor.size()[0])
            for i in range(0, X_tensor.size()[0], batch_size):
                indices = permutation[i:i+batch_size]
                batch_x = X_tensor[indices]
                
                optimizer.zero_grad()
                reconstructed = self.model(batch_x)
                loss = nn.MSELoss()(reconstructed, batch_x)
                loss.backward()
                optimizer.step()

        # Recalculate dynamic anomaly threshold based on 99th percentile of train loss
        self.model.eval()
        with torch.no_grad():
            preds = self.model(X_tensor)
            losses = torch.mean(self.criterion(preds, X_tensor), dim=1).numpy()
            self.threshold = float(np.percentile(losses, 99))
        print(f"Model trained successfully. Dynamic threshold set to: {self.threshold:.4f}")

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predicts if metric rows represent an anomaly.
        Returns: (is_anomaly: boolean array, reconstruction_losses: float array)
        """
        self.model.eval()
        X_scaled = self.scaler.transform(X)
        X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
        
        with torch.no_grad():
            reconstructed = self.model(X_tensor)
            # Element-wise mean square error reconstruction loss
            elemental_losses = self.criterion(reconstructed, X_tensor)
            losses = torch.mean(elemental_losses, dim=1).numpy()
            
        anomalies = losses > self.threshold
        return anomalies, losses

    def save_checkpoint(self, path: str):
        torch.save({
            'model_state': self.model.state_dict(),
            'scaler': self.scaler,
            'threshold': self.threshold
        }, path)

    def load_checkpoint(self, path: str):
        checkpoint = torch.load(path)
        self.model.load_state_dict(checkpoint['model_state'])
        self.scaler = checkpoint['scaler']
        self.threshold = checkpoint['threshold']
