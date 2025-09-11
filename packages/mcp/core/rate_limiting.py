"""Advanced rate limiting system with Redis backend and multiple algorithms."""

import hashlib
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

# Optional Redis dependency; guard import and provide memory fallback
try:  # pragma: no cover - import guard
    import redis.asyncio as redis  # type: ignore
    from redis.asyncio import Redis  # type: ignore
    _REDIS_AVAILABLE = True
except Exception:  # pragma: no cover - fallback path
    redis = None  # type: ignore
    Redis = None  # type: ignore
    _REDIS_AVAILABLE = False

from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class RateLimitAlgorithm(Enum):
    """Supported rate limiting algorithms."""

    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"
    LEAKY_BUCKET = "leaky_bucket"


@dataclass
class RateLimitRule:
    """Rate limit rule configuration."""

    key: str
    algorithm: RateLimitAlgorithm
    limit: int  # Max requests
    window_seconds: int  # Time window
    burst_limit: int | None = None  # Burst capacity (for token bucket)
    description: str = ""
    enabled: bool = True

    # Advanced settings
    grace_period_seconds: int = 0
    block_duration_seconds: int = 0  # How long to block after limit exceeded
    progressive_penalties: list[tuple[int, int]] = field(
        default_factory=list
    )  # (violation_count, penalty_seconds)

    # Grouping and exemptions
    group: str | None = None
    exempt_users: list[str] = field(default_factory=list)
    exempt_ips: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.burst_limit is None:
            self.burst_limit = self.limit * 2


@dataclass
class RateLimitResult:
    """Result of rate limit check."""

    allowed: bool
    limit: int
    remaining: int
    reset_time: int  # Unix timestamp when limit resets
    retry_after: int | None = None  # Seconds to wait before retrying

    # Extended info
    algorithm: str = ""
    rule_key: str = ""
    identifier: str = ""
    current_usage: int = 0
    window_start: int = 0
    violation_count: int = 0
    blocked_until: int | None = None


class RateLimitBackend(ABC):
    """Abstract base class for rate limit backends."""

    @abstractmethod
    async def check_rate_limit(
        self, identifier: str, rule: RateLimitRule
    ) -> RateLimitResult:
        """Check if request is within rate limit."""
        pass

    @abstractmethod
    async def reset_rate_limit(self, identifier: str, rule: RateLimitRule) -> bool:
        """Reset rate limit for identifier."""
        pass

    @abstractmethod
    async def get_usage_stats(
        self, identifier: str, rule: RateLimitRule
    ) -> dict[str, Any]:
        """Get usage statistics for identifier."""
        pass

    @abstractmethod
    async def cleanup_expired(self) -> int:
        """Clean up expired rate limit data."""
        pass


class RedisRateLimitBackend(RateLimitBackend):
    """Redis-based rate limiting with Lua scripts for atomicity."""

    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.lua_scripts = {}
        self._load_lua_scripts()

    def _load_lua_scripts(self):
        """Load Lua scripts for atomic operations."""

        # Token bucket algorithm
        self.lua_scripts["token_bucket"] = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_rate = tonumber(ARGV[2])
            local window = tonumber(ARGV[3])
            local requested = tonumber(ARGV[4]) or 1
            local now = tonumber(ARGV[5])

            local current = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(current[1]) or capacity
            local last_refill = tonumber(current[2]) or now

            -- Calculate tokens to add based on time elapsed
            local elapsed = now - last_refill
            local tokens_to_add = math.floor(elapsed * refill_rate / window)
            tokens = math.min(capacity, tokens + tokens_to_add)

            local allowed = tokens >= requested
            local remaining = tokens

            if allowed then
                remaining = tokens - requested
            end

            -- Update state
            redis.call('HMSET', key,
                'tokens', remaining,
                'last_refill', now,
                'last_access', now)
            redis.call('EXPIRE', key, window * 2)

            return {allowed and 1 or 0, remaining, capacity, now + window}
        """

        # Sliding window counter
        self.lua_scripts["sliding_window"] = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local requested = tonumber(ARGV[4]) or 1

            -- Remove old entries
            redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

            -- Get current count
            local current = redis.call('ZCARD', key)
            local allowed = (current + requested) <= limit
            local remaining = math.max(0, limit - current)

            if allowed then
                -- Add new entries with microsecond precision
                for i = 1, requested do
                    redis.call('ZADD', key, now * 1000 + i, now * 1000 + i)
                end
                remaining = remaining - requested
            end

            redis.call('EXPIRE', key, window)

            return {allowed and 1 or 0, remaining, limit, now + window}
        """

        # Fixed window counter
        self.lua_scripts["fixed_window"] = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local requested = tonumber(ARGV[4]) or 1

            local window_start = math.floor(now / window) * window
            local window_key = key .. ':' .. window_start

            local current = tonumber(redis.call('GET', window_key)) or 0
            local allowed = (current + requested) <= limit
            local remaining = math.max(0, limit - current)

            if allowed then
                redis.call('INCRBY', window_key, requested)
                remaining = remaining - requested
            else
                redis.call('SET', window_key, current)
            end

            redis.call('EXPIRE', window_key, window)

        return {allowed and 1 or 0, remaining, limit, window_start + window}
        """

        # Leaky bucket algorithm
        self.lua_scripts["leaky_bucket"] = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local leak_rate = tonumber(ARGV[2])
            local window = tonumber(ARGV[3])
            local requested = tonumber(ARGV[4]) or 1
            local now = tonumber(ARGV[5])

            local current = redis.call('HMGET', key, 'volume', 'last_leak')
            local volume = tonumber(current[1]) or 0
            local last_leak = tonumber(current[2]) or now

            -- Calculate volume after leaking
            local elapsed = now - last_leak
            local leaked = math.floor(elapsed * leak_rate / window)
            volume = math.max(0, volume - leaked)

            local allowed = (volume + requested) <= capacity
            local remaining = capacity - volume

            if allowed then
                volume = volume + requested
                remaining = remaining - requested
            end

            -- Update state
            redis.call('HMSET', key,
                'volume', volume,
                'last_leak', now,
                'last_access', now)
            redis.call('EXPIRE', key, window * 2)

            return {allowed and 1 or 0, remaining, capacity, now + window}
        """

    async def check_rate_limit(
        self, identifier: str, rule: RateLimitRule
    ) -> RateLimitResult:
        """Check rate limit using specified algorithm."""
        if not rule.enabled:
            return RateLimitResult(
                allowed=True,
                limit=rule.limit,
                remaining=rule.limit,
                reset_time=int(time.time() + rule.window_seconds),
                algorithm=rule.algorithm.value,
                rule_key=rule.key,
                identifier=identifier,
            )

        now = time.time()
        key = self._get_redis_key(rule.key, identifier)

        try:
            # Check if blocked from previous violations
            block_key = f"{key}:blocked"
            blocked_until = await self.redis.get(block_key)
            if blocked_until and int(blocked_until) > now:
                return RateLimitResult(
                    allowed=False,
                    limit=rule.limit,
                    remaining=0,
                    reset_time=int(blocked_until),
                    retry_after=int(blocked_until) - int(now),
                    algorithm=rule.algorithm.value,
                    rule_key=rule.key,
                    identifier=identifier,
                    blocked_until=int(blocked_until),
                )

            # Execute rate limiting algorithm
            result = await self._execute_algorithm(key, rule, now)
            allowed, remaining, limit, reset_time = result

            # Handle violations
            if not allowed:
                await self._handle_violation(identifier, rule, key)
                metrics.record_rate_limit_hit(rule.key, "rate_limit")

            # Record metrics
            metrics.request_counter.labels(
                method="rate_limit_check",
                status="allowed" if allowed else "denied",
                plugin="rate_limiting",
                transport="internal",
            ).inc()

            return RateLimitResult(
                allowed=bool(allowed),
                limit=limit,
                remaining=int(remaining),
                reset_time=int(reset_time),
                algorithm=rule.algorithm.value,
                rule_key=rule.key,
                identifier=identifier,
                current_usage=limit - int(remaining),
            )

        except Exception as e:
            logger.error(
                "Rate limit check failed",
                identifier=identifier,
                rule_key=rule.key,
                error=str(e),
                exc_info=True,
            )
            metrics.record_error("rate_limit_check_failed", "rate_limiting")

            # Fail open - allow request but log error
            return RateLimitResult(
                allowed=True,
                limit=rule.limit,
                remaining=rule.limit,
                reset_time=int(now + rule.window_seconds),
                algorithm=rule.algorithm.value,
                rule_key=rule.key,
                identifier=identifier,
            )

    async def _execute_algorithm(
        self, key: str, rule: RateLimitRule, now: float
    ) -> tuple[int, int, int, int]:
        """Execute the appropriate rate limiting algorithm."""
        script = self.lua_scripts.get(rule.algorithm.value)
        if not script:
            raise ValueError(f"Unsupported algorithm: {rule.algorithm}")

        if rule.algorithm == RateLimitAlgorithm.TOKEN_BUCKET:
            refill_rate = rule.limit / rule.window_seconds
            return await self.redis.eval(
                script,
                1,
                key,
                rule.burst_limit or rule.limit,  # capacity
                refill_rate,  # refill rate
                rule.window_seconds,  # window
                1,  # requested tokens
                int(now),  # current time
            )

        elif rule.algorithm in (
            RateLimitAlgorithm.SLIDING_WINDOW,
            RateLimitAlgorithm.FIXED_WINDOW,
        ):
            return await self.redis.eval(
                script,
                1,
                key,
                rule.limit,  # limit
                rule.window_seconds,  # window
                int(now),  # current time
                1,  # requested count
            )

        elif rule.algorithm == RateLimitAlgorithm.LEAKY_BUCKET:
            leak_rate = rule.limit / rule.window_seconds
            return await self.redis.eval(
                script,
                1,
                key,
                rule.limit,  # capacity
                leak_rate,  # leak rate
                rule.window_seconds,  # window
                1,  # requested volume
                int(now),  # current time
            )

        else:
            raise ValueError(f"Algorithm {rule.algorithm} not implemented")

    async def _handle_violation(self, identifier: str, rule: RateLimitRule, key: str):
        """Handle rate limit violations with progressive penalties."""
        if rule.block_duration_seconds > 0:
            block_key = f"{key}:blocked"
            block_until = time.time() + rule.block_duration_seconds
            await self.redis.setex(
                block_key, rule.block_duration_seconds, int(block_until)
            )

        # Track violation count for progressive penalties
        if rule.progressive_penalties:
            violation_key = f"{key}:violations"
            violations = await self.redis.incr(violation_key)
            await self.redis.expire(
                violation_key, rule.window_seconds * 10
            )  # Keep violation history

            # Apply progressive penalty
            for violation_threshold, penalty_seconds in rule.progressive_penalties:
                if violations >= violation_threshold:
                    penalty_key = f"{key}:penalty"
                    penalty_until = time.time() + penalty_seconds
                    await self.redis.setex(
                        penalty_key, penalty_seconds, int(penalty_until)
                    )

                    logger.warning(
                        "Progressive penalty applied",
                        identifier=identifier,
                        rule_key=rule.key,
                        violations=violations,
                        penalty_seconds=penalty_seconds,
                    )
                    break

    async def reset_rate_limit(self, identifier: str, rule: RateLimitRule) -> bool:
        """Reset rate limit for identifier."""
        try:
            key = self._get_redis_key(rule.key, identifier)

            # Delete all related keys
            keys_to_delete = [
                key,
                f"{key}:blocked",
                f"{key}:violations",
                f"{key}:penalty",
            ]

            # For fixed window, we need to delete window-specific keys
            if rule.algorithm == RateLimitAlgorithm.FIXED_WINDOW:
                now = time.time()
                window_start = int(now // rule.window_seconds) * rule.window_seconds
                keys_to_delete.append(f"{key}:{window_start}")

            deleted_count = await self.redis.delete(*keys_to_delete)

            logger.info(
                "Rate limit reset",
                identifier=identifier,
                rule_key=rule.key,
                deleted_keys=deleted_count,
            )

            return deleted_count > 0

        except Exception as e:
            logger.error(
                "Failed to reset rate limit",
                identifier=identifier,
                rule_key=rule.key,
                error=str(e),
            )
            return False

    async def get_usage_stats(
        self, identifier: str, rule: RateLimitRule
    ) -> dict[str, Any]:
        """Get detailed usage statistics."""
        key = self._get_redis_key(rule.key, identifier)
        now = time.time()

        try:
            stats = {
                "identifier": identifier,
                "rule_key": rule.key,
                "algorithm": rule.algorithm.value,
                "limit": rule.limit,
                "window_seconds": rule.window_seconds,
                "timestamp": now,
            }

            if rule.algorithm == RateLimitAlgorithm.TOKEN_BUCKET:
                data = await self.redis.hmget(
                    key, "tokens", "last_refill", "last_access"
                )
                stats.update(
                    {
                        "tokens": int(data[0]) if data[0] else rule.burst_limit,
                        "last_refill": int(data[1]) if data[1] else None,
                        "last_access": int(data[2]) if data[2] else None,
                    }
                )

            elif rule.algorithm == RateLimitAlgorithm.SLIDING_WINDOW:
                count = await self.redis.zcard(key)
                stats.update({"current_count": count, "remaining": rule.limit - count})

            elif rule.algorithm == RateLimitAlgorithm.FIXED_WINDOW:
                window_start = int(now // rule.window_seconds) * rule.window_seconds
                window_key = f"{key}:{window_start}"
                count = await self.redis.get(window_key)
                stats.update(
                    {
                        "window_start": window_start,
                        "window_end": window_start + rule.window_seconds,
                        "current_count": int(count) if count else 0,
                        "remaining": rule.limit - (int(count) if count else 0),
                    }
                )

            elif rule.algorithm == RateLimitAlgorithm.LEAKY_BUCKET:
                data = await self.redis.hmget(key, "volume", "last_leak", "last_access")
                stats.update(
                    {
                        "volume": int(data[0]) if data[0] else 0,
                        "last_leak": int(data[1]) if data[1] else None,
                        "last_access": int(data[2]) if data[2] else None,
                    }
                )

            # Check for blocks and violations
            blocked_until = await self.redis.get(f"{key}:blocked")
            violations = await self.redis.get(f"{key}:violations")
            penalty_until = await self.redis.get(f"{key}:penalty")

            stats.update(
                {
                    "blocked_until": int(blocked_until) if blocked_until else None,
                    "violation_count": int(violations) if violations else 0,
                    "penalty_until": int(penalty_until) if penalty_until else None,
                }
            )

            return stats

        except Exception as e:
            logger.error(
                "Failed to get usage stats",
                identifier=identifier,
                rule_key=rule.key,
                error=str(e),
            )
            return {"error": str(e)}

    async def cleanup_expired(self) -> int:
        """Clean up expired rate limit data."""
        try:
            # This is a simplified cleanup - in production you'd want more sophisticated cleanup
            cleaned = 0
            cursor = 0

            while True:
                cursor, keys = await self.redis.scan(
                    cursor, match="rate_limit:*", count=100
                )

                for key in keys:
                    ttl = await self.redis.ttl(key)
                    if ttl == -1:  # Key exists but has no expiry
                        await self.redis.delete(key)
                        cleaned += 1

                if cursor == 0:
                    break

            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} expired rate limit keys")

            return cleaned

        except Exception as e:
            logger.error(f"Failed to cleanup expired keys: {e}")
            return 0

    def _get_redis_key(self, rule_key: str, identifier: str) -> str:
        """Generate Redis key for rate limit data."""
        identifier_hash = hashlib.md5(identifier.encode()).hexdigest()[:8]
        return f"rate_limit:{rule_key}:{identifier_hash}"


class RateLimitManager:
    """Main rate limiting manager with rule management."""

    def __init__(self, backend: RateLimitBackend):
        self.backend = backend
        self.rules: dict[str, RateLimitRule] = {}
        self._default_rules = self._load_default_rules()
        self.rules.update(self._default_rules)

    def _load_default_rules(self) -> dict[str, RateLimitRule]:
        """Load default rate limiting rules."""
        return {
            "api_default": RateLimitRule(
                key="api_default",
                algorithm=RateLimitAlgorithm.SLIDING_WINDOW,
                limit=100,
                window_seconds=60,
                description="Default API rate limit",
            ),
            "auth_strict": RateLimitRule(
                key="auth_strict",
                algorithm=RateLimitAlgorithm.FIXED_WINDOW,
                limit=5,
                window_seconds=300,
                block_duration_seconds=300,
                description="Authentication endpoint rate limit",
            ),
            "admin_relaxed": RateLimitRule(
                key="admin_relaxed",
                algorithm=RateLimitAlgorithm.TOKEN_BUCKET,
                limit=200,
                window_seconds=60,
                burst_limit=400,
                description="Admin endpoints rate limit",
            ),
        }

    def add_rule(self, rule: RateLimitRule):
        """Add or update a rate limiting rule."""
        self.rules[rule.key] = rule
        logger.info(f"Rate limit rule added/updated: {rule.key}")

    def remove_rule(self, rule_key: str) -> bool:
        """Remove a rate limiting rule."""
        if rule_key in self.rules:
            del self.rules[rule_key]
            logger.info(f"Rate limit rule removed: {rule_key}")
            return True
        return False

    def get_rule(self, rule_key: str) -> RateLimitRule | None:
        """Get a rate limiting rule by key."""
        return self.rules.get(rule_key)

    async def check_rate_limit(
        self, identifier: str, rule_key: str = "api_default"
    ) -> RateLimitResult:
        """Check rate limit for identifier against specified rule."""
        rule = self.rules.get(rule_key)
        if not rule:
            logger.warning(f"Rate limit rule not found: {rule_key}, using default")
            rule = self.rules["api_default"]

        # Check exemptions
        if self._is_exempt(identifier, rule):
            return RateLimitResult(
                allowed=True,
                limit=rule.limit,
                remaining=rule.limit,
                reset_time=int(time.time() + rule.window_seconds),
                algorithm=rule.algorithm.value,
                rule_key=rule_key,
                identifier=identifier,
            )

        return await self.backend.check_rate_limit(identifier, rule)

    def _is_exempt(self, identifier: str, rule: RateLimitRule) -> bool:
        """Check if identifier is exempt from rate limiting."""
        # Check if identifier is in exempt lists
        return identifier in rule.exempt_users or identifier in rule.exempt_ips

    async def reset_rate_limit(
        self, identifier: str, rule_key: str = "api_default"
    ) -> bool:
        """Reset rate limit for identifier."""
        rule = self.rules.get(rule_key)
        if not rule:
            return False

        return await self.backend.reset_rate_limit(identifier, rule)

    async def get_usage_stats(
        self, identifier: str, rule_key: str = "api_default"
    ) -> dict[str, Any]:
        """Get usage statistics for identifier."""
        rule = self.rules.get(rule_key)
        if not rule:
            return {"error": f"Rule not found: {rule_key}"}

        return await self.backend.get_usage_stats(identifier, rule)

    def list_rules(self) -> dict[str, dict[str, Any]]:
        """List all configured rules."""
        return {
            key: {
                "algorithm": rule.algorithm.value,
                "limit": rule.limit,
                "window_seconds": rule.window_seconds,
                "burst_limit": rule.burst_limit,
                "description": rule.description,
                "enabled": rule.enabled,
                "group": rule.group,
            }
            for key, rule in self.rules.items()
        }

    async def cleanup_expired(self) -> int:
        """Clean up expired rate limit data."""
        return await self.backend.cleanup_expired()


# Global rate limit manager (initialized with Redis backend)
_rate_limit_manager: RateLimitManager | None = None


class MemoryRateLimitBackend(RateLimitBackend):
    """In-memory fallback backend for environments without Redis.

    Implements a simple fixed-window counter per (identifier, rule_key).
    Suitable for tests and local dev only.
    """

    def __init__(self) -> None:
        self._counters: dict[tuple[str, str], dict[str, int]] = {}

    async def check_rate_limit(self, identifier: str, rule: RateLimitRule) -> RateLimitResult:
        now = int(time.time())
        window_start = (now // rule.window_seconds) * rule.window_seconds
        key = (identifier, rule.key)
        bucket = self._counters.setdefault(key, {"window": window_start, "count": 0})

        # Reset window
        if bucket["window"] != window_start:
            bucket["window"] = window_start
            bucket["count"] = 0

        remaining = max(0, rule.limit - bucket["count"])
        allowed = bucket["count"] < rule.limit
        if allowed:
            bucket["count"] += 1
            remaining = rule.limit - bucket["count"]

        return RateLimitResult(
            allowed=allowed,
            limit=rule.limit,
            remaining=remaining,
            reset_time=window_start + rule.window_seconds,
            algorithm=rule.algorithm.value,
            rule_key=rule.key,
            identifier=identifier,
            current_usage=bucket["count"],
            window_start=window_start,
        )

    async def reset_rate_limit(self, identifier: str, rule: RateLimitRule) -> bool:
        key = (identifier, rule.key)
        if key in self._counters:
            self._counters[key]["count"] = 0
            return True
        return False

    async def get_usage_stats(self, identifier: str, rule: RateLimitRule) -> dict[str, Any]:
        key = (identifier, rule.key)
        bucket = self._counters.get(key, {"count": 0})
        return {"count": bucket.get("count", 0)}

    async def cleanup_expired(self) -> int:
        # No-op for simple in-memory backend
        return 0


async def get_rate_limit_manager() -> RateLimitManager:
    """Get or create global rate limit manager."""
    global _rate_limit_manager

    if _rate_limit_manager is None:
        if _REDIS_AVAILABLE:
            # Initialize Redis connection
            redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                db=int(os.getenv("REDIS_DB", "1")),
                decode_responses=True,
                socket_timeout=30.0,
                socket_connect_timeout=10.0,
                retry_on_timeout=True,
            )

            backend = RedisRateLimitBackend(redis_client)
            _rate_limit_manager = RateLimitManager(backend)
            logger.info("Rate limit manager initialized with Redis backend")
        else:
            backend = MemoryRateLimitBackend()
            _rate_limit_manager = RateLimitManager(backend)
            logger.info("Rate limit manager initialized with in-memory backend")

    return _rate_limit_manager
