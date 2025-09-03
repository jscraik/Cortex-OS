"""Exception classes for MCP implementation."""

from typing import Any


class MCPError(Exception):
    """Base exception for MCP-related errors."""

    def __init__(
        self,
        message: str,
        error_code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}


class TransportError(MCPError):
    """Error in transport layer communication."""

    pass


class ProtocolError(MCPError):
    """Error in MCP protocol handling."""

    pass


class AuthenticationError(MCPError):
    """Authentication-related errors."""

    pass


class AuthorizationError(MCPError):
    """Authorization-related errors."""

    pass


class PluginError(MCPError):
    """Plugin-related errors."""

    pass


class ConnectionPoolError(MCPError):
    """Connection pool-related errors."""

    pass


class ToolExecutionError(MCPError):
    """Tool execution errors."""

    pass


class ConfigurationError(MCPError):
    """Configuration-related errors."""

    pass


class ValidationError(MCPError):
    """Data validation errors."""

    pass


class MCPConnectionError(MCPError):
    """MCP-specific connection-related errors."""

    pass


class MCPTimeoutError(MCPError):
    """MCP-specific timeout-related errors."""

    pass


class RateLimitError(MCPError):
    """Rate limiting errors."""

    pass


class ResourceError(MCPError):
    """Resource-related errors (memory, disk, etc.)."""

    pass


class CircuitBreakerError(MCPError):
    """Circuit breaker errors."""

    pass


class TaskQueueError(MCPError):
    """Task queue errors."""

    pass


class IntegrationError(MCPError):
    """Integration layer errors."""

    pass


class MemoryServiceError(MCPError):
    """Memory service/system errors."""

    pass


class OrchestrationError(MCPError):
    """Orchestration errors."""

    pass


class SecurityError(MCPError):
    """Security-related errors."""

    pass
