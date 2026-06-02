import asyncio
import pytest
import uuid
import time
import sqlite3
import json
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.main import app
from src.db.postgres import get_async_db
from src.models.base import Base
from src.core.security import hash_password
from src.core.rbac import UserRole

# Register global sqlite3 adapters for list serialization during unit tests
sqlite3.register_adapter(list, json.dumps)
from src.models.workspace import Workspace
from src.models.user import User
import src.models.host
import src.models.incident
import src.models.remediation_action
import src.models.audit_log

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import ARRAY as ABSTRACT_ARRAY, BigInteger as ABSTRACT_BIGINT
from sqlalchemy.dialects.postgresql import JSONB, ARRAY as PG_ARRAY, BIGINT as PG_BIGINT

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    return "TEXT"

@compiles(ABSTRACT_ARRAY, "sqlite")
@compiles(PG_ARRAY, "sqlite")
def compile_array_sqlite(element, compiler, **kw):
    return "TEXT"

@compiles(ABSTRACT_BIGINT, "sqlite")
@compiles(PG_BIGINT, "sqlite")
def compile_bigint_sqlite(element, compiler, **kw):
    return "INTEGER"

# Use SQLite in-memory with aiosqlite for extremely fast and isolated unit testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Mock databases managers to bypass external clusters during testing
class MockRedis:
    def __init__(self):
        self.store = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value: str, ex=None, nx=False):
        if nx and key in self.store:
            return False
        self.store[key] = value
        return True

    async def setex(self, key: str, seconds: int, value: str):
        self.store[key] = value
        return True

    async def ping(self):
        return True

    async def close(self):
        pass

    def pipeline(self):
        return MockRedisPipeline(self)

class MockRedisPipeline:
    def __init__(self, mock_redis):
        self.redis = mock_redis
        self.commands = []

    def zremrangebyscore(self, *args, **kwargs):
        self.commands.append(("zrem", args))
        return self

    def zadd(self, key, mapping):
        self.commands.append(("zadd", (key, mapping)))
        return self

    def zcard(self, key):
        self.commands.append(("zcard", key))
        return self

    def expire(self, *args, **kwargs):
        return self

    async def execute(self):
        # Always return mock index hits well below rate thresholds
        return [0, True, 5]

class MockMongoCollection:
    async def insert_one(self, document):
        return True

class MockMongo:
    def __getitem__(self, name):
        return MockMongoCollection()

    async def command(self, name):
        return {"ok": 1.0}

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Initializes in-memory database tables on test session startup."""
    async with test_engine.begin() as conn:
        # Create all tables cleanly
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh isolated database transaction session for each test run."""
    async with TestingSessionLocal() as session:
        from sqlalchemy import text
        # Truncate all tables cleanly in dependency order (reversed)
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(text(f"DELETE FROM {table.name}"))
        await session.commit()
        
        yield session
        await session.rollback()

@pytest.fixture(autouse=True)
async def mock_external_clients(monkeypatch):
    """Mocks Redis, Mongo, and Kafka producer to run local unittests without side effects."""
    mock_redis = MockRedis()
    mock_mongo = MockMongo()
    
    # Patch Redis
    monkeypatch.setattr("src.db.redis.get_redis_client", lambda: mock_redis)
    monkeypatch.setattr("src.middleware.rate_limit.get_redis_client", lambda: mock_redis)
    monkeypatch.setattr("src.services.metrics_service.get_redis_client", lambda: mock_redis)
    
    # Patch Mongo
    monkeypatch.setattr("src.db.mongo.get_mongo_db", lambda: mock_mongo)
    
    # Patch Kafka
    monkeypatch.setattr("src.kafka.producer.kafka_producer.is_connected", True)
    async def mock_send(*args, **kwargs):
        return True
    monkeypatch.setattr("src.kafka.producer.kafka_producer.send_event", mock_send)

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Configures and yields a fully functional ASGI HTTP test client."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_async_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()

@pytest.fixture
async def seed_data(db_session: AsyncSession):
    """Utility fixture seeding an active workspace and users for standard authenticated calls."""
    ws_id = uuid.uuid4()
    ws = Workspace(
        id=ws_id,
        name="Test Core Space",
        slug="test-core-space",
        plan="free",
        host_limit=5
    )
    db_session.add(ws)
    await db_session.flush()

    user_id = uuid.uuid4()
    u = User(
        id=user_id,
        workspace_id=ws_id,
        email="alex@neuralops.com",
        name="Alex Mercer",
        role=UserRole.OWNER,
        password_hash=hash_password("testpassword123")
    )
    db_session.add(u)
    await db_session.commit()
    
    return {
        "workspace_id": ws_id,
        "user_id": user_id,
        "email": "alex@neuralops.com",
        "password": "testpassword123"
    }
