"""Database layer with SQLAlchemy, connection pooling, and migrations support."""

import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import QueuePool

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


class DatabaseConfig:
    """Database configuration management."""

    def __init__(self):
        # Database URL - support multiple backends
        self.database_url = self._get_database_url()

        # Connection pool settings
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "3600"))

        # Query settings
        self.query_timeout = int(os.getenv("DB_QUERY_TIMEOUT", "30"))
        self.slow_query_threshold = float(os.getenv("DB_SLOW_QUERY_THRESHOLD", "1.0"))

        # Migration settings
        self.migration_timeout = int(os.getenv("DB_MIGRATION_TIMEOUT", "300"))
        self.auto_migrate = os.getenv("DB_AUTO_MIGRATE", "false").lower() == "true"

        logger.info("Database configuration loaded", **self.to_dict())

    def _get_database_url(self) -> str:
        """Get database URL from environment with fallbacks."""
        # Check for full DATABASE_URL first
        if url := os.getenv("DATABASE_URL"):
            return url

        # Build from components
        db_type = os.getenv("DB_TYPE", "sqlite")

        if db_type == "sqlite":
            db_path = os.getenv("DB_PATH", "/tmp/mcp.db")
            return f"sqlite+aiosqlite:///{db_path}"

        elif db_type == "postgresql":
            host = os.getenv("DB_HOST", "localhost")
            port = os.getenv("DB_PORT", "5432")
            user = os.getenv("DB_USER", "mcp")
            password = os.getenv("DB_PASSWORD", "")
            database = os.getenv("DB_NAME", "mcp")
            return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}"

        elif db_type == "mysql":
            host = os.getenv("DB_HOST", "localhost")
            port = os.getenv("DB_PORT", "3306")
            user = os.getenv("DB_USER", "mcp")
            password = os.getenv("DB_PASSWORD", "")
            database = os.getenv("DB_NAME", "mcp")
            return f"mysql+aiomysql://{user}:{password}@{host}:{port}/{database}"

        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    def to_dict(self) -> dict[str, Any]:
        """Convert config to dict for logging."""
        return {
            "database_type": self.database_url.split("://")[0],
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "query_timeout": self.query_timeout,
            "slow_query_threshold": self.slow_query_threshold,
            "auto_migrate": self.auto_migrate,
        }


class DatabaseManager:
    """Advanced database manager with connection pooling and monitoring."""

    def __init__(self, config: DatabaseConfig | None = None):
        self.config = config or DatabaseConfig()
        self.engine: AsyncEngine | None = None
        self.session_factory: async_sessionmaker | None = None
        self._is_initialized = False
        self._connection_count = 0

    async def initialize(self):
        """Initialize database engine and connection pool."""
        if self._is_initialized:
            return

        try:
            # Create async engine with connection pooling
            self.engine = create_async_engine(
                self.config.database_url,
                poolclass=QueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                echo=os.getenv("DB_ECHO", "false").lower() == "true",
                future=True,
            )

            # Setup event listeners for monitoring
            self._setup_event_listeners()

            # Create session factory
            self.session_factory = async_sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )

            # Test connection
            await self._test_connection()

            # Run migrations if enabled
            if self.config.auto_migrate:
                await self._run_migrations()

            self._is_initialized = True

            logger.info(
                "Database initialized successfully",
                database_type=self.config.database_url.split("://")[0],
                pool_size=self.config.pool_size,
            )

            # Record metrics
            metrics.set_connection_pool_size(
                "database", "available", self.config.pool_size
            )

        except Exception as e:
            logger.error("Failed to initialize database", error=str(e), exc_info=True)
            metrics.record_error("database_init_failed", "database")
            raise

    def _setup_event_listeners(self):
        """Setup SQLAlchemy event listeners for monitoring."""
        if not self.engine:
            return

        sync_engine = self.engine.sync_engine

        @event.listens_for(sync_engine, "connect")
        def on_connect(_dbapi_connection, _connection_record):  # noqa: ANN001
            """Track new connections."""
            self._connection_count += 1
            metrics.set_connection_pool_size(
                "database", "active", self._connection_count
            )
            logger.debug("Database connection established")

        @event.listens_for(sync_engine, "close")
        def on_close(_dbapi_connection, _connection_record):  # noqa: ANN001
            """Track closed connections."""
            self._connection_count = max(0, self._connection_count - 1)
            metrics.set_connection_pool_size(
                "database", "active", self._connection_count
            )
            logger.debug("Database connection closed")

        @event.listens_for(sync_engine, "before_cursor_execute")
        def before_cursor_execute(
            _conn,
            _cursor,
            _statement,
            _parameters,
            context,
            _executemany,  # noqa: ANN001,ARG001
        ) -> None:
            """Track query start time."""
            context._query_start_time = time.time()

        @event.listens_for(sync_engine, "after_cursor_execute")
        def after_cursor_execute(
            _conn,
            _cursor,
            statement,
            _parameters,
            context,
            _executemany,  # noqa: ANN001
        ) -> None:
            """Track query completion and performance."""
            if hasattr(context, "_query_start_time"):
                duration = time.time() - context._query_start_time

                # Record metrics
                metrics.request_duration.labels(
                    method="database_query", plugin="database", transport="internal"
                ).observe(duration)

                # Log slow queries
                if duration > self.config.slow_query_threshold:
                    logger.warning(
                        "Slow database query detected",
                        duration_ms=round(duration * 1000, 2),
                        statement=statement[:200]
                        + ("..." if len(statement) > 200 else ""),
                    )

    async def _test_connection(self):
        """Test database connection."""
        try:
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection test successful")
        except Exception as e:
            logger.error("Database connection test failed", error=str(e))
            metrics.record_error("database_connection_test_failed", "database")
            raise

    async def _run_migrations(self):
        """Run database migrations (placeholder for Alembic integration)."""
        try:
            # Create tables if they don't exist (basic implementation)
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            logger.info("Database migrations completed")

        except Exception as e:
            logger.error("Database migration failed", error=str(e))
            metrics.record_error("database_migration_failed", "database")
            raise

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession]:
        """Get database session with automatic cleanup."""
        if not self._is_initialized:
            raise RuntimeError("Database not initialized. Call initialize() first.")

        session = self.session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def execute_query(self, query: str, parameters: dict | None = None) -> Any:
        """Execute raw SQL query with monitoring."""
        start_time = time.time()

        try:
            async with self.get_session() as session:
                result = await session.execute(text(query), parameters or {})
                duration = time.time() - start_time

                logger.debug(
                    "Query executed successfully",
                    duration_ms=round(duration * 1000, 2),
                    query=query[:100] + ("..." if len(query) > 100 else ""),
                )

                return result

        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "Query execution failed",
                error=str(e),
                duration_ms=round(duration * 1000, 2),
                query=query[:100] + ("..." if len(query) > 100 else ""),
            )
            metrics.record_error("database_query_failed", "database")
            raise

    async def get_health_status(self) -> dict[str, Any]:
        """Get database health status."""
        if not self._is_initialized:
            return {"status": "not_initialized", "healthy": False}

        try:
            # Test basic connectivity
            start_time = time.time()
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            response_time = time.time() - start_time

            # Get pool status
            pool = self.engine.pool
            pool_status = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "total": pool.checkedin() + pool.checkedout() + pool.overflow(),
            }

            return {
                "status": "healthy",
                "healthy": True,
                "response_time_ms": round(response_time * 1000, 2),
                "pool_status": pool_status,
                "active_connections": self._connection_count,
                "database_type": self.config.database_url.split("://")[0],
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "healthy": False,
                "error": str(e),
                "database_type": self.config.database_url.split("://")[0],
            }

    async def close(self):
        """Close database connections."""
        if self.engine:
            await self.engine.dispose()
            self._is_initialized = False
            logger.info("Database connections closed")


# Global database manager instance
_database_manager: DatabaseManager | None = None


async def get_database_manager() -> DatabaseManager:
    """Get or create global database manager."""
    global _database_manager

    if _database_manager is None:
        _database_manager = DatabaseManager()
        await _database_manager.initialize()

    return _database_manager


async def get_db_session() -> AsyncGenerator[AsyncSession]:
    """Dependency for getting database session."""
    db_manager = await get_database_manager()
    async with db_manager.get_session() as session:
        yield session
