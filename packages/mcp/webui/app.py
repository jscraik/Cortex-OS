"""FastAPI application for MCP Web UI with real-time dashboard and observability."""

import json
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Request,
    Response,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ..core.caching import get_cache
from ..core.circuit_breakers import circuit_breaker_registry
from ..core.connection_pool import MCPConnectionPool
from ..core.rate_limiting import get_rate_limit_manager
from ..core.server import MCPServer
from ..infrastructure.database import get_database_manager
from ..infrastructure.migrations import run_migrations
from ..observability.health import get_health_manager
from ..observability.metrics import get_metrics_collector
from ..observability.structured_logging import correlation_context, get_logger
from ..security.auth import User, get_current_user
from ..security.middleware import setup_security_middleware
from ..tasks.task_queue import TaskQueue

logger = get_logger("mcp.webui")


# Pydantic models for API
class ToolCallRequest(BaseModel):
    name: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class ToolCallResponse(BaseModel):
    success: bool
    result: dict[str, Any] | None = None
    error: str | None = None
    execution_time: float | None = None


class ServerStatus(BaseModel):
    status: str
    uptime: float
    version: str
    plugins_loaded: int
    active_connections: int
    total_requests: int


class PluginInfo(BaseModel):
    name: str
    version: str
    description: str
    tools: list[dict[str, Any]]
    status: str
    last_loaded: float | None = None


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.user_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str | None = None):
        await websocket.accept()
        self.active_connections.append(websocket)

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str | None = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def send_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            for websocket in self.user_connections[user_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")

    async def broadcast(self, message: str):
        for websocket in self.active_connections[:]:  # Create copy for safe iteration
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                self.active_connections.remove(websocket)


# Global instances
connection_manager = ConnectionManager()
mcp_server: MCPServer | None = None
connection_pool: MCPConnectionPool | None = None
task_queue: TaskQueue | None = None
metrics_collector = get_metrics_collector()
health_manager = get_health_manager()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Middleware for metrics collection and request tracking."""

    async def dispatch(self, request: Request, call_next):
        # Set correlation ID for request tracking
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

        with correlation_context(correlation_id):
            start_time = time.time()

            # Get client IP for rate limiting
            client_ip = request.client.host

            try:
                response = await call_next(request)

                # Calculate duration
                duration = time.time() - start_time

                # Record metrics
                metrics_collector.record_request(
                    method=request.method,
                    status=str(response.status_code),
                    plugin="webui",
                    duration=duration,
                    transport="http",
                )

                # Log request
                logger.log_request(
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration=duration,
                    client_ip=client_ip,
                    user_agent=request.headers.get("User-Agent", ""),
                    correlation_id=correlation_id,
                )

                # Add correlation ID to response
                response.headers["X-Correlation-ID"] = correlation_id

                return response

            except Exception as e:
                duration = time.time() - start_time

                # Record error metrics
                metrics_collector.record_error("request_error", "webui")
                metrics_collector.record_request(
                    method=request.method,
                    status="500",
                    plugin="webui",
                    duration=duration,
                    transport="http",
                )

                # Log error
                logger.error(
                    "Request failed",
                    method=request.method,
                    path=request.url.path,
                    error=str(e),
                    duration=duration,
                    correlation_id=correlation_id,
                )

                raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global mcp_server, connection_pool, task_queue

    # Startup
    logger.info("Starting MCP Web UI application")

    try:
        # Initialize database first
        logger.info("Initializing database...")
        db_manager = await get_database_manager()
        logger.info("Database initialized successfully")

        # Run migrations if enabled
        if os.getenv("DB_AUTO_MIGRATE", "false").lower() == "true":
            logger.info("Running database migrations...")
            migration_success = await run_migrations()
            if migration_success:
                logger.info("Database migrations completed")
            else:
                logger.warning("Database migrations failed")

        # Initialize caching system
        logger.info("Initializing cache system...")
        cache = get_cache()
        logger.info("Cache system initialized")

        # Initialize rate limiting
        logger.info("Initializing rate limiting...")
        rate_limiter = await get_rate_limit_manager()
        logger.info("Rate limiting initialized")

        # Initialize MCP server
        config = {
            "plugin_dir": "plugins",
            "auto_reload": True,
            "config_dir": "config",
        }
        mcp_server = MCPServer(config)
        await mcp_server.initialize()
        await mcp_server.start()

        # Initialize connection pool
        from ..core.connection_pool import ConnectionConfig

        connection_pool = MCPConnectionPool()
        connection_pool.add_connection_config(
            ConnectionConfig(
                host=os.getenv("MCP_HOST", "127.0.0.1"),
                port=int(os.getenv("MCP_PORT", "8000")),
                transport_type=os.getenv("MCP_TRANSPORT", "http"),
            )
        )
        await connection_pool.initialize()

        # Initialize task queue with database backend
        task_queue = TaskQueue()
        await task_queue.initialize()

        logger.info("MCP Web UI application started successfully")

    except Exception as e:
        logger.error(f"Failed to start application: {e}", exc_info=True)
        raise

    yield

    # Shutdown
    logger.info("Shutting down MCP Web UI application")

    try:
        if task_queue:
            await task_queue.shutdown()
        if connection_pool:
            await connection_pool.close()
        if mcp_server:
            await mcp_server.stop()

        # Close database connections
        db_manager = await get_database_manager()
        await db_manager.close()

        logger.info("MCP Web UI application shut down successfully")

    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


# Create FastAPI app
app = FastAPI(
    title="MCP Web UI",
    description="Web interface for Model Context Protocol server",
    version="1.0.0",
    lifespan=lifespan,
)

# Setup comprehensive security middleware (includes CORS, observability, and more)
security_config = setup_security_middleware(app)

# Add observability middleware (if not already added by security middleware)
if not any(isinstance(m, ObservabilityMiddleware) for m in app.middleware_stack):
    app.add_middleware(ObservabilityMiddleware)

# Mount static files
app.mount("/static", StaticFiles(directory="webui/static"), name="static")


# API Routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve main dashboard page."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>MCP Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
            .status-healthy { background: #27ae60; }
            .status-degraded { background: #f39c12; }
            .status-failed { background: #e74c3c; }
            .tool-list { max-height: 400px; overflow-y: auto; }
            .tool-item { padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px; }
            .metrics-chart { height: 300px; }
            .log-container { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; font-family: monospace; height: 300px; overflow-y: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔧 MCP Dashboard</h1>
                <p>Real-time monitoring and management for Model Context Protocol</p>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>Server Status</h3>
                    <div id="server-status">Loading...</div>
                </div>

                <div class="card">
                    <h3>Connection Pool</h3>
                    <div id="pool-status">Loading...</div>
                </div>

                <div class="card">
                    <h3>Circuit Breakers</h3>
                    <div id="circuit-breaker-status">Loading...</div>
                </div>
            </div>

            <div class="card">
                <h3>Available Tools</h3>
                <div id="tools-list" class="tool-list">Loading...</div>
            </div>

            <div class="card">
                <h3>Performance Metrics</h3>
                <canvas id="metrics-chart" class="metrics-chart"></canvas>
            </div>

            <div class="card">
                <h3>Real-time Logs</h3>
                <div id="log-container" class="log-container"></div>
            </div>
        </div>

        <script>
            const ws = new WebSocket(`ws://${window.location.host}/ws`);
            const logContainer = document.getElementById('log-container');

            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleRealtimeUpdate(data);
            };

            function handleRealtimeUpdate(data) {
                if (data.type === 'log') {
                    const logEntry = document.createElement('div');
                    logEntry.textContent = `[${new Date().toISOString()}] ${data.message}`;
                    logContainer.appendChild(logEntry);
                    logContainer.scrollTop = logContainer.scrollHeight;
                } else if (data.type === 'status_update') {
                    updateStatus(data.data);
                }
            }

            function updateStatus(statusData) {
                document.getElementById('server-status').innerHTML = `
                    <div><span class="status-indicator status-healthy"></span>Status: ${statusData.status}</div>
                    <div>Uptime: ${Math.floor(statusData.uptime)}s</div>
                    <div>Plugins: ${statusData.plugins_loaded}</div>
                `;
            }

            // Fetch initial data
            async function fetchStatus() {
                try {
                    const response = await fetch('/api/status');
                    const data = await response.json();
                    updateStatus(data);
                } catch (error) {
                    console.error('Failed to fetch status:', error);
                }
            }

            async function fetchTools() {
                try {
                    const response = await fetch('/api/tools');
                    const tools = await response.json();
                    const toolsList = document.getElementById('tools-list');
                    toolsList.innerHTML = tools.tools.map(tool => `
                        <div class="tool-item">
                            <strong>${tool.name}</strong>
                            <p>${tool.description}</p>
                            <button onclick="testTool('${tool.name}')">Test Tool</button>
                        </div>
                    `).join('');
                } catch (error) {
                    console.error('Failed to fetch tools:', error);
                }
            }

            async function testTool(toolName) {
                try {
                    const response = await fetch('/api/tools/call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: toolName, parameters: {} })
                    });
                    const result = await response.json();
                    alert(`Tool result: ${JSON.stringify(result, null, 2)}`);
                } catch (error) {
                    alert(`Tool error: ${error.message}`);
                }
            }

            // Initialize
            fetchStatus();
            fetchTools();
            setInterval(fetchStatus, 5000); // Update every 5 seconds
        </script>
    </body>
    </html>
    """


@app.get("/api/status", response_model=ServerStatus)
async def get_status():
    """Get server status information."""
    if not mcp_server:
        raise HTTPException(status_code=503, detail="Server not initialized")

    # Calculate uptime (placeholder - you'd track actual start time)
    uptime = 3600.0  # Placeholder

    plugins_count = len(mcp_server.plugin_reloader.list_plugins())

    return ServerStatus(
        status="healthy" if mcp_server.running else "stopped",
        uptime=uptime,
        version="1.0.0",
        plugins_loaded=plugins_count,
        active_connections=len(connection_manager.active_connections),
        total_requests=0,  # You'd track this
    )


@app.get("/api/tools")
async def get_tools():
    """Get list of available tools."""
    if not mcp_server:
        raise HTTPException(status_code=503, detail="Server not initialized")

    message = mcp_server.protocol_handler.create_request("tools/list")
    response = await mcp_server.handle_message(message)

    if response.error:
        raise HTTPException(
            status_code=500, detail=response.error.get("message", "Unknown error")
        )

    return response.result


@app.post("/api/tools/call", response_model=ToolCallResponse)
async def call_tool(
    request: ToolCallRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Execute a tool call."""
    if not mcp_server:
        raise HTTPException(status_code=503, detail="Server not initialized")

    import time

    start_time = time.time()

    try:
        message = mcp_server.protocol_handler.create_request(
            "tools/call", {"name": request.name, "parameters": request.parameters}
        )

        response = await mcp_server.handle_message(message)
        execution_time = time.time() - start_time

        if response.error:
            return ToolCallResponse(
                success=False,
                error=response.error.get("message", "Unknown error"),
                execution_time=execution_time,
            )

        # Log tool execution
        background_tasks.add_task(
            connection_manager.broadcast,
            json.dumps(
                {
                    "type": "log",
                    "message": f"Tool '{request.name}' executed by {user.username} in {execution_time:.3f}s",
                }
            ),
        )

        return ToolCallResponse(
            success=True, result=response.result, execution_time=execution_time
        )

    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Tool execution error: {e}")

        return ToolCallResponse(
            success=False, error=str(e), execution_time=execution_time
        )


@app.get("/api/plugins", response_model=list[PluginInfo])
async def get_plugins():
    """Get list of loaded plugins."""
    if not mcp_server:
        raise HTTPException(status_code=503, detail="Server not initialized")

    plugins = []
    for plugin_name in mcp_server.plugin_reloader.list_plugins():
        plugin = mcp_server.plugin_reloader.get_plugin(plugin_name)

        tools = [
            {"name": tool.name, "description": tool.description}
            for tool in plugin.get_tools()
        ]

        plugins.append(
            PluginInfo(
                name=plugin_name,
                version=getattr(plugin, "version", "1.0.0"),
                description=getattr(plugin, "description", "No description available"),
                tools=tools,
                status="loaded",
                last_loaded=getattr(plugin, "last_loaded", None),
            )
        )

    return plugins


@app.post("/api/plugins/{plugin_name}/reload")
async def reload_plugin(plugin_name: str, user: User = Depends(get_current_user)):
    """Reload a specific plugin."""
    if not mcp_server:
        raise HTTPException(status_code=503, detail="Server not initialized")

    try:
        await mcp_server.plugin_reloader.reload_plugin(plugin_name)

        await connection_manager.broadcast(
            json.dumps(
                {
                    "type": "log",
                    "message": f"Plugin '{plugin_name}' reloaded by {user.username}",
                }
            )
        )

        return {
            "success": True,
            "message": f"Plugin {plugin_name} reloaded successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pool/status")
async def get_pool_status():
    """Get connection pool status."""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Connection pool not initialized")

    return connection_pool.get_pool_stats()


@app.get("/api/circuit-breakers")
async def get_circuit_breakers():
    """Get circuit breaker status."""
    return circuit_breaker_registry.get_registry_status()


@app.post("/api/circuit-breakers/{breaker_name}/reset")
async def reset_circuit_breaker(
    breaker_name: str, user: User = Depends(get_current_user)
):
    """Reset a circuit breaker."""
    breakers = circuit_breaker_registry.get_all_breakers()
    if breaker_name not in breakers:
        raise HTTPException(status_code=404, detail="Circuit breaker not found")

    breakers[breaker_name].reset()

    await connection_manager.broadcast(
        json.dumps(
            {
                "type": "log",
                "message": f"Circuit breaker '{breaker_name}' reset by {user.username}",
            }
        )
    )

    return {"success": True, "message": f"Circuit breaker {breaker_name} reset"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await connection_manager.connect(websocket)

    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()

            # Echo back for now - you could handle commands here
            await connection_manager.send_personal_message(
                json.dumps({"type": "echo", "message": f"Received: {data}"}), websocket
            )

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket)


@app.get("/api/tasks")
async def get_task_status():
    """Get task queue status."""
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue not initialized")

    return await task_queue.get_status()


# Observability Endpoints


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    is_alive = await health_manager.get_liveness()

    if is_alive:
        return {"status": "healthy", "timestamp": time.time()}
    else:
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe endpoint."""
    is_alive = await health_manager.get_liveness()

    if is_alive:
        return {"status": "alive", "timestamp": time.time()}
    else:
        raise HTTPException(status_code=503, detail="Service not alive")


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe endpoint."""
    is_ready = await health_manager.get_readiness()

    if is_ready:
        return {"status": "ready", "timestamp": time.time()}
    else:
        raise HTTPException(status_code=503, detail="Service not ready")


@app.get("/health/deep")
async def deep_health_check():
    """Comprehensive health check with component details."""
    health_status = await health_manager.get_overall_health()

    # Add component-specific health checkers
    if mcp_server and hasattr(health_manager, "checkers"):
        # Add server health
        if "server" not in health_manager.checkers:
            from ..observability.health import (
                HealthChecker,
                HealthCheckResult,
                HealthStatus,
            )

            class ServerHealthChecker(HealthChecker):
                async def _perform_check(self) -> HealthCheckResult:
                    if mcp_server and mcp_server.running:
                        return HealthCheckResult(
                            name="server",
                            status=HealthStatus.HEALTHY,
                            message="MCP server running",
                            details={"running": True},
                        )
                    else:
                        return HealthCheckResult(
                            name="server",
                            status=HealthStatus.UNHEALTHY,
                            message="MCP server not running",
                        )

            health_manager.add_checker(ServerHealthChecker("server"))

    # Determine HTTP status based on overall health
    status_code = 200
    if health_status["status"] == "unhealthy":
        status_code = 503
    elif health_status["status"] == "degraded":
        status_code = 200  # Still serving but degraded

    return Response(
        content=json.dumps(health_status, indent=2),
        media_type="application/json",
        status_code=status_code,
    )


@app.get("/metrics", response_class=PlainTextResponse)
async def prometheus_metrics():
    """Prometheus metrics endpoint."""
    try:
        metrics_data = metrics_collector.get_prometheus_metrics()
        return metrics_data
    except Exception as e:
        logger.error("Failed to generate metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate metrics")


@app.get("/metrics/summary")
async def metrics_summary():
    """Metrics summary endpoint."""
    try:
        summary = metrics_collector.get_metrics_summary()
        return summary
    except Exception as e:
        logger.error("Failed to generate metrics summary", error=str(e))
        raise HTTPException(
            status_code=500, detail="Failed to generate metrics summary"
        )


@app.get("/observability/info")
async def observability_info():
    """Observability system information."""
    return {
        "metrics": {"enabled": True, "collector": "prometheus", "endpoint": "/metrics"},
        "logging": {"format": "json", "correlation_id": "enabled"},
        "health_checks": {
            "basic": "/health",
            "liveness": "/health/live",
            "readiness": "/health/ready",
            "comprehensive": "/health/deep",
        },
        "system_info": {
            "service": "mcp-server",
            "version": "1.0.0",
            "python_version": sys.version,
            "timestamp": time.time(),
        },
    }


# Database and Infrastructure Endpoints
@app.get("/database/status")
async def database_status():
    """Get database status and connection info."""
    try:
        db_manager = await get_database_manager()
        status = await db_manager.get_health_status()
        return status
    except Exception as e:
        logger.error("Failed to get database status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/database/migrations/status")
async def migration_status():
    """Get database migration status."""
    try:
        from ..infrastructure.migrations import get_migration_status

        status = await get_migration_status()
        return status
    except Exception as e:
        logger.error("Failed to get migration status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/database/migrations/run")
async def run_database_migrations():
    """Run pending database migrations."""
    try:
        from ..infrastructure.migrations import run_migrations

        success = await run_migrations()
        return {
            "success": success,
            "message": "Migrations completed" if success else "Migration failed",
        }
    except Exception as e:
        logger.error("Failed to run migrations", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cache/stats")
async def cache_statistics():
    """Get cache performance statistics."""
    try:
        cache = get_cache()
        stats = await cache.get_stats()
        return stats
    except Exception as e:
        logger.error("Failed to get cache stats", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/cache/clear")
async def clear_cache():
    """Clear entire cache."""
    try:
        cache = get_cache()
        success = await cache.clear()
        return {
            "success": success,
            "message": "Cache cleared" if success else "Failed to clear cache",
        }
    except Exception as e:
        logger.error("Failed to clear cache", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cache/invalidate")
async def invalidate_cache_tags(tags: list[str]):
    """Invalidate cache entries by tags."""
    try:
        cache = get_cache()
        deleted_count = await cache.invalidate_by_tags(tags)
        return {"deleted_count": deleted_count, "tags": tags}
    except Exception as e:
        logger.error("Failed to invalidate cache tags", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rate-limiting/status")
async def rate_limiting_status():
    """Get rate limiting system status."""
    try:
        rate_limiter = await get_rate_limit_manager()
        rules = rate_limiter.list_rules()
        return {
            "enabled": True,
            "backend": "redis",
            "rules_count": len(rules),
            "rules": rules,
        }
    except Exception as e:
        logger.error("Failed to get rate limiting status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rate-limiting/usage/{identifier}")
async def rate_limiting_usage(identifier: str, rule_key: str = "api_default"):
    """Get rate limiting usage for identifier."""
    try:
        rate_limiter = await get_rate_limit_manager()
        usage = await rate_limiter.get_usage_stats(identifier, rule_key)
        return usage
    except Exception as e:
        logger.error("Failed to get rate limiting usage", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/rate-limiting/reset/{identifier}")
async def reset_rate_limit(identifier: str, rule_key: str = "api_default"):
    """Reset rate limit for identifier."""
    try:
        rate_limiter = await get_rate_limit_manager()
        success = await rate_limiter.reset_rate_limit(identifier, rule_key)
        return {"success": success, "identifier": identifier, "rule": rule_key}
    except Exception as e:
        logger.error("Failed to reset rate limit", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/security/status")
async def security_status():
    """Get security middleware configuration status."""
    return {
        "middleware_enabled": True,
        "features": {
            "cors": True,
            "security_headers": True,
            "rate_limiting": True,
            "ip_filtering": bool(
                security_config.ip_whitelist or security_config.ip_blacklist
            ),
            "request_validation": True,
            "honeypot": security_config.honeypot_enabled,
            "correlation_id": True,
        },
        "configuration": {
            "cors_origins": security_config.cors_origins,
            "rate_limit_enabled": security_config.rate_limit_enabled,
            "honeypot_enabled": security_config.honeypot_enabled,
            "max_request_size": security_config.max_request_size,
            "request_timeout": security_config.request_timeout,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
