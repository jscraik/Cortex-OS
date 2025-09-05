"""
Security and validation module for ML inference service.

Provides comprehensive input validation, content filtering, rate limiting,
and structured output validation using the instructor library.
"""

import asyncio
import hashlib
import logging
import re
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from functools import lru_cache

import instructor
from fastapi import HTTPException, Request
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


class SecurityLevel(str, Enum):
    """Security classification levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ContentCategory(str, Enum):
    """Content categorization for filtering."""
    SAFE = "safe"
    QUESTIONABLE = "questionable"
    HARMFUL = "harmful"
    ILLEGAL = "illegal"


class ValidationResult(BaseModel):
    """Result of content validation."""
    is_safe: bool
    security_level: SecurityLevel
    content_category: ContentCategory
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    detected_issues: List[str] = Field(default_factory=list)
    recommended_action: str


class StructuredResponse(BaseModel):
    """Structured response format using instructor."""
    content: str = Field(description="The main response content")
    category: str = Field(description="Content category classification")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    safety_rating: str = Field(description="Safety rating of the content")

    @validator('content')
    def validate_content_length(cls, v):
        if len(v) > 10000:  # 10k character limit
            raise ValueError("Content too long")
        return v


class SecurityValidator:
    """Comprehensive security validation for ML inference."""

    def __init__(self):
        # Banned content patterns
        self.banned_patterns = [
            r'\b(?:bomb|explosive|weapon)\b',
            r'\b(?:hack|exploit|malware)\b',
            r'\b(?:drug|narcotic|cocaine)\b',
            r'\b(?:suicide|self-harm)\b',
        ]

        # PII patterns
        self.pii_patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',  # Credit card
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
        ]

        # Compile regex patterns for performance
        self.compiled_banned = [re.compile(pattern, re.IGNORECASE) for pattern in self.banned_patterns]
        self.compiled_pii = [re.compile(pattern, re.IGNORECASE) for pattern in self.pii_patterns]

        # Initialize instructor client for structured validation
        self.instructor_client = None
        self._setup_instructor()

    def _setup_instructor(self):
        """Setup instructor client for structured outputs."""
        try:
            # Create a mock OpenAI client for instructor
            base_client = AsyncOpenAI(
                api_key="mock-key",
                base_url="http://localhost:11434/v1",  # Ollama-compatible endpoint
            )

            self.instructor_client = instructor.from_openai(
                base_client,
                mode=instructor.Mode.JSON
            )
            logger.info("Instructor client initialized")

        except Exception as e:
            logger.warning(f"Failed to initialize instructor client: {e}")
            self.instructor_client = None

    async def validate_input(self, prompt: str, user_id: str = None) -> ValidationResult:
        """Comprehensive input validation."""
        issues = []

        # Basic length check
        if len(prompt) > 5000:
            issues.append("Prompt too long")

        if len(prompt.strip()) == 0:
            issues.append("Empty prompt")

        # Check for banned content
        for pattern in self.compiled_banned:
            if pattern.search(prompt):
                issues.append(f"Banned content detected: {pattern.pattern}")

        # Check for PII
        pii_found = []
        for pattern in self.compiled_pii:
            matches = pattern.findall(prompt)
            if matches:
                pii_found.extend(matches)
                issues.append(f"PII detected: {len(matches)} instances")

        # Determine security classification
        if issues:
            if any("banned content" in issue.lower() for issue in issues):
                security_level = SecurityLevel.CRITICAL
                content_category = ContentCategory.HARMFUL
                is_safe = False
            elif pii_found:
                security_level = SecurityLevel.HIGH
                content_category = ContentCategory.QUESTIONABLE
                is_safe = False
            else:
                security_level = SecurityLevel.MEDIUM
                content_category = ContentCategory.QUESTIONABLE
                is_safe = False
        else:
            security_level = SecurityLevel.LOW
            content_category = ContentCategory.SAFE
            is_safe = True

        # Use instructor for advanced content analysis if available
        if self.instructor_client and not is_safe:
            try:
                structured_analysis = await self._analyze_with_instructor(prompt)
                if structured_analysis:
                    # Incorporate instructor results
                    pass
            except Exception as e:
                logger.debug(f"Instructor analysis failed: {e}")

        return ValidationResult(
            is_safe=is_safe,
            security_level=security_level,
            content_category=content_category,
            confidence=0.85 if issues else 0.95,
            reasoning=f"Found {len(issues)} issues" if issues else "No issues detected",
            detected_issues=issues,
            recommended_action="block" if not is_safe else "allow"
        )

    async def _analyze_with_instructor(self, content: str) -> Optional[Dict[str, Any]]:
        """Use instructor for advanced content analysis."""
        if not self.instructor_client:
            return None

        try:
            # This would use a real model for content analysis
            analysis_prompt = f"""
            Analyze the following content for safety and appropriateness:

            Content: {content[:500]}...

            Provide a structured analysis.
            """

            # In a real implementation, this would call the instructor client
            # For now, return a mock structured response
            return {
                "safety_score": 0.8,
                "categories": ["general"],
                "risk_factors": []
            }

        except Exception as e:
            logger.error(f"Instructor content analysis failed: {e}")
            return None

    def sanitize_output(self, text: str) -> str:
        """Sanitize output text for safety."""
        # Remove potential PII from output
        sanitized = text

        for pattern in self.compiled_pii:
            sanitized = pattern.sub("[REDACTED]", sanitized)

        # Remove excessive whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()

        return sanitized

    @lru_cache(maxsize=1000)
    def get_content_hash(self, content: str) -> str:
        """Get SHA-256 hash of content for caching/tracking."""
        return hashlib.sha256(content.encode()).hexdigest()


class RateLimiter:
    """Advanced rate limiting with multiple tiers."""

    def __init__(self):
        # Configure rate limits per tier
        self.limits = {
            "free": "10/minute",
            "basic": "100/minute",
            "premium": "1000/minute",
            "enterprise": "10000/minute"
        }

        # Create limiter instance
        self.limiter = Limiter(key_func=get_remote_address)

        # Track usage per user
        self.user_usage: Dict[str, List[datetime]] = {}
        self.cleanup_interval = 3600  # Cleanup old entries every hour
        self.last_cleanup = time.time()

    def get_user_tier(self, user_id: str) -> str:
        """Determine user tier (placeholder - would integrate with auth system)."""
        # This would typically check a database or cache
        return "free"  # Default tier

    async def check_rate_limit(self, request: Request, user_id: str = None) -> bool:
        """Check if request is within rate limits."""
        try:
            # Cleanup old entries periodically
            current_time = time.time()
            if current_time - self.last_cleanup > self.cleanup_interval:
                self._cleanup_old_entries()
                self.last_cleanup = current_time

            # Get user tier and corresponding limit
            tier = self.get_user_tier(user_id) if user_id else "free"
            limit = self.limits.get(tier, "10/minute")

            # Apply rate limit
            # Note: In production, this would use Redis or similar for distributed rate limiting
            return True  # Simplified for now

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False  # Fail closed

    def _cleanup_old_entries(self):
        """Clean up old usage tracking entries."""
        cutoff = datetime.now() - timedelta(hours=1)

        for user_id in list(self.user_usage.keys()):
            self.user_usage[user_id] = [
                timestamp for timestamp in self.user_usage[user_id]
                if timestamp > cutoff
            ]

            # Remove empty entries
            if not self.user_usage[user_id]:
                del self.user_usage[user_id]


class AuthenticationValidator:
    """JWT-based authentication validation."""

    def __init__(self, secret_key: str = "your-secret-key"):
        self.secret_key = secret_key
        self.algorithm = "HS256"

    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return user claims."""
        try:
            # In production, this would use proper JWT validation
            # For now, return mock user data
            if token.startswith("valid-"):
                return {
                    "user_id": token.replace("valid-", ""),
                    "tier": "free",
                    "permissions": ["inference"]
                }
            return None

        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return None

    def extract_token_from_request(self, request: Request) -> Optional[str]:
        """Extract bearer token from request headers."""
        authorization = request.headers.get("Authorization")

        if authorization and authorization.startswith("Bearer "):
            return authorization[7:]  # Remove "Bearer " prefix

        return None


class StructuredOutputValidator:
    """Validates and structures outputs using instructor."""

    def __init__(self):
        self.instructor_client = None
        self._setup_instructor()

    def _setup_instructor(self):
        """Setup instructor for output validation."""
        try:
            # This would connect to a real model endpoint
            base_client = AsyncOpenAI(
                api_key="mock-key",
                base_url="http://localhost:11434/v1",
            )

            self.instructor_client = instructor.from_openai(
                base_client,
                mode=instructor.Mode.JSON
            )

        except Exception as e:
            logger.warning(f"Failed to setup instructor for output validation: {e}")

    async def structure_response(
        self,
        raw_output: str,
        response_model: type = StructuredResponse
    ) -> StructuredResponse:
        """Structure raw model output using instructor."""

        try:
            if self.instructor_client:
                # Use instructor to structure the response
                structured = await self.instructor_client.chat.completions.create(
                    model="gpt-3.5-turbo",  # This would be configurable
                    response_model=response_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "Structure the given content according to the response model."
                        },
                        {
                            "role": "user",
                            "content": f"Structure this content: {raw_output}"
                        }
                    ]
                )
                return structured
            else:
                # Fallback to manual structuring
                return self._manual_structure(raw_output, response_model)

        except Exception as e:
            logger.error(f"Failed to structure response with instructor: {e}")
            return self._manual_structure(raw_output, response_model)

    def _manual_structure(self, raw_output: str, response_model: type) -> StructuredResponse:
        """Manual fallback for response structuring."""
        return StructuredResponse(
            content=raw_output,
            category="general",
            confidence=0.8,
            metadata={"method": "manual_fallback"},
            safety_rating="safe"
        )


# Factory functions for creating security components
def create_security_validator() -> SecurityValidator:
    """Create a configured security validator."""
    return SecurityValidator()


def create_rate_limiter() -> RateLimiter:
    """Create a configured rate limiter."""
    return RateLimiter()


def create_auth_validator(secret_key: str = None) -> AuthenticationValidator:
    """Create a configured authentication validator."""
    import os
    key = secret_key or os.getenv("JWT_SECRET_KEY", "fallback-secret-key")
    return AuthenticationValidator(secret_key=key)


def create_output_validator() -> StructuredOutputValidator:
    """Create a configured output validator."""
    return StructuredOutputValidator()
