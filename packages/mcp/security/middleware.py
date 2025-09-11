"""Comprehensive security middleware for MCP FastAPI application."""

import asyncio
import hashlib
import re
import secrets
import time
from collections.abc import Callable

from fastapi import FastAPI, HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from ..core.rate_limiting import get_rate_limit_manager
from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import correlation_context, get_logger

logger = get_logger(__name__)
metrics = get_metrics_collector()


class SecurityConfig:
    """Security middleware configuration."""

    def __init__(self):
        import os

        # CORS settings
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(
            ","
        )
        self.cors_methods = os.getenv(
            "CORS_METHODS", "GET,POST,PUT,DELETE,OPTIONS"
        ).split(",")
        self.cors_headers = os.getenv(
            "CORS_HEADERS", "Content-Type,Authorization,X-Correlation-ID"
        ).split(",")
        self.cors_credentials = os.getenv("CORS_CREDENTIALS", "true").lower() == "true"

        # Security headers
        self.hsts_max_age = int(os.getenv("HSTS_MAX_AGE", "31536000"))  # 1 year
        self.csp_policy = os.getenv(
            "CSP_POLICY", "default-src 'self'; script-src 'self' 'unsafe-inline'"
        )
        self.frame_options = os.getenv("X_FRAME_OPTIONS", "DENY")

        # Request validation
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
        self.max_json_depth = int(os.getenv("MAX_JSON_DEPTH", "10"))
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT", "30"))

        # Rate limiting
        self.rate_limit_enabled = (
            os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
        )
        self.rate_limit_default_rule = os.getenv(
            "RATE_LIMIT_DEFAULT_RULE", "api_default"
        )

        # IP filtering
        self.ip_whitelist = [
            ip.strip() for ip in os.getenv("IP_WHITELIST", "").split(",") if ip.strip()
        ]
        self.ip_blacklist = [
            ip.strip() for ip in os.getenv("IP_BLACKLIST", "").split(",") if ip.strip()
        ]

        # User agent filtering
        self.blocked_user_agents = [
            r".*bot.*",
            r".*crawler.*",
            r".*spider.*",
            r".*scraper.*",
        ]
        self.allowed_user_agents = os.getenv("ALLOWED_USER_AGENTS", "").split(",")

        # JWT settings
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_expiry = int(os.getenv("JWT_EXPIRY", "3600"))

        # Security features
        self.detect_sql_injection = (
            os.getenv("DETECT_SQL_INJECTION", "true").lower() == "true"
        )
        self.detect_xss = os.getenv("DETECT_XSS", "true").lower() == "true"
        self.detect_path_traversal = (
            os.getenv("DETECT_PATH_TRAVERSAL", "true").lower() == "true"
        )
        self.honeypot_enabled = os.getenv("HONEYPOT_ENABLED", "true").lower() == "true"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    def __init__(self, app: FastAPI, config: SecurityConfig):
        super().__init__(app)
        self.config = config

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # HSTS (HTTP Strict Transport Security)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                f"max-age={self.config.hsts_max_age}; includeSubDomains"
            )

        # Content Security Policy
        response.headers["Content-Security-Policy"] = self.config.csp_policy

        # X-Frame-Options
        response.headers["X-Frame-Options"] = self.config.frame_options

        # X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-XSS-Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        # Server header removal (don't reveal server info)
        response.headers.pop("server", None)

        # Custom security headers
        response.headers["X-Security-Scan"] = "protected"
        response.headers["X-Content-Security"] = "enforced"

        return response


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Add correlation ID to requests for tracing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with correlation ID."""
        # Get or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID") or secrets.token_hex(
            16
        )

        # Add to request state
        request.state.correlation_id = correlation_id

        # Process request with correlation context
        async with correlation_context(correlation_id):
            response = await call_next(request)

            # Add correlation ID to response
            response.headers["X-Correlation-ID"] = correlation_id

            return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate and sanitize incoming requests."""

    def __init__(self, app: FastAPI, config: SecurityConfig):
        super().__init__(app)
        self.config = config

        # Compile security patterns
        self._sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(--|\/\*|\*\/)",
            r"(\b(OR|AND)\b\s*\d+\s*=\s*\d+)",
            r"(\';\s*(DROP|DELETE|INSERT|UPDATE))",
        ]

        self._xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
        ]

        self._path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"~\/",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
        ]

        # Compile regex patterns
        self._sql_regex = [re.compile(p, re.IGNORECASE) for p in self._sql_patterns]
        self._xss_regex = [re.compile(p, re.IGNORECASE) for p in self._xss_patterns]
        self._path_regex = [
            re.compile(p, re.IGNORECASE) for p in self._path_traversal_patterns
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate request before processing."""
        start_time = time.time()

        try:
            # Check request size
            if hasattr(request, "headers") and "content-length" in request.headers:
                content_length = int(request.headers["content-length"])
                if content_length > self.config.max_request_size:
                    logger.warning(
                        "Request size exceeded limit",
                        size=content_length,
                        limit=self.config.max_request_size,
                        client_ip=self._get_client_ip(request),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Request too large",
                    )

            # Validate request method
            if request.method not in [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS",
                "HEAD",
            ]:
                logger.warning(f"Invalid HTTP method: {request.method}")
                raise HTTPException(
                    status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                    detail="Method not allowed",
                )

            # Security scans
            await self._scan_request_for_threats(request)

            # Process request with timeout
            try:
                response = await asyncio.wait_for(
                    call_next(request), timeout=self.config.request_timeout
                )

                duration = time.time() - start_time

                # Log request metrics
                logger.info(
                    "Request processed",
                    method=request.method,
                    path=str(request.url.path),
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                    client_ip=self._get_client_ip(request),
                    user_agent=request.headers.get("user-agent", "unknown")[:100],
                )

                return response

            except TimeoutError as err:
                logger.warning(
                    "Request timeout",
                    method=request.method,
                    path=str(request.url.path),
                    timeout=self.config.request_timeout,
                    client_ip=self._get_client_ip(request),
                )
                raise HTTPException(
                    status_code=status.HTTP_408_REQUEST_TIMEOUT,
                    detail="Request timeout",
                ) from err

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                "Request validation error",
                error=str(e),
                method=request.method,
                path=str(request.url.path),
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal security error",
            ) from e

    async def _scan_request_for_threats(self, request: Request):
        """Scan request for security threats."""
        client_ip = self._get_client_ip(request)

        # Get request data to scan
        scan_data = []

        # URL and query parameters
        scan_data.append(str(request.url))

        # Headers (excluding sensitive ones)
        for name, value in request.headers.items():
            if name.lower() not in ["authorization", "cookie", "x-api-key"]:
                scan_data.append(f"{name}: {value}")

        # Body (if present and not too large)
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if len(body) < 10000:  # Only scan small bodies
                    scan_data.append(body.decode("utf-8", errors="ignore"))
            except Exception:
                pass  # Skip body scanning if it fails

        # Combine all data for scanning
        combined_data = " ".join(scan_data)

        # SQL Injection detection
        if self.config.detect_sql_injection:
            for pattern in self._sql_regex:
                if pattern.search(combined_data):
                    logger.warning(
                        "SQL injection attempt detected",
                        client_ip=client_ip,
                        pattern=pattern.pattern,
                        path=str(request.url.path),
                    )
                    metrics.record_error("sql_injection_attempt", "security")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid request format",
                    )

        # XSS detection
        if self.config.detect_xss:
            for pattern in self._xss_regex:
                if pattern.search(combined_data):
                    logger.warning(
                        "XSS attempt detected",
                        client_ip=client_ip,
                        pattern=pattern.pattern,
                        path=str(request.url.path),
                    )
                    metrics.record_error("xss_attempt", "security")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid request content",
                    )

        # Path traversal detection
        if self.config.detect_path_traversal:
            for pattern in self._path_regex:
                if pattern.search(combined_data):
                    logger.warning(
                        "Path traversal attempt detected",
                        client_ip=client_ip,
                        pattern=pattern.pattern,
                        path=str(request.url.path),
                    )
                    metrics.record_error("path_traversal_attempt", "security")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path"
                    )

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        # Check for forwarded headers (load balancer/proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct connection
        if hasattr(request.client, "host"):
            return request.client.host

        return "unknown"


class IPFilteringMiddleware(BaseHTTPMiddleware):
    """Filter requests based on IP address."""

    def __init__(self, app: FastAPI, config: SecurityConfig):
        super().__init__(app)
        self.config = config

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Filter requests by IP address."""
        if not (self.config.ip_whitelist or self.config.ip_blacklist):
            return await call_next(request)

        client_ip = self._get_client_ip(request)

        # Check blacklist first
        if self.config.ip_blacklist and client_ip in self.config.ip_blacklist:
            logger.warning(f"Blocked request from blacklisted IP: {client_ip}")
            metrics.record_error("ip_blacklisted", "security")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        # Check whitelist (if configured)
        if self.config.ip_whitelist and client_ip not in self.config.ip_whitelist:
            logger.warning(f"Blocked request from non-whitelisted IP: {client_ip}")
            metrics.record_error("ip_not_whitelisted", "security")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        if hasattr(request.client, "host"):
            return request.client.host

        return "unknown"


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis backend."""

    def __init__(self, app: FastAPI, config: SecurityConfig):
        super().__init__(app)
        self.config = config

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting to requests."""
        if not self.config.rate_limit_enabled:
            return await call_next(request)

        try:
            # Get rate limit manager
            rate_limiter = await get_rate_limit_manager()

            # Generate identifier (IP + User agent hash)
            client_ip = self._get_client_ip(request)
            user_agent = request.headers.get("user-agent", "unknown")
            identifier = (
                f"{client_ip}:{hashlib.md5(user_agent.encode()).hexdigest()[:8]}"
            )

            # Determine rate limit rule based on endpoint
            rule_key = self._get_rate_limit_rule(request)

            # Check rate limit
            result = await rate_limiter.check_rate_limit(identifier, rule_key)

            if not result.allowed:
                logger.warning(
                    "Rate limit exceeded",
                    identifier=identifier,
                    rule_key=rule_key,
                    limit=result.limit,
                    reset_time=result.reset_time,
                    client_ip=client_ip,
                )

                # Return rate limit response
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "limit": result.limit,
                        "remaining": result.remaining,
                        "reset": result.reset_time,
                        "retry_after": result.retry_after,
                    },
                    headers={
                        "X-RateLimit-Limit": str(result.limit),
                        "X-RateLimit-Remaining": str(result.remaining),
                        "X-RateLimit-Reset": str(result.reset_time),
                        "Retry-After": str(result.retry_after or 60),
                    },
                )

            # Process request
            response = await call_next(request)

            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(result.limit)
            response.headers["X-RateLimit-Remaining"] = str(result.remaining)
            response.headers["X-RateLimit-Reset"] = str(result.reset_time)

            return response

        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Fail open - allow request but log error
            return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        if hasattr(request.client, "host"):
            return request.client.host

        return "unknown"

    def _get_rate_limit_rule(self, request: Request) -> str:
        """Determine rate limit rule based on request."""
        path = request.url.path.lower()

        # Authentication endpoints get stricter limits
        if any(auth_path in path for auth_path in ["/auth", "/login", "/token"]):
            return "auth_strict"

        # Admin endpoints get relaxed limits
        if "/admin" in path:
            return "admin_relaxed"

        # Default rule
        return self.config.rate_limit_default_rule


class HoneypotMiddleware(BaseHTTPMiddleware):
    """Honeypot middleware to detect and log suspicious activity."""

    def __init__(self, app: FastAPI, config: SecurityConfig):
        super().__init__(app)
        self.config = config

        # Common attack paths to monitor
        self.honeypot_paths = [
            "/wp-admin",
            "/wp-login",
            "/wordpress",
            "/phpmyadmin",
            "/admin",
            "/administrator",
            "/.env",
            "/.git",
            "/config",
            "/backup",
            "/test",
            "/debug",
            "/robots.txt",
            "/sitemap.xml",
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor for suspicious requests."""
        if not self.config.honeypot_enabled:
            return await call_next(request)

        path = request.url.path.lower()
        client_ip = self._get_client_ip(request)

        # Check if this is a honeypot path
        is_honeypot = any(hp_path in path for hp_path in self.honeypot_paths)

        if is_honeypot:
            logger.warning(
                "Honeypot triggered - suspicious request detected",
                path=path,
                client_ip=client_ip,
                user_agent=request.headers.get("user-agent", "unknown"),
                method=request.method,
                query_params=str(request.query_params),
            )

            metrics.record_error("honeypot_triggered", "security")

            # Return a generic 404 to not reveal the honeypot
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Not found"}
            )

        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        if hasattr(request.client, "host"):
            return request.client.host

        return "unknown"


def setup_security_middleware(app: FastAPI) -> None:
    """Setup all security middleware for the FastAPI app."""
    config = SecurityConfig()

    # CORS middleware (must be added first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=config.cors_credentials,
        allow_methods=config.cors_methods,
        allow_headers=config.cors_headers,
        expose_headers=[
            "X-Correlation-ID",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
        ],
    )

    # Security middleware stack (order matters!)
    app.add_middleware(SecurityHeadersMiddleware, config=config)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(IPFilteringMiddleware, config=config)
    app.add_middleware(RateLimitingMiddleware, config=config)
    app.add_middleware(HoneypotMiddleware, config=config)
    app.add_middleware(
        RequestValidationMiddleware, config=config
    )  # Last to catch all requests

    logger.info("Security middleware stack configured")

    return config
