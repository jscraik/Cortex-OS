"""
Rate Limiter for Cortex-Py (Phase 7.3)

Implements token bucket rate limiting for API endpoints.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in error messages
"""

import time
from collections import defaultdict
from typing import Dict, Any


class TokenBucket:
    """
    Token bucket for rate limiting.
    
    Following CODESTYLE.md: Pure state management
    """

    def __init__(self, capacity: float, refill_rate: float):
        """
        Initialize token bucket.
        
        Args:
            capacity: Maximum tokens
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.time()

    def consume(self, tokens: float = 1.0) -> bool:
        """
        Try to consume tokens.
        
        Args:
            tokens: Number of tokens to consume
        
        Returns:
            True if consumed successfully
        
        Following CODESTYLE.md: Guard clauses
        """
        # Refill tokens based on time elapsed
        now = time.time()
        elapsed = now - self.last_refill
        
        # Add refilled tokens
        self.tokens = min(
            self.capacity,
            self.tokens + (elapsed * self.refill_rate)
        )
        self.last_refill = now

        # Guard: check if enough tokens
        if self.tokens < tokens:
            return False

        # Consume tokens
        self.tokens -= tokens
        return True


class RateLimiter:
    """
    Rate limiter using token bucket algorithm.
    
    Following CODESTYLE.md: Per-client tracking
    """

    def __init__(self, rate: int, per_seconds: int = 60):
        """
        Initialize rate limiter.
        
        Args:
            rate: Number of requests allowed
            per_seconds: Time period in seconds
        """
        self.rate = rate
        self.per_seconds = per_seconds
        self.refill_rate = rate / per_seconds
        
        # Per-client buckets
        self.buckets: Dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(rate, self.refill_rate)
        )

    def allow_request(self, client_id: str) -> bool:
        """
        Check if request is allowed.
        
        Args:
            client_id: Client identifier
        
        Returns:
            True if allowed
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate client_id
        if not client_id:
            return False

        bucket = self.buckets[client_id]
        return bucket.consume(1.0)

    def get_remaining(self, client_id: str) -> int:
        """
        Get remaining requests for client.
        
        Args:
            client_id: Client identifier
        
        Returns:
            Remaining requests
        
        Following CODESTYLE.md: Simple accessor
        """
        bucket = self.buckets.get(client_id)
        if bucket is None:
            return self.rate
        
        return int(bucket.tokens)


def create_429_response(
    retry_after: int,
    limit: int,
    endpoint: str
) -> Dict[str, Any]:
    """
    Create 429 Too Many Requests response.
    
    Args:
        retry_after: Seconds to retry after
        limit: Rate limit
        endpoint: Endpoint path
    
    Returns:
        Error response dictionary
    
    Following CODESTYLE.md: brAInwav branding
    """
    return {
        "error": {
            "code": "rate_limit_exceeded",
            "message": f"brAInwav: Rate limit exceeded for {endpoint}. Max {limit} requests per minute.",
            "endpoint": endpoint,
            "limit": limit,
        },
        "retry_after": retry_after,
    }


def get_rate_limit_headers(
    limit: int,
    remaining: int,
    reset: int
) -> Dict[str, str]:
    """
    Get rate limit headers.
    
    Args:
        limit: Rate limit
        remaining: Remaining requests
        reset: Reset timestamp
    
    Returns:
        Headers dictionary
    
    Following CODESTYLE.md: Simple mapping
    """
    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(reset),
    }


def get_retry_after_seconds(reset_time: float) -> int:
    """
    Calculate Retry-After seconds.
    
    Args:
        reset_time: Reset timestamp
    
    Returns:
        Seconds until reset
    
    Following CODESTYLE.md: Pure calculation
    """
    now = time.time()
    seconds = int(reset_time - now)
    
    # Guard: minimum 0 seconds
    return max(0, seconds)
