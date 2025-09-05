#!/usr/bin/env python3
"""
KV Cache Manager for MLX Models with Token Rotation

Implements a sophisticated key-value cache management system for MLX models
with 4096 token rotation, intelligent eviction policies, and performance
optimization for Cortex OS.

Key Features:
- 4096 token sliding window with smart rotation
- Memory-efficient storage with compression
- Per-model cache isolation
- Intelligent prefetching and eviction
- Real-time performance metrics
- Thread-safe operations
"""

import hashlib
import json
import logging
import pickle
import threading
import time
from collections import OrderedDict, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import lz4.frame
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Single cache entry with metadata"""

    key_hash: str
    tokens: list[int]
    kv_states: np.ndarray
    created_at: float
    last_accessed: float
    access_count: int
    model_name: str
    token_count: int
    compressed_size: int
    is_compressed: bool = False

    def age_seconds(self) -> float:
        """Age of the entry in seconds"""
        return time.time() - self.created_at

    def access_frequency(self) -> float:
        """Access frequency per second"""
        age = self.age_seconds()
        if age <= 0:
            return float(self.access_count)
        return self.access_count / age


@dataclass
class CacheMetrics:
    """Performance metrics for the cache"""

    total_entries: int = 0
    memory_usage_mb: float = 0.0
    hit_rate: float = 0.0
    miss_rate: float = 0.0
    eviction_count: int = 0
    compression_ratio: float = 0.0
    average_access_time_ms: float = 0.0
    cache_size_mb: float = 0.0
    rotation_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary"""
        return {
            "total_entries": self.total_entries,
            "memory_usage_mb": self.memory_usage_mb,
            "hit_rate": self.hit_rate,
            "miss_rate": self.miss_rate,
            "eviction_count": self.eviction_count,
            "compression_ratio": self.compression_ratio,
            "average_access_time_ms": self.average_access_time_ms,
            "cache_size_mb": self.cache_size_mb,
            "rotation_count": self.rotation_count,
        }


class KVCacheManager:
    """
    Advanced KV Cache Manager for MLX Models

    Manages key-value caches for multiple MLX models with intelligent
    rotation, compression, and eviction policies optimized for performance.
    """

    def __init__(
        self,
        cache_dir: str | None = None,
        max_token_window: int = 4096,
        max_memory_mb: int = 2048,  # 2GB default limit
        compression_enabled: bool = True,
        prefetch_enabled: bool = True,
        persistence_enabled: bool = True,
    ):
        """
        Initialize KV Cache Manager

        Args:
            cache_dir: Directory for persistent cache storage
            max_token_window: Maximum tokens in sliding window
            max_memory_mb: Maximum memory usage in MB
            compression_enabled: Enable LZ4 compression
            prefetch_enabled: Enable intelligent prefetching
            persistence_enabled: Enable disk persistence
        """
        self.cache_dir = (
            Path(cache_dir) if cache_dir else Path.home() / ".cortex" / "mlx_cache"
        )
        self.max_token_window = max_token_window
        self.max_memory_mb = max_memory_mb
        self.compression_enabled = compression_enabled
        self.prefetch_enabled = prefetch_enabled
        self.persistence_enabled = persistence_enabled

        # Thread-safe cache storage
        self._lock = threading.RLock()
        self._cache: dict[str, CacheEntry] = OrderedDict()
        self._model_caches: dict[str, list[str]] = defaultdict(list)

        # Performance tracking
        self._metrics = CacheMetrics()
        self._hits = 0
        self._misses = 0
        self._access_times: list[float] = []

        # Background maintenance
        self._maintenance_thread: threading.Thread | None = None
        self._shutdown_event = threading.Event()

        # Initialize
        self._setup_cache_directory()
        if self.persistence_enabled:
            self._load_persistent_cache()
        self._start_maintenance_thread()

        logger.info(f"KV Cache Manager initialized: {self.cache_dir}")
        logger.info(
            f"Config: window={max_token_window}, memory={max_memory_mb}MB, compression={compression_enabled}"
        )

    def _setup_cache_directory(self):
        """Setup cache directory structure"""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        (self.cache_dir / "models").mkdir(exist_ok=True)
        (self.cache_dir / "metadata").mkdir(exist_ok=True)

    def _generate_cache_key(
        self, model_name: str, tokens: list[int], context_hash: str = ""
    ) -> str:
        """Generate deterministic cache key"""
        # Create hash from model, tokens, and context
        content = f"{model_name}:{','.join(map(str, tokens))}:{context_hash}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _compress_kv_states(self, kv_states: np.ndarray) -> bytes:
        """Compress KV states using LZ4

        WARNING: Uses pickle for numpy array serialization - only use with trusted data.
        This is safe for internal KV cache states as they don't come from user input.
        """
        if not isinstance(kv_states, np.ndarray):
            raise TypeError("KV states must be numpy arrays for security")

        if not self.compression_enabled:
            return pickle.dumps(kv_states)

        # Serialize and compress
        serialized = pickle.dumps(kv_states)
        compressed = lz4.frame.compress(serialized)
        return compressed

    def _decompress_kv_states(
        self, compressed_data: bytes, is_compressed: bool = True
    ) -> np.ndarray:
        """Decompress KV states"""
        if not is_compressed or not self.compression_enabled:
            return pickle.loads(compressed_data)

        # Decompress and deserialize
        decompressed = lz4.frame.decompress(compressed_data)
        return pickle.loads(decompressed)

    def put(
        self,
        model_name: str,
        tokens: list[int],
        kv_states: np.ndarray,
        context_hash: str = "",
    ) -> str:
        """
        Store KV states in cache with automatic rotation

        Args:
            model_name: Name of the MLX model
            tokens: Input token sequence
            kv_states: Key-value states from the model
            context_hash: Optional context identifier

        Returns:
            Cache key for the stored entry
        """
        start_time = time.time()

        with self._lock:
            # Apply token window rotation if needed
            tokens = self._apply_token_rotation(tokens)

            # Generate cache key
            cache_key = self._generate_cache_key(model_name, tokens, context_hash)

            # Check if we need to evict entries
            self._enforce_memory_limit()

            # Compress KV states if enabled
            if self.compression_enabled:
                compressed_data = self._compress_kv_states(kv_states)
                compressed_size = len(compressed_data)
                is_compressed = True
            else:
                compressed_data = kv_states
                compressed_size = kv_states.nbytes
                is_compressed = False

            # Create cache entry
            entry = CacheEntry(
                key_hash=cache_key,
                tokens=tokens,
                kv_states=compressed_data,
                created_at=time.time(),
                last_accessed=time.time(),
                access_count=1,
                model_name=model_name,
                token_count=len(tokens),
                compressed_size=compressed_size,
                is_compressed=is_compressed,
            )

            # Store entry
            self._cache[cache_key] = entry
            self._model_caches[model_name].append(cache_key)

            # Update metrics
            self._metrics.total_entries = len(self._cache)
            self._update_memory_usage()

            # Persist if enabled
            if self.persistence_enabled:
                self._persist_entry(cache_key, entry)

            access_time = (time.time() - start_time) * 1000  # Convert to ms
            self._access_times.append(access_time)

            logger.debug(
                f"Cached KV states: {cache_key} ({len(tokens)} tokens, {compressed_size} bytes)"
            )
            return cache_key

    def get(
        self, model_name: str, tokens: list[int], context_hash: str = ""
    ) -> tuple[np.ndarray, str] | None:
        """
        Retrieve KV states from cache

        Args:
            model_name: Name of the MLX model
            tokens: Input token sequence
            context_hash: Optional context identifier

        Returns:
            Tuple of (kv_states, cache_key) if found, None otherwise
        """
        start_time = time.time()

        with self._lock:
            # Apply token rotation for consistent lookup
            tokens = self._apply_token_rotation(tokens)

            # Generate cache key
            cache_key = self._generate_cache_key(model_name, tokens, context_hash)

            # Look for entry
            entry = self._cache.get(cache_key)

            if entry is None:
                # Check for partial matches with different token windows
                partial_key = self._find_partial_match(model_name, tokens)
                if partial_key:
                    entry = self._cache.get(partial_key)
                    cache_key = partial_key

            if entry is not None:
                # Cache hit
                self._hits += 1
                entry.last_accessed = time.time()
                entry.access_count += 1

                # Move to end (LRU)
                self._cache.move_to_end(cache_key)

                # Decompress KV states
                kv_states = self._decompress_kv_states(
                    entry.kv_states, entry.is_compressed
                )

                access_time = (time.time() - start_time) * 1000
                self._access_times.append(access_time)

                logger.debug(
                    f"Cache hit: {cache_key} (accessed {entry.access_count} times)"
                )
                return kv_states, cache_key
            else:
                # Cache miss
                self._misses += 1
                access_time = (time.time() - start_time) * 1000
                self._access_times.append(access_time)

                logger.debug(
                    f"Cache miss for model {model_name} with {len(tokens)} tokens"
                )
                return None

    def _apply_token_rotation(self, tokens: list[int]) -> list[int]:
        """Apply 4096 token sliding window rotation"""
        if len(tokens) <= self.max_token_window:
            return tokens

        # Keep the most recent tokens within the window
        rotated_tokens = tokens[-self.max_token_window :]

        with self._lock:
            self._metrics.rotation_count += 1

        logger.debug(
            f"Applied token rotation: {len(tokens)} -> {len(rotated_tokens)} tokens"
        )
        return rotated_tokens

    def _find_partial_match(self, model_name: str, tokens: list[int]) -> str | None:
        """Find partial token sequence matches for cache reuse"""
        if not self.prefetch_enabled:
            return None

        model_keys = self._model_caches.get(model_name, [])

        # Look for entries with overlapping token sequences
        for key in reversed(model_keys):  # Most recent first
            entry = self._cache.get(key)
            if entry is None:
                continue

            # Check for suffix match (common in autoregressive generation)
            if (
                len(entry.tokens) >= len(tokens)
                and entry.tokens[-len(tokens) :] == tokens
            ):
                return key

            # Check for prefix match
            common_length = min(len(entry.tokens), len(tokens))
            if (
                common_length > self.max_token_window // 2
                and entry.tokens[:common_length] == tokens[:common_length]
            ):
                return key

        return None

    def _enforce_memory_limit(self):
        """Enforce memory usage limits with intelligent eviction"""
        current_usage_mb = self._calculate_memory_usage()

        if current_usage_mb <= self.max_memory_mb:
            return

        logger.info(
            f"Memory limit exceeded: {current_usage_mb:.1f}MB > {self.max_memory_mb}MB"
        )

        # Evict entries using weighted LRU algorithm
        target_usage = self.max_memory_mb * 0.8  # Target 80% after eviction

        # Score entries for eviction (lower score = more likely to evict)
        entries_with_scores = []
        for key, entry in self._cache.items():
            score = self._calculate_eviction_score(entry)
            entries_with_scores.append((score, key, entry))

        # Sort by eviction score (lowest first)
        entries_with_scores.sort(key=lambda x: x[0])

        # Evict entries until under target usage
        evicted_count = 0
        for score, key, entry in entries_with_scores:
            if current_usage_mb <= target_usage:
                break

            # Remove from cache
            del self._cache[key]

            # Remove from model cache list
            if entry.model_name in self._model_caches:
                self._model_caches[entry.model_name] = [
                    k for k in self._model_caches[entry.model_name] if k != key
                ]

            current_usage_mb -= entry.compressed_size / (1024 * 1024)
            evicted_count += 1

            logger.debug(f"Evicted cache entry: {key} (score: {score:.3f})")

        self._metrics.eviction_count += evicted_count
        logger.info(
            f"Evicted {evicted_count} entries, new usage: {current_usage_mb:.1f}MB"
        )

    def _calculate_eviction_score(self, entry: CacheEntry) -> float:
        """Calculate eviction score (lower = more likely to evict)"""
        # Factors:
        # - Age (older entries more likely to evict)
        # - Access frequency (less frequently accessed more likely to evict)
        # - Size (larger entries more likely to evict)
        # - Model priority (always_on models less likely to evict)

        age_weight = 0.3
        frequency_weight = 0.4
        size_weight = 0.2
        priority_weight = 0.1

        # Age score (0-1, higher = older)
        max_age = 3600  # 1 hour
        age_score = min(entry.age_seconds() / max_age, 1.0)

        # Frequency score (0-1, higher = more frequent)
        max_frequency = 10  # accesses per second
        frequency_score = min(entry.access_frequency() / max_frequency, 1.0)

        # Size score (0-1, higher = larger)
        max_size = 10 * 1024 * 1024  # 10MB
        size_score = min(entry.compressed_size / max_size, 1.0)

        # Priority score based on model type
        priority_score = 0.5  # Default
        if "gemma" in entry.model_name.lower() or "phi3" in entry.model_name.lower():
            priority_score = 0.1  # Always-on models have low priority for eviction
        elif "qwen" in entry.model_name.lower():
            priority_score = 0.3  # Frequent models have medium priority

        # Lower score = more likely to evict
        eviction_score = (
            age_weight * age_score
            + frequency_weight * (1.0 - frequency_score)  # Invert frequency
            + size_weight * size_score
            + priority_weight * priority_score
        )

        return eviction_score

    def _calculate_memory_usage(self) -> float:
        """Calculate current memory usage in MB"""
        total_bytes = sum(entry.compressed_size for entry in self._cache.values())
        return total_bytes / (1024 * 1024)

    def _update_memory_usage(self):
        """Update memory usage metrics"""
        self._metrics.memory_usage_mb = self._calculate_memory_usage()
        self._metrics.cache_size_mb = self._metrics.memory_usage_mb

        # Update hit/miss rates
        total_requests = self._hits + self._misses
        if total_requests > 0:
            self._metrics.hit_rate = self._hits / total_requests
            self._metrics.miss_rate = self._misses / total_requests

        # Update average access time
        if self._access_times:
            self._metrics.average_access_time_ms = sum(self._access_times) / len(
                self._access_times
            )
            # Keep only recent access times (last 1000)
            if len(self._access_times) > 1000:
                self._access_times = self._access_times[-1000:]

        # Update compression ratio
        if self.compression_enabled and self._cache:
            total_compressed = sum(
                entry.compressed_size for entry in self._cache.values()
            )
            total_uncompressed = sum(
                entry.kv_states.nbytes
                if hasattr(entry.kv_states, "nbytes")
                else len(entry.kv_states)
                for entry in self._cache.values()
            )
            if total_uncompressed > 0:
                self._metrics.compression_ratio = total_compressed / total_uncompressed

    def clear_model_cache(self, model_name: str) -> int:
        """Clear all cache entries for a specific model"""
        with self._lock:
            model_keys = self._model_caches.get(model_name, [])
            cleared_count = 0

            for key in model_keys:
                if key in self._cache:
                    del self._cache[key]
                    cleared_count += 1

            # Clear model cache list
            self._model_caches[model_name] = []

            logger.info(
                f"Cleared {cleared_count} cache entries for model: {model_name}"
            )
            return cleared_count

    def clear_all(self):
        """Clear all cache entries"""
        with self._lock:
            cleared_count = len(self._cache)
            self._cache.clear()
            self._model_caches.clear()

            # Reset metrics
            self._hits = 0
            self._misses = 0
            self._access_times.clear()

            logger.info(f"Cleared all {cleared_count} cache entries")

    def get_metrics(self) -> CacheMetrics:
        """Get current cache performance metrics"""
        with self._lock:
            self._update_memory_usage()
            return self._metrics

    def get_cache_info(self) -> dict[str, Any]:
        """Get detailed cache information"""
        with self._lock:
            model_stats = {}
            for model_name, keys in self._model_caches.items():
                entries = [self._cache[key] for key in keys if key in self._cache]
                model_stats[model_name] = {
                    "entry_count": len(entries),
                    "total_tokens": sum(entry.token_count for entry in entries),
                    "memory_mb": sum(entry.compressed_size for entry in entries)
                    / (1024 * 1024),
                    "avg_access_count": sum(entry.access_count for entry in entries)
                    / len(entries)
                    if entries
                    else 0,
                }

            return {
                "total_entries": len(self._cache),
                "memory_usage_mb": self._calculate_memory_usage(),
                "hit_rate": self._metrics.hit_rate,
                "model_stats": model_stats,
                "cache_config": {
                    "max_token_window": self.max_token_window,
                    "max_memory_mb": self.max_memory_mb,
                    "compression_enabled": self.compression_enabled,
                    "prefetch_enabled": self.prefetch_enabled,
                },
            }

    def _persist_entry(self, cache_key: str, entry: CacheEntry):
        """Persist cache entry to disk"""
        try:
            model_dir = self.cache_dir / "models" / entry.model_name
            model_dir.mkdir(exist_ok=True)

            entry_file = model_dir / f"{cache_key}.cache"
            with open(entry_file, "wb") as f:
                pickle.dump(entry, f)

        except Exception as e:
            logger.warning(f"Failed to persist cache entry {cache_key}: {e}")

    def _load_persistent_cache(self):
        """Load cache entries from disk"""
        try:
            models_dir = self.cache_dir / "models"
            if not models_dir.exists():
                return

            loaded_count = 0
            for model_dir in models_dir.iterdir():
                if not model_dir.is_dir():
                    continue

                model_name = model_dir.name
                for cache_file in model_dir.glob("*.cache"):
                    try:
                        with open(cache_file, "rb") as f:
                            entry = pickle.load(f)

                        # Validate entry
                        if isinstance(entry, CacheEntry):
                            self._cache[entry.key_hash] = entry
                            self._model_caches[model_name].append(entry.key_hash)
                            loaded_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to load cache file {cache_file}: {e}")

            logger.info(f"Loaded {loaded_count} persistent cache entries")

        except Exception as e:
            logger.warning(f"Failed to load persistent cache: {e}")

    def _start_maintenance_thread(self):
        """Start background maintenance thread"""

        def maintenance_loop():
            while not self._shutdown_event.wait(30):  # Run every 30 seconds
                try:
                    # Update metrics
                    self._update_memory_usage()

                    # Enforce memory limits
                    if self._calculate_memory_usage() > self.max_memory_mb:
                        self._enforce_memory_limit()

                    # Clean up old entries (older than 1 hour)
                    with self._lock:
                        current_time = time.time()
                        keys_to_remove = []

                        for key, entry in self._cache.items():
                            if current_time - entry.last_accessed > 3600:  # 1 hour
                                keys_to_remove.append(key)

                        for key in keys_to_remove:
                            entry = self._cache[key]
                            del self._cache[key]

                            # Remove from model cache
                            if entry.model_name in self._model_caches:
                                self._model_caches[entry.model_name] = [
                                    k
                                    for k in self._model_caches[entry.model_name]
                                    if k != key
                                ]

                    if keys_to_remove:
                        logger.debug(
                            f"Cleaned up {len(keys_to_remove)} old cache entries"
                        )

                except Exception as e:
                    logger.error(f"Error in cache maintenance: {e}")

        self._maintenance_thread = threading.Thread(
            target=maintenance_loop, daemon=True
        )
        self._maintenance_thread.start()
        logger.info("Started cache maintenance thread")

    def shutdown(self):
        """Shutdown the cache manager"""
        logger.info("Shutting down KV Cache Manager...")

        # Stop maintenance thread
        self._shutdown_event.set()
        if self._maintenance_thread:
            self._maintenance_thread.join(timeout=5)

        # Persist all entries if enabled
        if self.persistence_enabled:
            with self._lock:
                persist_count = 0
                for key, entry in self._cache.items():
                    try:
                        self._persist_entry(key, entry)
                        persist_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to persist entry {key}: {e}")

                logger.info(f"Persisted {persist_count} cache entries")

        logger.info("KV Cache Manager shutdown complete")


# Global cache manager instance
_cache_manager: KVCacheManager | None = None


def get_cache_manager(**kwargs) -> KVCacheManager:
    """Get or create global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = KVCacheManager(**kwargs)
    return _cache_manager


def create_cache_manager(**kwargs) -> KVCacheManager:
    """Create a new cache manager instance"""
    return KVCacheManager(**kwargs)


# Example usage and testing
if __name__ == "__main__":
    import time

    import numpy as np

    logging.basicConfig(level=logging.INFO)

    # Create cache manager
    cache = KVCacheManager(
        cache_dir="/tmp/test_cache",
        max_token_window=4096,
        max_memory_mb=100,  # 100MB for testing
        compression_enabled=True,
    )

    try:
        # Test data
        model_name = "gemma-3-270m"
        tokens = list(range(1000))  # 1000 tokens
        kv_states = np.random.rand(32, 1000, 64).astype(np.float32)  # Mock KV states

        print(f"Original KV states size: {kv_states.nbytes / 1024 / 1024:.1f}MB")

        # Store in cache
        cache_key = cache.put(model_name, tokens, kv_states)
        print(f"Stored with cache key: {cache_key}")

        # Retrieve from cache
        result = cache.get(model_name, tokens)
        if result:
            retrieved_states, retrieved_key = result
            print(f"Retrieved successfully: {retrieved_key}")
            print(f"States match: {np.allclose(kv_states, retrieved_states)}")
        else:
            print("Cache miss!")

        # Test token rotation
        long_tokens = list(range(5000))  # Exceeds 4096 window
        cache_key2 = cache.put(model_name, long_tokens, kv_states)
        print(f"Stored long sequence with rotation: {cache_key2}")

        # Show metrics
        metrics = cache.get_metrics()
        print(f"Cache metrics: {metrics.to_dict()}")

        # Show cache info
        info = cache.get_cache_info()
        print(f"Cache info: {json.dumps(info, indent=2)}")

    finally:
        cache.shutdown()
