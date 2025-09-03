"""Structured logging system with JSON format and correlation IDs for MCP."""

import json
import logging
import traceback
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path
from typing import Any

# Context variable for correlation ID
correlation_id_context: ContextVar[str] = ContextVar("correlation_id", default=None)


class CorrelationIdFilter(logging.Filter):
    """Logging filter to add correlation ID to log records."""

    def filter(self, record):
        record.correlation_id = correlation_id_context.get("unknown")
        return True


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def __init__(self, service_name: str = "mcp-server"):
        super().__init__()
        self.service_name = service_name

    def format(self, record):
        """Format log record as JSON."""
        # Base log structure
        log_data = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "service": self.service_name,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", "unknown"),
            "thread": record.thread,
            "thread_name": record.threadName,
            "process": record.process,
        }

        # Add module and function info
        if record.module:
            log_data["module"] = record.module
        if record.funcName:
            log_data["function"] = record.funcName
        if record.lineno:
            log_data["line"] = record.lineno

        # Add exception information if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Add extra fields from the log record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in {
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "getMessage",
                "exc_info",
                "exc_text",
                "stack_info",
                "correlation_id",
            } and not key.startswith("_"):
                extra_fields[key] = value

        if extra_fields:
            log_data["extra"] = extra_fields

        return json.dumps(log_data, default=self._json_serializer)

    def _json_serializer(self, obj):
        """Handle non-serializable objects."""
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        elif hasattr(obj, "isoformat"):
            return obj.isoformat()
        else:
            return str(obj)


class StructuredLogger:
    """Enhanced logger with structured logging capabilities."""

    def __init__(self, name: str, service_name: str = "mcp-server"):
        self.name = name
        self.service_name = service_name
        self.logger = logging.getLogger(name)
        self._setup_logger()

    def _setup_logger(self):
        """Setup logger with JSON formatter and correlation ID filter."""
        if not self.logger.handlers:
            # Console handler with JSON formatter
            console_handler = logging.StreamHandler()
            json_formatter = JSONFormatter(self.service_name)
            console_handler.setFormatter(json_formatter)

            # Add correlation ID filter
            correlation_filter = CorrelationIdFilter()
            console_handler.addFilter(correlation_filter)

            self.logger.addHandler(console_handler)
            self.logger.setLevel(logging.INFO)

    def debug(self, message: str, **kwargs):
        """Log debug message with structured data."""
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        """Log info message with structured data."""
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message with structured data."""
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message with structured data."""
        self._log(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message with structured data."""
        self._log(logging.CRITICAL, message, **kwargs)

    def _log(self, level: int, message: str, **kwargs):
        """Internal logging method with extra data."""
        # Filter out None values and convert objects to serializable format
        extra_data = {}
        for key, value in kwargs.items():
            if value is not None:
                if isinstance(value, (dict, list, str, int, float, bool)):
                    extra_data[key] = value
                elif hasattr(value, "__dict__"):
                    extra_data[key] = value.__dict__
                else:
                    extra_data[key] = str(value)

        self.logger.log(level, message, extra=extra_data)

    def exception(self, message: str, **kwargs):
        """Log exception with traceback."""
        self._log(logging.ERROR, message, exc_info=True, **kwargs)

    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration: float,
        user_id: str | None = None,
        **kwargs,
    ):
        """Log HTTP request with structured data."""
        self.info(
            "HTTP Request",
            event_type="http_request",
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=round(duration * 1000, 2),
            user_id=user_id,
            **kwargs,
        )

    def log_tool_execution(
        self,
        tool_name: str,
        plugin_name: str,
        parameters: dict[str, Any],
        result: Any,
        duration: float,
        status: str = "success",
        **kwargs,
    ):
        """Log tool execution with structured data."""
        self.info(
            "Tool Execution",
            event_type="tool_execution",
            tool_name=tool_name,
            plugin_name=plugin_name,
            parameters=parameters,
            result_size=len(str(result)) if result else 0,
            duration_ms=round(duration * 1000, 2),
            status=status,
            **kwargs,
        )

    def log_authentication(
        self,
        username: str,
        result: str,
        method: str = "jwt",
        ip_address: str | None = None,
        **kwargs,
    ):
        """Log authentication attempt."""
        self.info(
            "Authentication Attempt",
            event_type="authentication",
            username=username,
            result=result,
            method=method,
            ip_address=ip_address,
            **kwargs,
        )

    def log_plugin_operation(
        self,
        plugin_name: str,
        operation: str,
        status: str,
        duration: float | None = None,
        **kwargs,
    ):
        """Log plugin operation."""
        log_data = {
            "event_type": "plugin_operation",
            "plugin_name": plugin_name,
            "operation": operation,
            "status": status,
        }

        if duration is not None:
            log_data["duration_ms"] = round(duration * 1000, 2)

        log_data.update(kwargs)

        self.info("Plugin Operation", **log_data)

    def log_security_event(
        self, event_type: str, severity: str, description: str, **kwargs
    ):
        """Log security-related events."""
        self.warning(
            "Security Event",
            event_type="security",
            security_event_type=event_type,
            severity=severity,
            description=description,
            **kwargs,
        )


class LoggingManager:
    """Central logging manager for the MCP system."""

    def __init__(self, service_name: str = "mcp-server", log_level: str = "INFO"):
        self.service_name = service_name
        self.log_level = getattr(logging, log_level.upper())
        self.loggers: dict[str, StructuredLogger] = {}
        self._setup_root_logger()

    def _setup_root_logger(self):
        """Setup root logger configuration."""
        # Set root logger level
        logging.getLogger().setLevel(self.log_level)

        # Disable default logging from some noisy libraries
        logging.getLogger("urllib3").setLevel(logging.WARNING)
        logging.getLogger("asyncio").setLevel(logging.WARNING)
        logging.getLogger("websockets").setLevel(logging.WARNING)

    def get_logger(self, name: str) -> StructuredLogger:
        """Get or create a structured logger."""
        if name not in self.loggers:
            self.loggers[name] = StructuredLogger(name, self.service_name)
        return self.loggers[name]

    def set_log_level(self, level: str):
        """Set global log level."""
        self.log_level = getattr(logging, level.upper())
        logging.getLogger().setLevel(self.log_level)

        # Update all existing loggers
        for logger in self.loggers.values():
            logger.logger.setLevel(self.log_level)

    def configure_file_logging(
        self, log_file: str, max_bytes: int = 10485760, backup_count: int = 5
    ):
        """Configure file logging with rotation."""
        from logging.handlers import RotatingFileHandler

        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count
        )

        json_formatter = JSONFormatter(self.service_name)
        file_handler.setFormatter(json_formatter)

        correlation_filter = CorrelationIdFilter()
        file_handler.addFilter(correlation_filter)

        logging.getLogger().addHandler(file_handler)


# Global logging manager
logging_manager = LoggingManager()


def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance."""
    return logging_manager.get_logger(name)


def set_correlation_id(correlation_id: str | None = None) -> str:
    """Set correlation ID for current context."""
    if correlation_id is None:
        correlation_id = str(uuid.uuid4())

    correlation_id_context.set(correlation_id)
    return correlation_id


def get_correlation_id() -> str:
    """Get current correlation ID."""
    return correlation_id_context.get("unknown")


@contextmanager
def correlation_context(correlation_id: str | None = None):
    """Context manager for correlation ID."""
    old_correlation_id = get_correlation_id()
    new_correlation_id = set_correlation_id(correlation_id)

    try:
        yield new_correlation_id
    finally:
        correlation_id_context.set(old_correlation_id)


def setup_logging(
    service_name: str = "mcp-server",
    log_level: str = "INFO",
    log_file: str | None = None,
):
    """Setup centralized logging configuration."""
    global logging_manager

    logging_manager = LoggingManager(service_name, log_level)

    if log_file:
        logging_manager.configure_file_logging(log_file)

    logger = get_logger("mcp.logging")
    logger.info(
        "Logging system initialized",
        service_name=service_name,
        log_level=log_level,
        log_file=log_file,
    )
