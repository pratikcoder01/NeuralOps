import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import settings

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10
)

# Async session maker
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_async_db():
    """Dependency provider yielding async db sessions."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Postgres transaction rollback due to error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
