"""Database configuration and connection management."""

from collections.abc import AsyncGenerator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from .config import settings


class Base(DeclarativeBase):
    """Base class for all database models.

    All database models should inherit from this base class to ensure
    consistent configuration and behavior across the application.
    """


# Create async engine with connection pooling
url = make_url(settings.DATABASE_URL)
pool_kwargs = (
    {
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
    }
    if url.get_backend_name() != "sqlite"
    else {}
)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    poolclass=NullPool if settings.DEBUG else None,
    **pool_kwargs,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db() -> None:
    """Initialize database and create tables."""
    # Import all models to ensure they are registered with the metadata
    import importlib
    import pkgutil

    try:
        models_pkg = importlib.import_module("models")
        if hasattr(models_pkg, "__path__"):
            for _, name, _ in pkgutil.walk_packages(
                models_pkg.__path__, models_pkg.__name__ + "."
            ):
                importlib.import_module(name)
    except ModuleNotFoundError:
        pass

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
