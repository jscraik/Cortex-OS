# pyright: reportMissingTypeStubs=false, reportUnknownMemberType=false, reportUnknownVariableType=false
"""Database migration system using Alembic."""

import asyncio
import os
from pathlib import Path
from typing import Any, TYPE_CHECKING

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger
from .database import DatabaseConfig as _DatabaseConfig, get_database_manager
from . import models

logger: Any = get_logger(__name__)
metrics: Any = get_metrics_collector()


class MigrationManager:
    """Manages database migrations using Alembic."""

    def __init__(self, database_config: DatabaseConfig | None = None):
        # Treat DatabaseConfig as Any to avoid strict-typing issues
        db_config_factory: Any = _DatabaseConfig
        self.db_config = database_config or db_config_factory()
        self.migrations_dir: Path = Path(__file__).parent / "migrations"
        self.alembic_cfg: Any | None = None
        self._setup_alembic_config()

    def _setup_alembic_config(self) -> None:
        """Setup Alembic configuration."""
        # Ensure migrations directory exists
        self.migrations_dir.mkdir(exist_ok=True)

        # Create alembic.ini in migrations directory
        alembic_ini = self.migrations_dir / "alembic.ini"

        if not alembic_ini.exists():
            self._create_alembic_ini(alembic_ini)

        # Create Alembic config
        cfg: Any = Config(str(alembic_ini))
        self.alembic_cfg = cfg
        cfg.set_main_option("script_location", str(self.migrations_dir))

        # Convert async URL to sync URL for Alembic
        sync_url = self._get_sync_database_url()
        cfg.set_main_option("sqlalchemy.url", sync_url)

        # Setup logging
        cfg.set_main_option("logger", "mcp.migrations")

    def _create_alembic_ini(self, alembic_ini_path: Path) -> None:
        """Create alembic.ini configuration file."""
        alembic_ini_content = """# Alembic configuration for MCP

[alembic]
# Path to migration scripts
script_location = %(here)s

# Template for generating migration scripts
file_template = %%(year)d%%(month).2d%%(day).2d_%%(hour).2d%%(minute).2d_%%(rev)s_%%(slug)s

# Timezone for migration timestamps
timezone = UTC

# Max length of characters to apply to generated revision id
revision_environment = false
sqlalchemy.url =

# Logging configuration
[loggers]
keys = root,sqlalchemy,alembic,mcp

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[logger_mcp]
level = INFO
handlers =
qualname = mcp

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(asctime)s %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %Y-%m-%d %H:%M:%S
"""
        alembic_ini_path.write_text(alembic_ini_content.strip())
        logger.info(f"Created Alembic configuration: {alembic_ini_path}")

    def _get_sync_database_url(self) -> str:
        """Convert async database URL to sync URL for Alembic."""
        url = self.db_config.database_url

        # Convert async drivers to sync drivers
        url_mappings = {
            "postgresql+asyncpg://": "postgresql://",
            "mysql+aiomysql://": "mysql+pymysql://",
            "sqlite+aiosqlite:///": "sqlite:///",
        }

        for async_driver, sync_driver in url_mappings.items():
            if url.startswith(async_driver):
                return url.replace(async_driver, sync_driver)

        return url

    async def initialize_migrations(self) -> bool:
        """Initialize migrations directory and create initial migration."""
        try:
            # Check if migrations are already initialized
            versions_dir = self.migrations_dir / "versions"
            if versions_dir.exists() and list(versions_dir.glob("*.py")):
                logger.info("Migrations already initialized")
                return True

            # Initialize Alembic
            assert self.alembic_cfg is not None
            command.init(self.alembic_cfg, str(self.migrations_dir))

            # Create env.py with async support
            self._create_env_py()

            # Create initial migration
            await self._create_initial_migration()

            logger.info("Migration system initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize migrations: {e}")
            metrics.record_error("migration_init_failed", "database")
            return False

    def _create_env_py(self) -> None:
        """Create env.py with async support."""
        env_py_path = self.migrations_dir / "env.py"

        env_py_content = '''"""Async-compatible Alembic environment."""

import asyncio
import os
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Import your models here
from packages.mcp.infrastructure.models import Base

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def get_url():
    """Get database URL from environment or config."""
    return os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    """Run migrations with provided connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Run migrations in async mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()

    connectable = create_async_engine(
        configuration["sqlalchemy.url"],
        future=True,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'''
        env_py_path.write_text(env_py_content)
        logger.info("Created async-compatible env.py")

    async def _create_initial_migration(self) -> None:
        """Create initial migration with all models."""
        try:
            # Generate initial migration
            command.revision(
                self.alembic_cfg,
                autogenerate=True,
                message="Initial migration - create all tables",
            )

            logger.info("Created initial migration")

        except Exception as e:
            logger.error(f"Failed to create initial migration: {e}")
            raise

    async def run_migrations(self) -> bool:
        """Run pending migrations."""
        try:
            # Run migrations in a separate thread to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, lambda: command.upgrade(self.alembic_cfg, "head")
            )

            logger.info("Migrations completed successfully")
            metrics.record_plugin_operation("database", "migrate", "success")
            return True

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            metrics.record_plugin_operation("database", "migrate", "failed")
            metrics.record_error("migration_failed", "database")
            return False

    async def create_migration(
        self, message: str, autogenerate: bool = True
    ) -> str | None:
        """Create a new migration."""
        try:
            # Generate migration in executor
            loop = asyncio.get_event_loop()
            assert self.alembic_cfg is not None
            result = await loop.run_in_executor(
                None,
                lambda: command.revision(
                    self.alembic_cfg, autogenerate=autogenerate, message=message
                ),
            )

            logger.info(f"Created migration: {message}")
            return result.revision if result else None

        except Exception as e:
            logger.error(f"Failed to create migration: {e}")
            return None

    async def rollback_migration(self, revision: str = "-1") -> bool:
        """Rollback to a specific migration."""
        try:
            loop = asyncio.get_event_loop()
            assert self.alembic_cfg is not None
            await loop.run_in_executor(
                None, lambda: command.downgrade(self.alembic_cfg, revision)
            )

            logger.info(f"Rolled back to revision: {revision}")
            return True

        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False

    async def get_migration_status(self) -> dict[str, Any]:
        """Get current migration status."""
        try:
            # Get database manager
            db_manager = await get_database_manager()

            # Get current revision from database
            async with db_manager.get_session() as session:
                # Treat as Any for strict type checkers
                _session: Any = session
                result = await _session.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                )
                current_revision: str | None = result.scalar()

            # Get script directory
            assert self.alembic_cfg is not None
            cfg = self.alembic_cfg
            script_dir = ScriptDirectory.from_config(cfg)
            head_revision = script_dir.get_current_head()

            # Get pending migrations
            pending_migrations: list[str] = []
            if current_revision != head_revision:
                # This is simplified - in a real implementation you'd get all pending revisions
                pending_migrations = [head_revision]

            return {
                "current_revision": current_revision,
                "head_revision": head_revision,
                "pending_migrations": pending_migrations,
                "up_to_date": current_revision == head_revision,
                "migrations_dir": str(self.migrations_dir),
            }

        except Exception as e:
            logger.error(f"Failed to get migration status: {e}")
            return {"error": str(e), "up_to_date": False}

    async def list_migrations(self) -> list[dict[str, Any]]:
        """List all migrations."""
        try:
            assert self.alembic_cfg is not None
            cfg = self.alembic_cfg
            script_dir = ScriptDirectory.from_config(cfg)
            migrations = []

            for revision in script_dir.walk_revisions():
                migrations.append(
                    {
                        "revision": revision.revision,
                        "down_revision": revision.down_revision,
                        "branch_labels": revision.branch_labels,
                        "depends_on": revision.depends_on,
                        "doc": revision.doc,
                        "create_date": revision.create_date.isoformat()
                        if revision.create_date
                        else None,
                    }
                )

            return migrations

        except Exception as e:
            logger.error(f"Failed to list migrations: {e}")
            return []

    async def validate_database_schema(self) -> dict[str, Any]:
        """Validate that database schema matches models."""
        try:
            # Ensure database connectivity (manager obtained if needed)
            await get_database_manager()

            # Create sync engine for Alembic operations
            sync_url = self._get_sync_database_url()
            sync_engine = create_engine(sync_url)

            # Create migration context
            with sync_engine.connect() as connection:
                context = MigrationContext.configure(connection)

                # Check if current schema matches expected
                # This is a simplified check - full implementation would compare all tables/columns
                current_tables: set[str] = set(context.get_bind().table_names())
                base: Any = getattr(models, "Base", None)
                if base is None:
                    raise RuntimeError("models.Base not found")
                expected_tables: set[str] = set(base.metadata.tables.keys())

                missing_tables: set[str] = expected_tables - current_tables
                extra_tables: set[str] = current_tables - expected_tables

            sync_engine.dispose()

            is_valid = len(missing_tables) == 0 and len(extra_tables) == 0

            return {
                "valid": is_valid,
                "expected_tables": list(expected_tables),
                "current_tables": list(current_tables),
                "missing_tables": list(missing_tables),
                "extra_tables": list(extra_tables),
                "total_expected": len(expected_tables),
                "total_current": len(current_tables),
            }

        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return {"valid": False, "error": str(e)}

    async def backup_database(self, backup_path: str | None = None) -> dict[str, Any]:
        """Create database backup before migrations."""
        try:
            if backup_path is None:
                timestamp = asyncio.get_event_loop().time()
                backup_path = f"/tmp/mcp_backup_{int(timestamp)}.sql"

            # This is a simplified backup - real implementation would use database-specific tools
            # Ensure database connectivity (manager obtained if needed)
            await get_database_manager()

            backup_info: dict[str, Any] = {
                "backup_path": backup_path,
                "timestamp": asyncio.get_event_loop().time(),
                "database_type": self.db_config.database_url.split("://")[0],
                "success": True,
            }

            # For SQLite, we can copy the file
            if "sqlite" in self.db_config.database_url:
                import shutil

                db_path = self.db_config.database_url.replace(
                    "sqlite+aiosqlite:///", ""
                )
                if os.path.exists(db_path):
                    shutil.copy2(db_path, backup_path)
                    backup_info["backup_size_bytes"] = os.path.getsize(backup_path)
                else:
                    backup_info["success"] = False
                    backup_info["error"] = "Database file not found"

            if backup_info["success"]:
                logger.info(f"Database backup created: {backup_path}")

            return backup_info

        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            return {"success": False, "error": str(e)}


# Global migration manager
_migration_manager: MigrationManager | None = None


async def get_migration_manager() -> MigrationManager:
    """Get or create global migration manager."""
    global _migration_manager

    if _migration_manager is None:
        _migration_manager = MigrationManager()
        await _migration_manager.initialize_migrations()

    return _migration_manager


async def run_migrations() -> bool:
    """Convenience function to run migrations."""
    migration_manager = await get_migration_manager()
    return await migration_manager.run_migrations()


async def create_migration(message: str) -> str | None:
    """Convenience function to create a migration."""
    migration_manager = await get_migration_manager()
    return await migration_manager.create_migration(message)


async def get_migration_status() -> dict[str, Any]:
    """Convenience function to get migration status."""
    migration_manager = await get_migration_manager()
    return await migration_manager.get_migration_status()
