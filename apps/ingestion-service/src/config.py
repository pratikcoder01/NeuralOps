import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "NeuralOps Ingestion Service"
    ENV: str = "production"
    DEBUG: bool = False
    
    # DB Connectivity
    # Overwrite postgres driver for async connection: postgresql+asyncpg://...
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://neuralops:neuralops@localhost:5432/neuralops",
        validation_alias="DATABASE_URL"
    )
    MONGO_URI: str = Field(default="mongodb://localhost:27017/neuralops")
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="localhost:9092")

    # JWT Configs
    JWT_SECRET: str = Field(default="super-secret-jwt-signing-key-change-in-production-12345")
    JWT_REFRESH_SECRET: str = Field(default="another-super-secret-refresh-key-change-in-production-67890")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Rate Limiting & security
    RATE_LIMIT_METRICS_PER_MIN: int = 1000
    RATE_LIMIT_STANDARD_PER_MIN: int = 100

    # Pydantic Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def sync_database_url(self) -> str:
        """Helper to get a sync driver URL for migration runs if needed."""
        url = self.DATABASE_URL
        if "postgresql+asyncpg://" in url:
            return url.replace("postgresql+asyncpg://", "postgresql://")
        return url

settings = Settings()
