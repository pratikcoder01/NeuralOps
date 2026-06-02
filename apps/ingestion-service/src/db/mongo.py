import logging
from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

logger = logging.getLogger(__name__)

class MongoClientManager:
    """Async MongoDB client manager wrapper."""
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db = None

    def connect(self):
        logger.info("Initializing async MongoDB (Motor) connection pool...")
        self.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000
        )
        # Extract database name from URI, default to 'neuralops'
        db_name = settings.MONGO_URI.split("/")[-1].split("?")[0] or "neuralops"
        self.db = self.client[db_name]
        logger.info(f"MongoDB connection active. Namespace: {db_name}")

    def close(self):
        if self.client:
            logger.info("Closing MongoDB connection pool...")
            self.client.close()
            self.client = None
            self.db = None

mongo_manager = MongoClientManager()

def get_mongo_db():
    """Returns Motor database instance."""
    if mongo_manager.db is None:
        mongo_manager.connect()
    return mongo_manager.db
