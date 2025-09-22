<!-- markdownlint-disable MD013 MD022 MD032 MD031 MD024 -->
# MCP (Model Context Protocol) Technical Analysis and TDD Remediation Plan

## Executive Summary

This comprehensive technical analysis of the MCP packages reveals several critical production readiness issues across both Python and TypeScript implementations. The packages show promise but require significant remediation in security, error handling, type safety, and testing coverage before production deployment.

## Overall Assessment: 🟡 REQUIRES SIGNIFICANT REMEDIATION

**Current Score: 65/100** - Multiple critical issues must be addressed before production deployment

---

## 1. Critical Security Vulnerabilities 🔴

### 1.1 Missing Authentication & Authorization

**Finding**: No authentication or authorization mechanisms in the MCP server

#### Impact
- Unauthorized access to MCP endpoints
- Potential data exposure
- Resource abuse and denial of service
- No user isolation or multi-tenancy support

#### TDD Test Cases
```python
# tests/security/test_authentication.py
import pytest
from httpx import AsyncClient
from cortex_fastmcp_server_v2 import create_server

class TestAuthentication:
    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self):
        """Test that requests without auth tokens are rejected."""
        server = create_server()
        async with AsyncClient(app=server.app, base_url="http://test") as client:
            response = await client.post(
                "/mcp",
                json={"method": "search", "params": {"query": "test"}}
            )
            assert response.status_code == 401
            assert "unauthorized" in response.json()["error"]["message"].lower()
    
    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self):
        """Test that requests with invalid tokens are rejected."""
        server = create_server()
        async with AsyncClient(app=server.app, base_url="http://test") as client:
            response = await client.post(
                "/mcp",
                headers={"Authorization": "Bearer invalid_token"},
                json={"method": "search", "params": {"query": "test"}}
            )
            assert response.status_code == 401
    
    @pytest.mark.asyncio  
    async def test_valid_token_accepted(self):
        """Test that requests with valid tokens are accepted."""
        server = create_server()
        token = generate_test_token()  # Helper to generate valid JWT
        
        async with AsyncClient(app=server.app, base_url="http://test") as client:
            response = await client.post(
                "/mcp",
                headers={"Authorization": f"Bearer {token}"},
                json={"method": "search", "params": {"query": "test"}}
            )
            assert response.status_code == 200
```

#### Implementation Fix
```python
# packages/cortex-mcp/auth/jwt_auth.py
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

class TokenData(BaseModel):
    user_id: str
    scopes: list[str] = []

class JWTAuthenticator:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.security = HTTPBearer()
    
    async def verify_token(
        self, 
        credentials: HTTPAuthorizationCredentials = Security(HTTPBearer())
    ) -> TokenData:
        token = credentials.credentials
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            return TokenData(**payload)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

# Updated server implementation
def create_server():
    mcp = FastMCP(name="cortex-mcp", instructions=server_instructions)
    
    # Initialize authentication
    auth = JWTAuthenticator(
        secret_key=os.getenv("JWT_SECRET_KEY", ""),
        algorithm="HS256"
    )
    
    # Apply authentication to all MCP tools
    @mcp.tool()
    async def search(
        query: str,
        token_data: TokenData = Depends(auth.verify_token)
    ) -> dict[str, Any]:
        # Check scopes
        if "search" not in token_data.scopes:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Original search implementation
        return await _search_impl(query)
```

### 1.2 Input Validation & Sanitization Issues 🔴

**Finding**: No input validation or sanitization in MCP endpoints

#### Impact
- SQL injection vulnerabilities
- Command injection risks
- XSS attacks through stored data
- Resource exhaustion from malicious inputs

#### TDD Test Cases
```python
# tests/security/test_input_validation.py
import pytest
from cortex_fastmcp_server_v2 import create_server

class TestInputValidation:
    @pytest.mark.asyncio
    async def test_sql_injection_prevented(self):
        """Test that SQL injection attempts are sanitized."""
        malicious_query = "'; DROP TABLE users; --"
        result = await search_with_validation(malicious_query)
        
        # Should sanitize the input
        assert "DROP TABLE" not in str(result)
        assert result["error"] is None
    
    @pytest.mark.asyncio
    async def test_command_injection_prevented(self):
        """Test that command injection attempts are blocked."""
        malicious_input = "test; rm -rf /"
        
        with pytest.raises(ValidationError) as exc_info:
            await process_input(malicious_input)
        
        assert "invalid characters" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_xss_prevented(self):
        """Test that XSS attempts are sanitized."""
        xss_payload = "<script>alert('XSS')</script>"
        result = await store_and_retrieve(xss_payload)
        
        # Should escape HTML
        assert "<script>" not in result
        assert "&lt;script&gt;" in result
    
    @pytest.mark.asyncio
    async def test_resource_exhaustion_prevented(self):
        """Test that extremely large inputs are rejected."""
        huge_input = "x" * (10 * 1024 * 1024)  # 10MB string
        
        with pytest.raises(ValidationError) as exc_info:
            await process_input(huge_input)
        
        assert "exceeds maximum size" in str(exc_info.value).lower()
```

#### Implementation Fix
```python
# packages/cortex-mcp/security/input_validation.py
import re
from typing import Any, Optional
from pydantic import BaseModel, Field, validator
import html
import bleach

class SearchInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    max_results: int = Field(default=10, ge=1, le=100)
    
    @validator("query")
    def sanitize_query(cls, v: str) -> str:
        # Remove potential SQL injection patterns
        dangerous_patterns = [
            r";\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)",
            r"--",
            r"/\*.*\*/",
            r"xp_cmdshell",
            r"sp_executesql"
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError(f"Dangerous pattern detected: {pattern}")
        
        # Escape HTML to prevent XSS
        return html.escape(v)

class ResourceInput(BaseModel):
    resource_id: str = Field(..., regex=r"^[a-zA-Z0-9_-]{1,100}$")
    
    @validator("resource_id")
    def validate_resource_id(cls, v: str) -> str:
        # Prevent path traversal
        if ".." in v or "/" in v or "\\" in v:
            raise ValueError("Invalid resource ID format")
        return v

def sanitize_output(data: Any) -> Any:
    """Sanitize output data to prevent XSS."""
    if isinstance(data, str):
        return bleach.clean(data, tags=[], strip=True)
    elif isinstance(data, dict):
        return {k: sanitize_output(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_output(item) for item in data]
    return data
```

## 2. Error Handling & Resilience Issues 🔴

### 2.1 Bare Exception Handlers

**Finding**: Bare `except:` clauses that catch all exceptions indiscriminately

#### Location
- `packages/cortex-mcp/cortex_fastmcp_server_v2.py` - Error handling patterns need improvement

#### Impact
- Silent failures hiding critical errors
- Difficulty debugging production issues
- Potential security vulnerabilities from swallowed errors
- System instability from uncaught exceptions

#### TDD Test Cases
```python
# tests/error_handling/test_exception_handling.py
import pytest
from unittest.mock import patch, MagicMock

class TestExceptionHandling:
    @pytest.mark.asyncio
    async def test_specific_exceptions_handled(self):
        """Test that specific exceptions are properly handled."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            # Simulate connection error
            mock_urlopen.side_effect = ConnectionError("Connection refused")
            
            result = await health_check_with_proper_handling()
            
            assert result["status"] == "unhealthy"
            assert "connection refused" in result["error"].lower()
            assert result["retry_after"] == 5
    
    @pytest.mark.asyncio
    async def test_keyboard_interrupt_propagated(self):
        """Test that KeyboardInterrupt is not swallowed."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = KeyboardInterrupt()
            
            with pytest.raises(KeyboardInterrupt):
                await health_check_with_proper_handling()
    
    @pytest.mark.asyncio
    async def test_system_exit_propagated(self):
        """Test that SystemExit is not swallowed."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = SystemExit(1)
            
            with pytest.raises(SystemExit):
                await health_check_with_proper_handling()
    
    @pytest.mark.asyncio
    async def test_unexpected_errors_logged(self):
        """Test that unexpected errors are logged with context."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = RuntimeError("Unexpected error")
            
            with patch("logging.Logger.error") as mock_logger:
                result = await health_check_with_proper_handling()
                
                mock_logger.assert_called_with(
                    "Unexpected error during health check",
                    exc_info=True,
                    extra={"context": "health_check"}
                )
                assert result["status"] == "error"
```

#### Implementation Fix
```python
# packages/cortex-mcp/cortex_fastmcp_server_v2.py
import urllib.error
import socket

# Replace bare except with specific exception handling
try:
    response = urllib.request.urlopen('http://localhost:3024/health', timeout=1)
    if response.getcode() == 200:
        logger.info("✅ Server is healthy")
    else:
        logger.warning(f"⚠️ Server returned status {response.getcode()}")
except urllib.error.URLError as e:
    if isinstance(e.reason, socket.timeout):
        logger.debug("Health check timed out (expected during startup)")
    elif isinstance(e.reason, ConnectionRefusedError):
        logger.debug("Server not ready yet (connection refused)")
    else:
        logger.warning(f"Health check failed: {e.reason}")
except urllib.error.HTTPError as e:
    logger.warning(f"Health check HTTP error: {e.code} - {e.reason}")
except (KeyboardInterrupt, SystemExit):
    # Re-raise system interrupts
    raise
except Exception as e:
    # Log unexpected errors with full context
    logger.error(
        "Unexpected error during health check",
        exc_info=True,
        extra={"error_type": type(e).__name__, "error_msg": str(e)}
    )
```

### 2.2 Missing Circuit Breaker Pattern 🟡

**Finding**: No circuit breaker implementation for external service calls

#### Impact
- Cascading failures when dependencies are down
- Resource exhaustion from repeated failed attempts
- Poor user experience during outages
- No graceful degradation

#### TDD Test Cases
```python
# tests/resilience/test_circuit_breaker.py
import pytest
from datetime import datetime, timedelta
from cortex_mcp.resilience import CircuitBreaker, CircuitState

class TestCircuitBreaker:
    @pytest.mark.asyncio
    async def test_circuit_opens_after_failures(self):
        """Test circuit breaker opens after failure threshold."""
        breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=60,
            expected_exception=ConnectionError
        )
        
        async def failing_call():
            raise ConnectionError("Service unavailable")
        
        # First 3 calls should execute and fail
        for i in range(3):
            with pytest.raises(ConnectionError):
                await breaker.call(failing_call)
        
        assert breaker.state == CircuitState.OPEN
        
        # Next call should fail immediately without executing
        with pytest.raises(CircuitBreakerError) as exc_info:
            await breaker.call(failing_call)
        
        assert "circuit breaker is open" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_circuit_closes_after_timeout(self):
        """Test circuit breaker closes after recovery timeout."""
        breaker = CircuitBreaker(
            failure_threshold=1,
            recovery_timeout=0.1  # 100ms for testing
        )
        
        async def call():
            if breaker.failure_count == 0:
                raise ConnectionError("First call fails")
            return "success"
        
        # Open the circuit
        with pytest.raises(ConnectionError):
            await breaker.call(call)
        
        assert breaker.state == CircuitState.OPEN
        
        # Wait for recovery timeout
        await asyncio.sleep(0.15)
        
        # Circuit should be half-open, next call succeeds
        result = await breaker.call(call)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
```

#### Implementation Fix
```python
# packages/cortex-mcp/resilience/circuit_breaker.py
from enum import Enum
from datetime import datetime, timedelta
from typing import Callable, TypeVar, Optional, Type
import asyncio

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open."""
    pass

T = TypeVar('T')

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: Type[Exception] = Exception,
        name: str = "unnamed"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        
    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerError(
                    f"Circuit breaker '{self.name}' is open"
                )
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time and
            datetime.now() >= self.last_failure_time + 
            timedelta(seconds=self.recovery_timeout)
        )
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

## 3. Type Safety Violations 🔴

### 3.1 TypeScript: Extensive Use of `any` Type

**Finding**: 30+ instances of `any` type in TypeScript MCP tools

#### Location
- `packages/agents/src/mcp/AgentToolkitMCPTools.ts`

#### Impact
- Runtime type errors not caught at compile time
- Reduced IntelliSense support
- Harder to refactor safely
- Increased debugging time

#### TDD Test Cases
```typescript
// tests/type-safety/mcp-tools.test.ts
import { AgentToolkitMCPTools } from '../../src/mcp/AgentToolkitMCPTools';

describe('MCP Tools Type Safety', () => {
  it('should enforce strict typing for event data', () => {
    interface TypedEvent<T> {
      type: string;
      data: T;
    }
    
    interface SearchEventData {
      executionId: string;
      query: string;
      searchType: 'ripgrep' | 'semgrep' | 'ast-grep';
      resultsCount: number;
      paths: string[];
      duration: number;
      foundAt: string;
    }
    
    const event: TypedEvent<SearchEventData> = {
      type: 'agent_toolkit.search.results',
      data: {
        executionId: 'exec-123',
        query: 'test',
        searchType: 'ripgrep',
        resultsCount: 5,
        paths: ['/src'],
        duration: 100,
        foundAt: new Date().toISOString()
      }
    };
    
    // This should compile without errors
    expect(event.data.searchType).toBe('ripgrep');
    
    // This should cause TypeScript error
    // @ts-expect-error
    event.data.searchType = 'invalid';
  });
  
  it('should enforce strict typing for tool results', () => {
    interface ToolResult<T> {
      success: boolean;
      data?: T;
      error?: string;
      metadata: {
        correlationId: string;
        timestamp: string;
        tool: string;
      };
    }
    
    const result: ToolResult<SearchResult> = {
      success: true,
      data: {
        tool: 'ripgrep',
        op: 'search',
        inputs: { pattern: 'test', path: '/src' },
        results: []
      },
      metadata: {
        correlationId: 'corr-123',
        timestamp: new Date().toISOString(),
        tool: 'search'
      }
    };
    
    // Type checking should work
    if (result.data) {
      expect(result.data.tool).toBe('ripgrep');
    }
  });
});
```

#### Implementation Fix
```typescript
// packages/agents/src/mcp/types.ts
export interface MCPEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
}

export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: MCPToolMetadata;
}

export interface MCPToolMetadata {
  correlationId: string;
  timestamp: string;
  tool: string;
  duration?: number;
}

// Specific event types
export interface SearchStartedEvent {
  executionId: string;
  toolName: string;
  toolType: 'search' | 'codemod' | 'validation';
  parameters: Record<string, unknown>;
  initiatedBy: string;
  startedAt: string;
}

export interface SearchResultsEvent {
  executionId: string;
  query: string;
  searchType: 'ripgrep' | 'semgrep' | 'ast-grep' | 'multi';
  resultsCount: number;
  paths: string[];
  duration: number;
  foundAt: string;
}

// Event factory with proper typing
export const createTypedEvent = {
  executionStarted: (data: SearchStartedEvent): MCPEvent<SearchStartedEvent> => ({
    type: 'agent_toolkit.execution.started',
    data,
    timestamp: new Date()
  }),
  
  searchResults: (data: SearchResultsEvent): MCPEvent<SearchResultsEvent> => ({
    type: 'agent_toolkit.search.results',
    data,
    timestamp: new Date()
  })
};
```

### 3.2 Python: Missing Type Hints

**Finding**: Inconsistent or missing type hints in Python MCP code

#### Impact
- No static type checking with mypy
- Reduced IDE support
- Harder to understand function contracts
- More runtime type errors

#### TDD Test Cases
```python
# tests/type_checking/test_type_hints.py
import pytest
from typing import get_type_hints
from cortex_fastmcp_server_v2 import search, fetch, ping

class TestTypeHints:
    def test_search_has_proper_type_hints(self):
        """Test that search function has complete type hints."""
        hints = get_type_hints(search)
        
        assert hints['query'] == str
        assert hints['max_results'] == int
        assert 'return' in hints
        assert hints['return'] == dict[str, Any]
    
    def test_fetch_has_proper_type_hints(self):
        """Test that fetch function has complete type hints."""
        hints = get_type_hints(fetch)
        
        assert hints['resource_id'] == str
        assert 'return' in hints
    
    def test_all_public_functions_have_type_hints(self):
        """Test that all public functions have type hints."""
        import cortex_fastmcp_server_v2 as module
        
        for name in dir(module):
            if name.startswith('_'):
                continue
            
            obj = getattr(module, name)
            if callable(obj):
                hints = get_type_hints(obj)
                assert 'return' in hints, f"{name} missing return type hint"
```

#### Implementation Fix
```python
# packages/cortex-mcp/cortex_fastmcp_server_v2.py
from typing import Optional, Dict, List, Any, Union
from typing_extensions import TypedDict, NotRequired

class SearchResult(TypedDict):
    id: str
    title: str
    content: str
    score: float
    metadata: NotRequired[Dict[str, Any]]

class SearchResponse(TypedDict):
    results: List[SearchResult]
    total: int
    query: str

@mcp.tool()
async def search(
    query: str,
    max_results: int = 10,
    filters: Optional[Dict[str, Any]] = None
) -> SearchResponse:
    """
    Search for content in the knowledge base.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        filters: Optional filters to apply
    
    Returns:
        SearchResponse with results and metadata
    """
    # Implementation with proper types
    results: List[SearchResult] = []
    
    # Search logic here...
    
    return SearchResponse(
        results=results,
        total=len(results),
        query=query
    )

@mcp.tool()
async def fetch(resource_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a specific resource by ID.
    
    Args:
        resource_id: Unique identifier of the resource
    
    Returns:
        Resource data if found, None otherwise
    """
    # Implementation with proper types
    pass
```

## 4. Performance & Scalability Issues 🟡

### 4.1 Missing Rate Limiting

**Finding**: No rate limiting on MCP endpoints

#### Impact
- Resource exhaustion from abuse
- Denial of service vulnerability
- Unfair resource allocation
- No QoS guarantees

#### TDD Test Cases
```python
# tests/performance/test_rate_limiting.py
import pytest
import asyncio
from httpx import AsyncClient

class TestRateLimiting:
    @pytest.mark.asyncio
    async def test_rate_limit_enforced(self):
        """Test that rate limits are enforced."""
        async with AsyncClient(base_url="http://localhost:3024") as client:
            # Make requests up to the limit
            for i in range(10):
                response = await client.post("/mcp", json={"method": "ping"})
                assert response.status_code == 200
            
            # Next request should be rate limited
            response = await client.post("/mcp", json={"method": "ping"})
            assert response.status_code == 429
            assert "rate limit exceeded" in response.json()["error"]["message"].lower()
    
    @pytest.mark.asyncio
    async def test_rate_limit_per_user(self):
        """Test that rate limits are per-user."""
        async with AsyncClient(base_url="http://localhost:3024") as client:
            # User A hits rate limit
            for i in range(11):
                await client.post(
                    "/mcp",
                    headers={"X-User-ID": "userA"},
                    json={"method": "ping"}
                )
            
            # User B should still be able to make requests
            response = await client.post(
                "/mcp",
                headers={"X-User-ID": "userB"},
                json={"method": "ping"}
            )
            assert response.status_code == 200
```

#### Implementation Fix
```python
# packages/cortex-mcp/middleware/rate_limiter.py
from typing import Dict, Optional
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
import asyncio

class RateLimiter:
    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_size: int = 10,
        cleanup_interval: int = 60
    ):
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.cleanup_interval = cleanup_interval
        
        self.buckets: Dict[str, TokenBucket] = {}
        self.cleanup_task = None
    
    async def check_rate_limit(self, request: Request) -> None:
        # Get client identifier
        client_id = self._get_client_id(request)
        
        # Get or create bucket
        if client_id not in self.buckets:
            self.buckets[client_id] = TokenBucket(
                capacity=self.burst_size,
                refill_rate=self.requests_per_minute / 60
            )
        
        bucket = self.buckets[client_id]
        
        if not await bucket.consume(1):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(bucket.time_until_refill())}
            )
    
    def _get_client_id(self, request: Request) -> str:
        # Try to get authenticated user ID
        if hasattr(request.state, "user_id"):
            return f"user:{request.state.user_id}"
        
        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"
    
    async def start_cleanup(self):
        """Periodically clean up inactive buckets."""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            
            now = datetime.now()
            inactive_threshold = now - timedelta(minutes=5)
            
            to_remove = [
                client_id for client_id, bucket in self.buckets.items()
                if bucket.last_update < inactive_threshold
            ]
            
            for client_id in to_remove:
                del self.buckets[client_id]

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_update = datetime.now()
    
    async def consume(self, tokens: int = 1) -> bool:
        self._refill()
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        
        return False
    
    def _refill(self):
        now = datetime.now()
        time_passed = (now - self.last_update).total_seconds()
        
        tokens_to_add = time_passed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_update = now
    
    def time_until_refill(self) -> int:
        """Time in seconds until at least one token is available."""
        if self.tokens >= 1:
            return 0
        
        tokens_needed = 1 - self.tokens
        seconds_needed = tokens_needed / self.refill_rate
        
        return int(seconds_needed)
```

## 5. Testing & Quality Assurance Gaps 🟡

### 5.1 Insufficient Test Coverage

**Finding**: Limited integration and performance test coverage

#### Required Test Suites
```python
# tests/integration/test_mcp_e2e.py
import pytest
from httpx import AsyncClient
import asyncio

class TestMCPEndToEnd:
    @pytest.mark.asyncio
    async def test_complete_search_workflow(self):
        """Test complete search workflow from request to response."""
        async with AsyncClient(base_url="http://localhost:3024") as client:
            # Authenticate
            auth_response = await client.post(
                "/auth/token",
                json={"username": "test", "password": "test"}
            )
            token = auth_response.json()["access_token"]
            
            # Perform search
            search_response = await client.post(
                "/mcp",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "method": "search",
                    "params": {"query": "test query"}
                }
            )
            
            assert search_response.status_code == 200
            results = search_response.json()["result"]
            assert "results" in results
            assert isinstance(results["results"], list)
    
    @pytest.mark.asyncio
    async def test_concurrent_requests_handling(self):
        """Test system handles concurrent requests properly."""
        async with AsyncClient(base_url="http://localhost:3024") as client:
            tasks = []
            for i in range(50):
                task = client.post(
                    "/mcp",
                    json={"method": "ping", "params": {}}
                )
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks)
            
            success_count = sum(1 for r in responses if r.status_code == 200)
            rate_limited_count = sum(1 for r in responses if r.status_code == 429)
            
            assert success_count > 0
            assert success_count + rate_limited_count == 50

# tests/performance/test_load.py
import pytest
from locust import HttpUser, task, between

class MCPLoadTest(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Authenticate before starting tasks."""
        response = self.client.post(
            "/auth/token",
            json={"username": "load_test", "password": "test"}
        )
        self.token = response.json()["access_token"]
    
    @task(3)
    def search(self):
        """Search is the most common operation."""
        self.client.post(
            "/mcp",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "method": "search",
                "params": {"query": "random query"}
            }
        )
    
    @task(1)
    def fetch(self):
        """Fetch is less common."""
        self.client.post(
            "/mcp",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "method": "fetch",
                "params": {"resource_id": "test_resource"}
            }
        )
```

### 5.2 Missing Security Testing

```python
# tests/security/test_security_scan.py
import pytest
from zapv2 import ZAPv2

class TestSecurityScan:
    @pytest.mark.security
    def test_owasp_zap_scan(self):
        """Run OWASP ZAP security scan."""
        zap = ZAPv2()
        
        # Spider the application
        zap.spider.scan("http://localhost:3024")
        
        # Run active scan
        zap.ascan.scan("http://localhost:3024")
        
        # Check for high-risk alerts
        alerts = zap.core.alerts(riskid="3")  # High risk
        
        assert len(alerts) == 0, f"High-risk vulnerabilities found: {alerts}"
    
    @pytest.mark.security
    def test_sql_injection_fuzzing(self):
        """Fuzz test for SQL injection."""
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1' AND '1' = '1",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in payloads:
            response = make_request_with_payload(payload)
            
            # Should not return database errors
            assert "sql" not in response.text.lower()
            assert "syntax error" not in response.text.lower()
            assert response.status_code != 500
```

## 6. Operational Readiness Requirements

### 6.1 Monitoring & Observability

```python
# packages/cortex-mcp/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge, Info
import time

# Metrics definitions
mcp_requests_total = Counter(
    'mcp_requests_total',
    'Total MCP requests',
    ['method', 'status']
)

mcp_request_duration = Histogram(
    'mcp_request_duration_seconds',
    'MCP request duration',
    ['method'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 2, 5]
)

mcp_active_connections = Gauge(
    'mcp_active_connections',
    'Number of active MCP connections'
)

mcp_circuit_breaker_state = Gauge(
    'mcp_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    ['service']
)

class MetricsMiddleware:
    async def __call__(self, request, call_next):
        start_time = time.time()
        method = request.json().get("method", "unknown")
        
        try:
            response = await call_next(request)
            status = "success" if response.status_code < 400 else "error"
        except Exception as e:
            status = "exception"
            raise
        finally:
            duration = time.time() - start_time
            mcp_requests_total.labels(method=method, status=status).inc()
            mcp_request_duration.labels(method=method).observe(duration)
        
        return response
```

### 6.2 Health Checks

```python
# packages/cortex-mcp/health/checks.py
from typing import Dict, Any, List
import asyncio
import psutil

class HealthCheckRegistry:
    def __init__(self):
        self.checks: List[HealthCheck] = []
    
    def register(self, check: 'HealthCheck'):
        self.checks.append(check)
    
    async def run_all(self) -> Dict[str, Any]:
        results = {}
        overall_status = "healthy"
        
        for check in self.checks:
            try:
                result = await check.check()
                results[check.name] = result
                
                if result["status"] != "healthy":
                    overall_status = "degraded"
            except Exception as e:
                results[check.name] = {
                    "status": "error",
                    "error": str(e)
                }
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "checks": results,
            "timestamp": datetime.now().isoformat()
        }

class HealthCheck:
    def __init__(self, name: str):
        self.name = name
    
    async def check(self) -> Dict[str, Any]:
        raise NotImplementedError

class RedisHealthCheck(HealthCheck):
    def __init__(self, redis_client):
        super().__init__("redis")
        self.redis = redis_client
    
    async def check(self) -> Dict[str, Any]:
        try:
            await self.redis.ping()
            info = await self.redis.info()
            
            return {
                "status": "healthy",
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "unknown")
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }

class SystemHealthCheck(HealthCheck):
    def __init__(self):
        super().__init__("system")
    
    async def check(self) -> Dict[str, Any]:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        status = "healthy"
        if cpu_percent > 80 or memory.percent > 90 or disk.percent > 90:
            status = "degraded"
        
        return {
            "status": status,
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent
        }
```

## 7. Implementation Timeline

### Week 1: Critical Security Fixes
- **Day 1-2**: Implement authentication and authorization
- **Day 3-4**: Add input validation and sanitization
- **Day 5**: Security testing and penetration testing

### Week 2: Error Handling & Resilience
- **Day 1-2**: Replace bare exception handlers
- **Day 3-4**: Implement circuit breaker pattern
- **Day 5**: Add retry logic with exponential backoff

### Week 3: Type Safety & Performance
- **Day 1-2**: Fix TypeScript `any` types
- **Day 3-4**: Add Python type hints
- **Day 5**: Implement rate limiting

### Week 4: Testing & Monitoring
- **Day 1-2**: Add integration and E2E tests
- **Day 3-4**: Implement monitoring and health checks
- **Day 5**: Performance testing and optimization

## 8. Success Criteria

### Mandatory Requirements
- ✅ 100% authenticated endpoints
- ✅ Zero `any` types in TypeScript
- ✅ Complete Python type hints with mypy passing
- ✅ 80%+ test coverage
- ✅ All OWASP Top 10 vulnerabilities addressed
- ✅ Circuit breakers on all external calls
- ✅ Rate limiting on all endpoints
- ✅ Comprehensive monitoring metrics

### Performance Targets
- P50 latency < 100ms
- P99 latency < 1000ms
- Support 1000 requests/second
- Memory usage < 500MB under load
- Zero memory leaks over 24 hours

## 9. Risk Mitigation

### Deployment Strategy
1. Feature flags for gradual rollout
2. Canary deployment (5% → 25% → 50% → 100%)
3. Automated rollback on error rate > 1%
4. Blue-green deployment for zero downtime

### Monitoring & Alerting
1. Real-time error tracking (Sentry)
2. APM monitoring (DataDog/New Relic)
3. Custom alerts for circuit breaker trips
4. Rate limit violation monitoring
5. Security event logging and alerting

## 10. Conclusion

The MCP packages show good architectural foundation but require significant security, resilience, and type safety improvements before production deployment. Following this TDD-based remediation plan will address all critical issues systematically.

**Estimated Completion**: 4 weeks
**Required Resources**: 2 senior engineers (1 Python, 1 TypeScript)
**Risk Level**: High (until Week 2 completion)

Upon completion, the MCP packages will achieve enterprise-grade security, reliability, and performance suitable for production deployment.
