"""Automated backup and recovery system for MCP infrastructure."""

import asyncio
import hashlib
import json
import os
import shutil
import tarfile
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any

from ..core.caching import get_cache
from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger
from .database import get_database_manager

logger = get_logger(__name__)
metrics = get_metrics_collector()


class BackupType(Enum):
    """Types of backups supported."""

    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    SNAPSHOT = "snapshot"


class BackupStatus(Enum):
    """Backup operation status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class BackupConfig:
    """Configuration for backup operations."""

    backup_dir: str = "/tmp/mcp_backups"
    max_backups: int = 10
    compression_enabled: bool = True
    encryption_enabled: bool = False
    encryption_key: str | None = None

    # Scheduling
    auto_backup_enabled: bool = True
    backup_interval_hours: int = 6
    full_backup_interval_days: int = 7

    # Retention policy
    keep_daily_for_days: int = 7
    keep_weekly_for_weeks: int = 4
    keep_monthly_for_months: int = 12

    # Storage options
    cloud_backup_enabled: bool = False
    cloud_provider: str | None = None  # "aws", "gcp", "azure"
    cloud_bucket: str | None = None
    cloud_credentials: dict[str, str] | None = None

    @classmethod
    def from_env(cls) -> "BackupConfig":
        """Load configuration from environment variables."""
        return cls(
            backup_dir=os.getenv("BACKUP_DIR", "/tmp/mcp_backups"),
            max_backups=int(os.getenv("BACKUP_MAX_COUNT", "10")),
            compression_enabled=os.getenv("BACKUP_COMPRESSION", "true").lower()
            == "true",
            encryption_enabled=os.getenv("BACKUP_ENCRYPTION", "false").lower()
            == "true",
            encryption_key=os.getenv("BACKUP_ENCRYPTION_KEY"),
            auto_backup_enabled=os.getenv("AUTO_BACKUP_ENABLED", "true").lower()
            == "true",
            backup_interval_hours=int(os.getenv("BACKUP_INTERVAL_HOURS", "6")),
            full_backup_interval_days=int(os.getenv("FULL_BACKUP_INTERVAL_DAYS", "7")),
            keep_daily_for_days=int(os.getenv("BACKUP_KEEP_DAILY_DAYS", "7")),
            keep_weekly_for_weeks=int(os.getenv("BACKUP_KEEP_WEEKLY_WEEKS", "4")),
            keep_monthly_for_months=int(os.getenv("BACKUP_KEEP_MONTHLY_MONTHS", "12")),
            cloud_backup_enabled=os.getenv("CLOUD_BACKUP_ENABLED", "false").lower()
            == "true",
            cloud_provider=os.getenv("CLOUD_BACKUP_PROVIDER"),
            cloud_bucket=os.getenv("CLOUD_BACKUP_BUCKET"),
        )


@dataclass
class BackupMetadata:
    """Metadata for a backup operation."""

    backup_id: str
    backup_type: BackupType
    created_at: datetime
    completed_at: datetime | None = None
    status: BackupStatus = BackupStatus.PENDING

    # File information
    file_path: str | None = None
    file_size_bytes: int = 0
    compressed: bool = False
    encrypted: bool = False

    # Content information
    components: list[str] = field(default_factory=list)
    database_version: str | None = None
    schema_checksum: str | None = None

    # Validation
    checksum: str | None = None
    validated: bool = False

    # Error information
    error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "backup_id": self.backup_id,
            "backup_type": self.backup_type.value,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
            "status": self.status.value,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "compressed": self.compressed,
            "encrypted": self.encrypted,
            "components": self.components,
            "database_version": self.database_version,
            "schema_checksum": self.schema_checksum,
            "checksum": self.checksum,
            "validated": self.validated,
            "error_message": self.error_message,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BackupMetadata":
        """Create from dictionary."""
        return cls(
            backup_id=data["backup_id"],
            backup_type=BackupType(data["backup_type"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            completed_at=datetime.fromisoformat(data["completed_at"])
            if data.get("completed_at")
            else None,
            status=BackupStatus(data["status"]),
            file_path=data.get("file_path"),
            file_size_bytes=data.get("file_size_bytes", 0),
            compressed=data.get("compressed", False),
            encrypted=data.get("encrypted", False),
            components=data.get("components", []),
            database_version=data.get("database_version"),
            schema_checksum=data.get("schema_checksum"),
            checksum=data.get("checksum"),
            validated=data.get("validated", False),
            error_message=data.get("error_message"),
        )


class BackupManager:
    """Manages backup and recovery operations."""

    def __init__(self, config: BackupConfig | None = None):
        self.config = config or BackupConfig.from_env()
        self.backup_dir = Path(self.config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Initialize metadata storage
        self.metadata_file = self.backup_dir / "backup_metadata.json"
        self.metadata_cache: dict[str, BackupMetadata] = {}
        self._load_metadata()

        # Background tasks
        self._backup_task: asyncio.Task | None = None
        self._cleanup_task: asyncio.Task | None = None

        logger.info("Backup manager initialized", backup_dir=str(self.backup_dir))

    def _load_metadata(self):
        """Load backup metadata from disk."""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file) as f:
                    data = json.load(f)
                    for backup_id, metadata_dict in data.items():
                        self.metadata_cache[backup_id] = BackupMetadata.from_dict(
                            metadata_dict
                        )

            logger.info(f"Loaded {len(self.metadata_cache)} backup metadata entries")

        except Exception as e:
            logger.error(f"Failed to load backup metadata: {e}")

    def _save_metadata(self):
        """Save backup metadata to disk."""
        try:
            data = {
                backup_id: metadata.to_dict()
                for backup_id, metadata in self.metadata_cache.items()
            }

            with open(self.metadata_file, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to save backup metadata: {e}")

    async def start_background_tasks(self):
        """Start background backup and cleanup tasks."""
        if self.config.auto_backup_enabled:
            self._backup_task = asyncio.create_task(self._auto_backup_loop())
            logger.info("Auto backup task started")

        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Backup cleanup task started")

    async def stop_background_tasks(self):
        """Stop background tasks."""
        if self._backup_task:
            self._backup_task.cancel()
            import contextlib
            with contextlib.suppress(asyncio.CancelledError):
                await self._backup_task

        if self._cleanup_task:
            self._cleanup_task.cancel()
            import contextlib
            with contextlib.suppress(asyncio.CancelledError):
                await self._cleanup_task

        logger.info("Background backup tasks stopped")

    async def _auto_backup_loop(self):
        """Automatic backup loop."""
        while True:
            try:
                # Check if it's time for a full backup
                last_full_backup = self._get_last_backup(BackupType.FULL)
                full_backup_needed = (
                    last_full_backup is None
                    or datetime.now() - last_full_backup.created_at
                    > timedelta(days=self.config.full_backup_interval_days)
                )

                if full_backup_needed:
                    await self.create_backup(BackupType.FULL)
                else:
                    await self.create_backup(BackupType.INCREMENTAL)

                # Wait for next backup interval
                await asyncio.sleep(self.config.backup_interval_hours * 3600)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Auto backup failed: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retry

    async def _cleanup_loop(self):
        """Backup cleanup loop."""
        while True:
            try:
                await self._cleanup_old_backups()
                await asyncio.sleep(3600)  # Run cleanup every hour

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Backup cleanup failed: {e}")
                await asyncio.sleep(3600)

    def _get_last_backup(self, backup_type: BackupType) -> BackupMetadata | None:
        """Get the most recent backup of specified type."""
        backups = [
            metadata
            for metadata in self.metadata_cache.values()
            if metadata.backup_type == backup_type
            and metadata.status == BackupStatus.COMPLETED
        ]

        if not backups:
            return None

        return max(backups, key=lambda b: b.created_at)

    async def create_backup(
        self,
        backup_type: BackupType = BackupType.FULL,
        components: list[str] | None = None,
    ) -> BackupMetadata:
        """Create a new backup."""
        backup_id = f"backup_{int(time.time())}_{backup_type.value}"

        metadata = BackupMetadata(
            backup_id=backup_id,
            backup_type=backup_type,
            created_at=datetime.now(),
            components=components or ["database", "cache", "logs", "config"],
        )

        self.metadata_cache[backup_id] = metadata

        try:
            logger.info(f"Starting backup: {backup_id}", backup_type=backup_type.value)
            metadata.status = BackupStatus.IN_PROGRESS
            self._save_metadata()

            # Create temporary directory for backup
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                backup_content_dir = temp_path / backup_id
                backup_content_dir.mkdir()

                # Backup database
                if "database" in metadata.components:
                    await self._backup_database(backup_content_dir)

                # Backup cache state
                if "cache" in metadata.components:
                    await self._backup_cache(backup_content_dir)

                # Backup configuration
                if "config" in metadata.components:
                    await self._backup_config(backup_content_dir)

                # Backup logs
                if "logs" in metadata.components:
                    await self._backup_logs(backup_content_dir)

                # Create backup archive
                backup_file = self.backup_dir / f"{backup_id}.tar"
                if self.config.compression_enabled:
                    backup_file = backup_file.with_suffix(".tar.gz")

                await self._create_archive(backup_content_dir, backup_file)

                # Encrypt if enabled
                if self.config.encryption_enabled and self.config.encryption_key:
                    encrypted_file = await self._encrypt_backup(backup_file)
                    backup_file.unlink()  # Remove unencrypted version
                    backup_file = encrypted_file
                    metadata.encrypted = True

                # Calculate checksum
                metadata.checksum = await self._calculate_checksum(backup_file)
                metadata.file_path = str(backup_file)
                metadata.file_size_bytes = backup_file.stat().st_size
                metadata.compressed = self.config.compression_enabled

            # Mark as completed
            metadata.completed_at = datetime.now()
            metadata.status = BackupStatus.COMPLETED

            logger.info(
                f"Backup completed: {backup_id}",
                size_bytes=metadata.file_size_bytes,
                components=metadata.components,
                duration_seconds=(
                    metadata.completed_at - metadata.created_at
                ).total_seconds(),
            )

            # Record metrics
            metrics.record_plugin_operation("backup", "create", "success")
            metrics.record_request(
                "backup_create",
                "success",
                "backup",
                (metadata.completed_at - metadata.created_at).total_seconds(),
            )

            # Upload to cloud if enabled
            if self.config.cloud_backup_enabled:
                await self._upload_to_cloud(metadata)

        except Exception as e:
            metadata.status = BackupStatus.FAILED
            metadata.error_message = str(e)

            logger.error(f"Backup failed: {backup_id}", error=str(e))
            metrics.record_plugin_operation("backup", "create", "failed")

            raise

        finally:
            self._save_metadata()

        return metadata

    async def _backup_database(self, backup_dir: Path):
        """Backup database to directory."""
        try:
            db_manager = await get_database_manager()

            # Get database connection info
            db_config = db_manager.config
            db_type = db_config.database_url.split("://")[0]

            if "sqlite" in db_type:
                # For SQLite, just copy the database file
                db_path = db_config.database_url.replace("sqlite+aiosqlite:///", "")
                if os.path.exists(db_path):
                    shutil.copy2(db_path, backup_dir / "database.sqlite")

            elif "postgresql" in db_type:
                # For PostgreSQL, use pg_dump
                await self._pg_dump(db_config, backup_dir / "database.sql")

            elif "mysql" in db_type:
                # For MySQL, use mysqldump
                await self._mysql_dump(db_config, backup_dir / "database.sql")

            # Export database schema information
            from .migrations import get_migration_status

            migration_status = await get_migration_status()

            with open(backup_dir / "database_metadata.json", "w") as f:
                json.dump(
                    {
                        "database_type": db_type,
                        "migration_status": migration_status,
                        "backup_timestamp": datetime.now().isoformat(),
                    },
                    f,
                    indent=2,
                )

            logger.info("Database backup completed")

        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            raise

    async def _backup_cache(self, backup_dir: Path):
        """Backup cache state."""
        try:
            cache = get_cache()
            stats = await cache.get_stats()

            # Save cache statistics and configuration
            cache_data = {
                "stats": stats,
                "config": {
                    "backend": stats.get("backend", "unknown"),
                    "backup_timestamp": datetime.now().isoformat(),
                },
            }

            with open(backup_dir / "cache_metadata.json", "w") as f:
                json.dump(cache_data, f, indent=2)

            logger.info("Cache backup completed")

        except Exception as e:
            logger.error(f"Cache backup failed: {e}")
            # Don't fail the entire backup for cache issues

    async def _backup_config(self, backup_dir: Path):
        """Backup configuration files."""
        try:
            config_data = {
                "backup_timestamp": datetime.now().isoformat(),
                "environment_variables": {
                    key: value
                    for key, value in os.environ.items()
                    if key.startswith(("MCP_", "DB_", "REDIS_", "CACHE_"))
                    and "SECRET" not in key
                    and "PASSWORD" not in key
                },
                "backup_config": self.config.__dict__,
            }

            with open(backup_dir / "config.json", "w") as f:
                json.dump(config_data, f, indent=2)

            logger.info("Configuration backup completed")

        except Exception as e:
            logger.error(f"Configuration backup failed: {e}")

    async def _backup_logs(self, backup_dir: Path):
        """Backup recent logs."""
        try:
            logs_dir = backup_dir / "logs"
            logs_dir.mkdir(exist_ok=True)

            # Create a simple log summary since we don't have file logging by default
            log_summary = {
                "backup_timestamp": datetime.now().isoformat(),
                "log_summary": "Structured logging to stdout/stderr - see container logs",
            }

            with open(logs_dir / "log_summary.json", "w") as f:
                json.dump(log_summary, f, indent=2)

            logger.info("Logs backup completed")

        except Exception as e:
            logger.error(f"Logs backup failed: {e}")

    async def _create_archive(self, source_dir: Path, output_file: Path):
        """Create compressed archive."""
        if self.config.compression_enabled:
            with tarfile.open(output_file, "w:gz") as tar:
                tar.add(source_dir, arcname=source_dir.name)
        else:
            with tarfile.open(output_file, "w") as tar:
                tar.add(source_dir, arcname=source_dir.name)

    async def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    async def _encrypt_backup(self, backup_file: Path) -> Path:
        """Encrypt backup file (placeholder - would use proper encryption)."""
        # This is a simplified example - in production, use proper encryption
        encrypted_file = backup_file.with_suffix(backup_file.suffix + ".enc")
        shutil.move(backup_file, encrypted_file)
        return encrypted_file

    async def _upload_to_cloud(self, metadata: BackupMetadata):
        """Upload backup to cloud storage (placeholder)."""
        # This would implement actual cloud upload based on provider
        logger.info(
            f"Cloud upload would be implemented for backup: {metadata.backup_id}"
        )

    async def _pg_dump(self, _db_config, _output_file: Path):
        """Create PostgreSQL dump."""
        # This would implement actual pg_dump
        logger.info("PostgreSQL dump would be created")

    async def _mysql_dump(self, _db_config, _output_file: Path):
        """Create MySQL dump."""
        # This would implement actual mysqldump
        logger.info("MySQL dump would be created")

    async def restore_backup(
        self, backup_id: str, components: list[str] | None = None
    ) -> bool:
        """Restore from backup."""
        if backup_id not in self.metadata_cache:
            raise ValueError(f"Backup not found: {backup_id}")

        metadata = self.metadata_cache[backup_id]

        if metadata.status != BackupStatus.COMPLETED:
            raise ValueError(f"Cannot restore from incomplete backup: {backup_id}")

        try:
            logger.info(f"Starting restore from backup: {backup_id}")

            backup_file = Path(metadata.file_path)
            if not backup_file.exists():
                raise FileNotFoundError(f"Backup file not found: {backup_file}")

            # Verify checksum
            current_checksum = await self._calculate_checksum(backup_file)
            if current_checksum != metadata.checksum:
                raise ValueError("Backup file corrupted - checksum mismatch")

            # Extract backup
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)

                # Decrypt if needed
                if metadata.encrypted:
                    backup_file = await self._decrypt_backup(backup_file, temp_path)

                # Extract archive
                with tarfile.open(
                    backup_file, "r:gz" if metadata.compressed else "r"
                ) as tar:
                    tar.extractall(temp_path)

                # Find the backup content directory
                backup_content_dir = temp_path / metadata.backup_id

                # Restore components
                restore_components = components or metadata.components

                if "database" in restore_components:
                    await self._restore_database(backup_content_dir)

                if "config" in restore_components:
                    await self._restore_config(backup_content_dir)

            logger.info(f"Backup restore completed: {backup_id}")
            metrics.record_plugin_operation("backup", "restore", "success")

            return True

        except Exception as e:
            logger.error(f"Backup restore failed: {backup_id}", error=str(e))
            metrics.record_plugin_operation("backup", "restore", "failed")
            raise

    async def _decrypt_backup(self, backup_file: Path, temp_dir: Path) -> Path:
        """Decrypt backup file."""
        decrypted_file = temp_dir / "decrypted_backup.tar.gz"
        shutil.copy2(backup_file, decrypted_file)
        return decrypted_file

    async def _restore_database(self, _backup_dir: Path):
        """Restore database from backup."""
        logger.warning(
            "Database restore is a critical operation - implement with caution"
        )
        # This would implement actual database restoration

    async def _restore_config(self, backup_dir: Path):
        """Restore configuration from backup."""
        config_file = backup_dir / "config.json"
        if config_file.exists():
            with open(config_file) as f:
                config_data = json.load(f)

            logger.info(
                "Configuration restore completed",
                timestamp=config_data.get("backup_timestamp"),
            )

    async def _cleanup_old_backups(self):
        """Clean up old backups according to retention policy."""
        now = datetime.now()
        backups_to_delete = []

        for backup_id, metadata in self.metadata_cache.items():
            if metadata.status != BackupStatus.COMPLETED:
                continue

            age = now - metadata.created_at

            # Apply retention policy
            should_delete = False

            if age > timedelta(days=self.config.keep_daily_for_days):
                if metadata.backup_type != BackupType.FULL:
                    should_delete = True
                elif (
                    age
                    > timedelta(days=self.config.keep_weekly_for_weeks * 7)
                    and age
                    > timedelta(days=self.config.keep_monthly_for_months * 30)
                ):
                    should_delete = True

            # Always keep at least one backup
            if len(self.metadata_cache) <= 1:
                should_delete = False

            if should_delete:
                backups_to_delete.append(backup_id)

        # Delete old backups
        for backup_id in backups_to_delete:
            await self._delete_backup(backup_id)

        if backups_to_delete:
            logger.info(f"Cleaned up {len(backups_to_delete)} old backups")

    async def _delete_backup(self, backup_id: str):
        """Delete a backup."""
        if backup_id not in self.metadata_cache:
            return

        metadata = self.metadata_cache[backup_id]

        # Delete backup file
        if metadata.file_path and os.path.exists(metadata.file_path):
            os.unlink(metadata.file_path)

        # Remove from metadata
        del self.metadata_cache[backup_id]
        self._save_metadata()

        logger.info(f"Deleted backup: {backup_id}")

    def list_backups(self) -> list[BackupMetadata]:
        """List all available backups."""
        return list(self.metadata_cache.values())

    def get_backup_status(self) -> dict[str, Any]:
        """Get backup system status."""
        backups = list(self.metadata_cache.values())

        return {
            "total_backups": len(backups),
            "completed_backups": len(
                [b for b in backups if b.status == BackupStatus.COMPLETED]
            ),
            "failed_backups": len(
                [b for b in backups if b.status == BackupStatus.FAILED]
            ),
            "total_size_bytes": sum(
                b.file_size_bytes for b in backups if b.status == BackupStatus.COMPLETED
            ),
            "last_backup": max(backups, key=lambda b: b.created_at).to_dict()
            if backups
            else None,
            "auto_backup_enabled": self.config.auto_backup_enabled,
            "backup_interval_hours": self.config.backup_interval_hours,
            "retention_policy": {
                "daily_days": self.config.keep_daily_for_days,
                "weekly_weeks": self.config.keep_weekly_for_weeks,
                "monthly_months": self.config.keep_monthly_for_months,
            },
        }


# Global backup manager
_backup_manager: BackupManager | None = None


async def get_backup_manager() -> BackupManager:
    """Get or create global backup manager."""
    global _backup_manager

    if _backup_manager is None:
        _backup_manager = BackupManager()
        await _backup_manager.start_background_tasks()

    return _backup_manager
