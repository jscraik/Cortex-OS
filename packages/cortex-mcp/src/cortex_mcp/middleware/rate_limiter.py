"""Simple token-bucket rate limiter for FastAPI.

In-memory only; suitable for a single-process server. For multi-instance,
swap storage to Redis.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException, Request, status


@dataclass
class TokenBucket:
    capacity: float
    refill_per_sec: float
    tokens: float = 0.0
    last: datetime | None = None

    def _refill(self) -> None:
        now = datetime.now()
        if not self.last:
            self.tokens = self.capacity
            self.last = now
            return
        elapsed = (now - self.last).total_seconds()
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
        self.last = now

    def take(self, n: float = 1.0) -> bool:
        self._refill()
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False

    def seconds_until_available(self) -> int:
        self._refill()
        needed = max(0.0, 1.0 - self.tokens)
        if needed == 0:
            return 0
        return int(needed / self.refill_per_sec) + 1


class RateLimiter:
    def __init__(self, rpm: int = 60, burst: int = 10) -> None:
        self.rpm = max(1, rpm)
        self.burst = max(1, burst)
        self._buckets: dict[str, TokenBucket] = {}

    def _id_from_request(self, request: Request) -> str:
        uid = getattr(request.state, "user_id", None)
        if uid:
            return f"user:{uid}"
        host = request.client.host if request.client else "unknown"
        return f"ip:{host}"

    def _bucket_for(self, key: str) -> TokenBucket:
        bucket = self._buckets.get(key)
        if bucket is None:
            bucket = TokenBucket(
                capacity=float(self.burst), refill_per_sec=self.rpm / 60.0
            )
            self._buckets[key] = bucket
        return bucket

    def check(self, request: Request) -> None:
        key = self._id_from_request(request)
        bucket = self._bucket_for(key)
        if not bucket.take(1.0):
            retry = bucket.seconds_until_available()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="rate limit exceeded",
                headers={"Retry-After": str(retry)},
            )
