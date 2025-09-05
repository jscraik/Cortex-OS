"""Advanced caching system with multiple backends and intelligent invalidation."""

import asyncio
import hashlib
import json
import os
import pickle
import time
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import redis.asyncio as redis
from redis.asyncio import Redis

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class CacheBackend(Enum):
    """Supported cache backends."""

    MEMORY = "memory"
    REDIS = "redis"
    HYBRID = "hybrid"  # Memory + Redis for different layers


class CachePolicy(Enum):
    """Cache eviction policies."""

    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live only
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"


@dataclass
class CacheConfig:
    """Cache configuration."""

    backend: CacheBackend = CacheBackend.REDIS
    default_ttl: int = 3600  # Default TTL in seconds
    max_memory_size: int = 100 * 1024 * 1024  # 100MB for memory cache
    policy: CachePolicy = CachePolicy.LRU

    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_prefix: str = "mcp_cache:"

    # Performance settings
    compression_enabled: bool = True
    compression_threshold: int = 1024  # Compress objects larger than 1KB
    serialization_format: str = "json"  # "json", "pickle", "msgpack"

    # Intelligent features
    auto_refresh_enabled: bool = True
    auto_refresh_threshold: float = 0.8  # Refresh when 80% of TTL elapsed
    popularity_tracking: bool = True
    hit_rate_monitoring: bool = True

    @classmethod
    def from_env(cls) -> "CacheConfig":
        """Create config from environment variables."""
        return cls(
            backend=CacheBackend(os.getenv("CACHE_BACKEND", "redis")),
            default_ttl=int(os.getenv("CACHE_DEFAULT_TTL", "3600")),
            max_memory_size=int(os.getenv("CACHE_MAX_MEMORY", "104857600")),
            redis_host=os.getenv("REDIS_HOST", "localhost"),
            redis_port=int(os.getenv("REDIS_PORT", "6379")),
            redis_db=int(os.getenv("REDIS_CACHE_DB", "0")),
            compression_enabled=os.getenv("CACHE_COMPRESSION", "true").lower()
            == "true",
            auto_refresh_enabled=os.getenv("CACHE_AUTO_REFRESH", "true").lower()
            == "true",
        )


@dataclass
class CacheEntry:
    """Individual cache entry with metadata."""

    key: str
    value: Any
    ttl: int
    created_at: float
    accessed_at: float
    access_count: int = 0
    size_bytes: int = 0
    compressed: bool = False
    tags: list[str] = field(default_factory=list)

    @property
    def age_seconds(self) -> float:
        """Age of the entry in seconds."""
        return time.time() - self.created_at

    @property
    def is_expired(self) -> bool:
        """Check if entry has expired."""
        if self.ttl <= 0:  # Never expires
            return False
        return time.time() > (self.created_at + self.ttl)

    @property
    def time_to_refresh(self) -> float:
        """Time until auto-refresh should trigger."""
        if self.ttl <= 0:
            return float("inf")
        refresh_time = self.created_at + (self.ttl * 0.8)  # 80% of TTL
        return max(0, refresh_time - time.time())


@dataclass
class CacheStats:
    """Cache performance statistics."""

    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    errors: int = 0
    total_size_bytes: int = 0
    entry_count: int = 0

    @property
    def hit_rate(self) -> float:
        """Calculate hit rate percentage."""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0

    @property
    def miss_rate(self) -> float:
        """Calculate miss rate percentage."""
        return 100.0 - self.hit_rate


class CacheBackendInterface(ABC):
    """Abstract interface for cache backends."""

    @abstractmethod
    async def get(self, key: str) -> Any | None:
        """Get value from cache."""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: int = 0) -> bool:
        """Set value in cache."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        pass

    @abstractmethod
    async def clear(self) -> bool:
        """Clear all cache entries."""
        pass

    @abstractmethod
    async def get_stats(self) -> CacheStats:
        """Get cache statistics."""
        pass


class MemoryCacheBackend(CacheBackendInterface):
    """In-memory cache backend with LRU eviction."""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.data: dict[str, CacheEntry] = {}
        self.stats = CacheStats()
        self._lock = asyncio.Lock()

        # LRU tracking
        self.access_order: list[str] = []
        self.current_size = 0

        # Background cleanup task
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def get(self, key: str) -> Any | None:
        """Get value from memory cache."""
        async with self._lock:
            entry = self.data.get(key)

            if entry is None:
                self.stats.misses += 1
                return None

            if entry.is_expired:
                await self._remove_entry(key)
                self.stats.misses += 1
                return None

            # Update access tracking
            entry.accessed_at = time.time()
            entry.access_count += 1

            # Update LRU order
            if key in self.access_order:
                self.access_order.remove(key)
            self.access_order.append(key)

            self.stats.hits += 1
            return entry.value

    async def set(self, key: str, value: Any, ttl: int = 0) -> bool:
        """Set value in memory cache."""
        try:
            async with self._lock:
                # Calculate size
                size_bytes = len(pickle.dumps(value))

                # Check if we need to evict
                while (
                    self.current_size + size_bytes > self.config.max_memory_size
                    and len(self.data) > 0
                ):
                    await self._evict_lru()

                # Remove existing entry if present
                if key in self.data:
                    await self._remove_entry(key)

                # Create new entry
                entry = CacheEntry(
                    key=key,
                    value=value,
                    ttl=ttl or self.config.default_ttl,
                    created_at=time.time(),
                    accessed_at=time.time(),
                    size_bytes=size_bytes,
                )

                self.data[key] = entry
                self.access_order.append(key)
                self.current_size += size_bytes
                self.stats.sets += 1
                self.stats.entry_count += 1
                self.stats.total_size_bytes = self.current_size

                return True

        except Exception as e:
            logger.error(f"Failed to set cache entry: {e}")
            self.stats.errors += 1
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from memory cache."""
        async with self._lock:
            if key in self.data:
                await self._remove_entry(key)
                self.stats.deletes += 1
                return True
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in memory cache."""
        async with self._lock:
            entry = self.data.get(key)
            return entry is not None and not entry.is_expired

    async def clear(self) -> bool:
        """Clear all memory cache entries."""
        async with self._lock:
            self.data.clear()
            self.access_order.clear()
            self.current_size = 0
            self.stats = CacheStats()
            return True

    async def get_stats(self) -> CacheStats:
        """Get memory cache statistics."""
        async with self._lock:
            self.stats.total_size_bytes = self.current_size
            self.stats.entry_count = len(self.data)
            return self.stats

    async def _remove_entry(self, key: str):
        """Remove entry and update tracking."""
        if key in self.data:
            entry = self.data.pop(key)
            self.current_size -= entry.size_bytes
            if key in self.access_order:
                self.access_order.remove(key)
            self.stats.entry_count = len(self.data)

    async def _evict_lru(self):
        """Evict least recently used entry."""
        if self.access_order:
            lru_key = self.access_order[0]
            await self._remove_entry(lru_key)
            self.stats.evictions += 1

    async def _periodic_cleanup(self):
        """Periodic cleanup of expired entries."""
        while True:
            try:
                await asyncio.sleep(60)  # Clean every minute

                async with self._lock:
                    expired_keys = [
                        key for key, entry in self.data.items() if entry.is_expired
                    ]

                    for key in expired_keys:
                        await self._remove_entry(key)

                    if expired_keys:
                        logger.debug(
                            f"Cleaned {len(expired_keys)} expired cache entries"
                        )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")


class RedisCacheBackend(CacheBackendInterface):
    """Redis cache backend with advanced features."""

    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis: Redis | None = None
        self.stats = CacheStats()
        self._lua_scripts = {}
        self._load_lua_scripts()

    async def _ensure_connected(self):
        """Ensure Redis connection is established."""
        if self.redis is None:
            self.redis = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                decode_responses=False,  # Keep binary for proper serialization
                socket_timeout=30.0,
                socket_connect_timeout=10.0,
                retry_on_timeout=True,
            )

    def _load_lua_scripts(self):
        """Load Lua scripts for atomic operations."""
        # Atomic get with stats update
        self._lua_scripts["get_with_stats"] = """
            local key = KEYS[1]
            local stats_key = KEYS[2]
            local now = ARGV[1]

            local value = redis.call('GET', key)
            if value then
                redis.call('HINCRBY', stats_key, 'hits', 1)
                redis.call('HSET', key .. ':meta', 'accessed_at', now)
                redis.call('HINCRBY', key .. ':meta', 'access_count', 1)
                return value
            else
                redis.call('HINCRBY', stats_key, 'misses', 1)
                return nil
            end
        """

        # Atomic set with metadata
        self._lua_scripts["set_with_meta"] = """
            local key = KEYS[1]
            local meta_key = KEYS[2]
            local stats_key = KEYS[3]
            local value = ARGV[1]
            local ttl = tonumber(ARGV[2])
            local now = ARGV[3]
            local size = ARGV[4]

            redis.call('SET', key, value)
            if ttl > 0 then
                redis.call('EXPIRE', key, ttl)
                redis.call('EXPIRE', meta_key, ttl)
            end

            redis.call('HMSET', meta_key,
                'created_at', now,
                'accessed_at', now,
                'access_count', 0,
                'size_bytes', size,
                'ttl', ttl)

            redis.call('HINCRBY', stats_key, 'sets', 1)
            redis.call('HINCRBY', stats_key, 'total_size_bytes', size)

            return 'OK'
        """

    def _get_key(self, key: str) -> str:
        """Get prefixed Redis key."""
        return f"{self.config.redis_prefix}{key}"

    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage.

        WARNING: pickle serialization is used for complex objects.
        Only use with trusted internal data.
        """
        try:
            if self.config.serialization_format == "json":
                try:
                    serialized = json.dumps(value).encode("utf-8")
                except (TypeError, ValueError):
                    # Fall back to pickle for complex objects, but log warning
                    import logging

                    logging.warning(
                        "Failed to serialize with JSON, falling back to pickle. "
                        "Ensure data is from trusted sources."
                    )
                    serialized = pickle.dumps(value)
            elif self.config.serialization_format == "pickle":
                # Log warning about pickle usage
                import logging

                logging.debug(
                    "Using pickle serialization - ensure data is from trusted sources"
                )
                serialized = pickle.dumps(value)
            else:
                # Default to pickle with warning
                import logging

                logging.warning(
                    "Unknown serialization format, defaulting to pickle. "
                    "Ensure data is from trusted sources."
                )
                serialized = pickle.dumps(value)

            # Compression for large objects
            if (
                self.config.compression_enabled
                and len(serialized) > self.config.compression_threshold
            ):
                import gzip

                compressed = gzip.compress(serialized)
                return b"COMPRESSED:" + compressed

            return serialized

        except Exception as e:
            logger.error(f"Serialization error: {e}")
            raise

    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from storage."""
        try:
            # Check for compression
            if data.startswith(b"COMPRESSED:"):
                import gzip

                data = gzip.decompress(data[11:])  # Remove 'COMPRESSED:' prefix

            if self.config.serialization_format == "json":
                return json.loads(data.decode("utf-8"))
            elif self.config.serialization_format == "pickle":
                logger.warning(
                    "Using pickle deserialization - ensure data is from trusted source"
                )
                return pickle.loads(data)
            else:
                logger.warning(
                    "Using pickle deserialization as default - ensure data is from trusted source"
                )
                return pickle.loads(data)  # Default to pickle

        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            raise

    async def get(self, key: str) -> Any | None:
        """Get value from Redis cache."""
        try:
            await self._ensure_connected()

            redis_key = self._get_key(key)
            stats_key = f"{self.config.redis_prefix}stats"

            # Use Lua script for atomic get with stats
            result = await self.redis.eval(
                self._lua_scripts["get_with_stats"],
                2,
                redis_key,
                stats_key,
                str(time.time()),
            )

            if result is None:
                return None

            return self._deserialize(result)

        except Exception as e:
            logger.error(f"Cache get error: {e}")
            self.stats.errors += 1
            return None

    async def set(self, key: str, value: Any, ttl: int = 0) -> bool:
        """Set value in Redis cache."""
        try:
            await self._ensure_connected()

            serialized = self._serialize(value)
            size_bytes = len(serialized)

            redis_key = self._get_key(key)
            meta_key = f"{redis_key}:meta"
            stats_key = f"{self.config.redis_prefix}stats"

            # Use Lua script for atomic set with metadata
            await self.redis.eval(
                self._lua_scripts["set_with_meta"],
                3,
                redis_key,
                meta_key,
                stats_key,
                serialized,
                ttl or self.config.default_ttl,
                str(time.time()),
                str(size_bytes),
            )

            return True

        except Exception as e:
            logger.error(f"Cache set error: {e}")
            self.stats.errors += 1
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from Redis cache."""
        try:
            await self._ensure_connected()

            redis_key = self._get_key(key)
            meta_key = f"{redis_key}:meta"
            stats_key = f"{self.config.redis_prefix}stats"

            # Get size before deletion
            meta = await self.redis.hgetall(meta_key)
            size_bytes = int(meta.get(b"size_bytes", 0))

            deleted = await self.redis.delete(redis_key, meta_key)

            if deleted > 0:
                await self.redis.hincrby(stats_key, "deletes", 1)
                await self.redis.hincrby(stats_key, "total_size_bytes", -size_bytes)
                return True

            return False

        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            self.stats.errors += 1
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis cache."""
        try:
            await self._ensure_connected()
            redis_key = self._get_key(key)
            return bool(await self.redis.exists(redis_key))
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            return False

    async def clear(self) -> bool:
        """Clear all Redis cache entries."""
        try:
            await self._ensure_connected()
            pattern = f"{self.config.redis_prefix}*"

            cursor = 0
            deleted_count = 0

            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted_count += await self.redis.delete(*keys)
                if cursor == 0:
                    break

            logger.info(f"Cleared {deleted_count} cache entries")
            return True

        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False

    async def get_stats(self) -> CacheStats:
        """Get Redis cache statistics."""
        try:
            await self._ensure_connected()
            stats_key = f"{self.config.redis_prefix}stats"

            stats_data = await self.redis.hgetall(stats_key)

            if stats_data:
                return CacheStats(
                    hits=int(stats_data.get(b"hits", 0)),
                    misses=int(stats_data.get(b"misses", 0)),
                    sets=int(stats_data.get(b"sets", 0)),
                    deletes=int(stats_data.get(b"deletes", 0)),
                    total_size_bytes=int(stats_data.get(b"total_size_bytes", 0)),
                    errors=self.stats.errors,
                )

            return CacheStats()

        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return CacheStats(errors=self.stats.errors + 1)


class AdvancedCache:
    """High-level cache interface with intelligent features."""

    def __init__(self, config: CacheConfig | None = None):
        self.config = config or CacheConfig.from_env()
        self.backend: CacheBackendInterface | None = None
        self._refresh_tasks: dict[str, asyncio.Task] = {}
        self._invalidation_tags: dict[str, list[str]] = {}

        # Initialize backend
        if self.config.backend == CacheBackend.MEMORY:
            self.backend = MemoryCacheBackend(self.config)
        elif self.config.backend == CacheBackend.REDIS:
            self.backend = RedisCacheBackend(self.config)
        elif self.config.backend == CacheBackend.HYBRID:
            # Implement hybrid backend (memory for hot data, Redis for cold)
            self.backend = RedisCacheBackend(self.config)  # Simplified for now

        logger.info(f"Cache initialized with {self.config.backend.value} backend")

    async def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache with optional default."""
        try:
            value = await self.backend.get(key)

            if value is None:
                logger.debug(f"Cache miss: {key}")
                return default

            # Schedule auto-refresh if enabled
            if self.config.auto_refresh_enabled:
                await self._schedule_auto_refresh(key, value)

            logger.debug(f"Cache hit: {key}")
            return value

        except Exception as e:
            logger.error(f"Cache get error for key '{key}': {e}")
            return default

    async def set(
        self, key: str, value: Any, ttl: int | None = None, tags: list[str] = None
    ) -> bool:
        """Set value in cache with optional TTL and tags."""
        try:
            success = await self.backend.set(key, value, ttl or self.config.default_ttl)

            if success and tags:
                # Track tags for invalidation
                for tag in tags:
                    if tag not in self._invalidation_tags:
                        self._invalidation_tags[tag] = []
                    self._invalidation_tags[tag].append(key)

            if success:
                logger.debug(
                    f"Cache set: {key} (TTL: {ttl or self.config.default_ttl}s)"
                )

            return success

        except Exception as e:
            logger.error(f"Cache set error for key '{key}': {e}")
            return False

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Any],
        ttl: int | None = None,
        tags: list[str] = None,
    ) -> Any:
        """Get from cache or set using factory function."""
        value = await self.get(key)

        if value is not None:
            return value

        # Generate new value
        try:
            if asyncio.iscoroutinefunction(factory):
                new_value = await factory()
            else:
                new_value = factory()

            await self.set(key, new_value, ttl, tags)
            return new_value

        except Exception as e:
            logger.error(f"Factory function error for key '{key}': {e}")
            return None

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        success = await self.backend.delete(key)

        # Cancel auto-refresh task if exists
        if key in self._refresh_tasks:
            self._refresh_tasks[key].cancel()
            del self._refresh_tasks[key]

        return success

    async def invalidate_by_tags(self, tags: list[str]) -> int:
        """Invalidate all keys with specified tags."""
        keys_to_delete = set()

        for tag in tags:
            if tag in self._invalidation_tags:
                keys_to_delete.update(self._invalidation_tags[tag])
                del self._invalidation_tags[tag]

        deleted_count = 0
        for key in keys_to_delete:
            if await self.delete(key):
                deleted_count += 1

        logger.info(f"Invalidated {deleted_count} keys by tags: {tags}")
        return deleted_count

    async def clear(self) -> bool:
        """Clear entire cache."""
        success = await self.backend.clear()

        # Cancel all auto-refresh tasks
        for task in self._refresh_tasks.values():
            task.cancel()
        self._refresh_tasks.clear()
        self._invalidation_tags.clear()

        return success

    async def get_stats(self) -> dict[str, Any]:
        """Get comprehensive cache statistics."""
        backend_stats = await self.backend.get_stats()

        return {
            "backend": self.config.backend.value,
            "hit_rate": backend_stats.hit_rate,
            "miss_rate": backend_stats.miss_rate,
            "hits": backend_stats.hits,
            "misses": backend_stats.misses,
            "sets": backend_stats.sets,
            "deletes": backend_stats.deletes,
            "evictions": backend_stats.evictions,
            "errors": backend_stats.errors,
            "total_size_bytes": backend_stats.total_size_bytes,
            "entry_count": backend_stats.entry_count,
            "auto_refresh_tasks": len(self._refresh_tasks),
            "invalidation_tags": len(self._invalidation_tags),
        }

    async def _schedule_auto_refresh(self, key: str, current_value: Any):
        """Schedule auto-refresh for a cache entry."""
        if key in self._refresh_tasks:
            return  # Already scheduled

        # Calculate refresh time (80% of TTL)
        refresh_delay = self.config.default_ttl * self.config.auto_refresh_threshold

        async def refresh_task():
            try:
                await asyncio.sleep(refresh_delay)

                # Check if key still exists
                if await self.backend.exists(key):
                    logger.debug(f"Auto-refreshing cache key: {key}")
                    # Here you would typically call the original factory function
                    # For now, we just extend the TTL
                    await self.backend.set(key, current_value, self.config.default_ttl)

            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Auto-refresh error for key '{key}': {e}")
            finally:
                self._refresh_tasks.pop(key, None)

        self._refresh_tasks[key] = asyncio.create_task(refresh_task())


# Global cache instance
_cache_instance: AdvancedCache | None = None


def get_cache() -> AdvancedCache:
    """Get global cache instance."""
    global _cache_instance

    if _cache_instance is None:
        _cache_instance = AdvancedCache()

    return _cache_instance


# Decorators for caching
def cached(
    ttl: int | None = None, tags: list[str] = None, key_func: Callable | None = None
):
    """Decorator for caching function results."""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache = get_cache()

            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                func_name = f"{func.__module__}.{func.__qualname__}"
                args_str = str(args) + str(sorted(kwargs.items()))
                key_hash = hashlib.md5(args_str.encode()).hexdigest()
                cache_key = f"{func_name}:{key_hash}"

            # Try to get from cache
            result = await cache.get(cache_key)
            if result is not None:
                return result

            # Execute function and cache result
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            await cache.set(cache_key, result, ttl, tags)
            return result

        return wrapper

    return decorator
