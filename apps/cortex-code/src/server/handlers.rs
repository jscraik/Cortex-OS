use crate::server::{
    daemon::{AppState, ApiError, ChatRequest, ChatResponse, HealthResponse, McpServerInfo, MemoryStats}
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{Json, Response, Sse},
    response::sse::Event,
};
use futures::{stream::{self, Stream}, StreamExt};
use serde::Deserialize;
use serde_json::json;
use std::convert::Infallible;
use tracing::{error, info};

// Health check endpoint
pub async fn health_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    // Get memory stats if available
    let memory_stats = if let Ok(storage) = app.get_memory_storage() {
        if let Ok(stats) = storage.get_memory_stats().await {
            Some(MemoryStats {
                active_sessions: stats.active_conversations,
                total_conversations: stats.total_historical_entries,
                providers_used: stats.unique_providers,
            })
        } else {
            None
        }
    } else {
        None
    };

    let response = HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: 0, // Would be calculated from daemon start time
        memory_stats,
    };

    Ok(Json(response))
}

// Server status endpoint
pub async fn server_status(State(state): State<AppState>) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    let status = json!({
        "service": "cortex-code-daemon",
        "version": env!("CARGO_PKG_VERSION"),
        "status": "running",
        "features": {
            "chat": true,
            "streaming": true,
            "memory": true,
            "mcp": true,
            "multi_provider": true
        },
        "providers": app.get_available_providers().await,
        "uptime": 0 // Would be calculated
    });

    Ok(Json(status))
}

// Chat endpoint
pub async fn chat(
    State(state): State<AppState>,
    Json(request): Json<ChatRequest>
) -> Result<Json<ChatResponse>, (StatusCode, Json<ApiError>)> {
    info!("Received chat request: {}", request.message);

    // Get AI response
    let mut app = state.app.write().await;
    let response = app.get_ai_response(&request.message).await
        .map_err(|e| {
            error!("Failed to get AI response: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
                "Failed to get AI response",
                "ai_error"
            )))
        })?;

    // Generate session ID if not provided
    let session_id = request.session_id.unwrap_or_else(|| {
        uuid::Uuid::new_v4().to_string()
    });

    let chat_response = ChatResponse {
        response,
        provider: request.provider.unwrap_or_else(|| "github".to_string()),
        model: request.model.unwrap_or_else(|| "gpt-4o-mini".to_string()),
        session_id,
        token_count: None, // Would be calculated
    };

    Ok(Json(chat_response))
}

// Streaming chat endpoint
pub async fn chat_stream(
    State(state): State<AppState>,
    Json(request): Json<ChatRequest>
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, (StatusCode, Json<ApiError>)> {
    info!("Received streaming chat request: {}", request.message);

    // Create a simple stream that sends the response in chunks
    // In a real implementation, this would stream from the AI provider
    let mut app = state.app.write().await;
    let response = app.get_ai_response(&request.message).await
        .map_err(|e| {
            error!("Failed to get AI response: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
                "Failed to get AI response",
                "ai_error"
            )))
        })?;

    let stream = stream::iter(response.chars().collect::<Vec<_>>())
        .map(|ch| Ok(Event::default().data(ch.to_string())));

    Ok(Sse::new(stream))
}

// Memory endpoints
pub async fn list_sessions(
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    let sessions = if let Ok(storage) = app.get_memory_storage() {
    let stats = storage.get_memory_stats().await.map_err(|_e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
                "Failed to get memory stats",
                "memory_error"
            )))
        })?;

        json!({
            "sessions": [],  // Would list actual sessions
            "total_count": stats.active_conversations,
            "historical_count": stats.total_historical_entries
        })
    } else {
        json!({
            "sessions": [],
            "total_count": 0,
            "historical_count": 0
        })
    };

    Ok(Json(sessions))
}

pub async fn get_session(
    Path(session_id): Path<String>,
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    if let Ok(storage) = app.get_memory_storage() {
        if let Some(context) = storage.get_context(&session_id).await {
            let session_data = json!({
                "session_id": context.session_id(),
                "provider": context.provider(),
                "model": context.model(),
                "message_count": context.message_count(),
                "created_at": context.created_at(),
                "last_updated": context.last_updated(),
                "tags": context.tags(),
                "decisions": context.decisions()
            });
            Ok(Json(session_data))
        } else {
            Err((StatusCode::NOT_FOUND, Json(ApiError::new(
                "Session not found",
                "session_not_found"
            ))))
        }
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(ApiError::new(
            "Memory storage not available",
            "memory_unavailable"
        ))))
    }
}

#[derive(Deserialize)]
pub struct SearchQuery {
    q: String,
    limit: Option<usize>,
}

pub async fn search_memory(
    Query(query): Query<SearchQuery>,
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    if let Ok(storage) = app.get_memory_storage() {
    let results = storage.search_memory(&query.q).await.map_err(|_e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
                "Search failed",
                "search_error"
            )))
        })?;

        let limited_results: Vec<_> = results.into_iter()
            .take(query.limit.unwrap_or(20))
            .collect();

        Ok(Json(json!({
            "query": query.q,
            "results": limited_results,
            "count": limited_results.len()
        })))
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(ApiError::new(
            "Memory storage not available",
            "memory_unavailable"
        ))))
    }
}

#[derive(Deserialize)]
pub struct ExportQuery {
    format: Option<String>,
}

pub async fn export_memory(
    Query(query): Query<ExportQuery>,
    State(state): State<AppState>
) -> Result<Response, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    if let Ok(storage) = app.get_memory_storage() {
        let format = match query.format.as_deref() {
            Some("json") => crate::memory::storage::ExportFormat::Json,
            Some("csv") => crate::memory::storage::ExportFormat::Csv,
            _ => crate::memory::storage::ExportFormat::Markdown,
        };

    let export_data = storage.export_memory(format.clone()).await.map_err(|_e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
                "Export failed",
                "export_error"
            )))
        })?;

        let content_type = match format {
            crate::memory::storage::ExportFormat::Json => "application/json",
            crate::memory::storage::ExportFormat::Csv => "text/csv",
            crate::memory::storage::ExportFormat::Markdown => "text/markdown",
        };

        Ok(Response::builder()
            .status(StatusCode::OK)
            .header("content-type", content_type)
            .header("content-disposition", "attachment; filename=memory_export")
            .body(export_data.into())
            .unwrap())
    } else {
        Err((StatusCode::SERVICE_UNAVAILABLE, Json(ApiError::new(
            "Memory storage not available",
            "memory_unavailable"
        ))))
    }
}

// MCP endpoints
pub async fn list_mcp_servers(
    State(state): State<AppState>
) -> Result<Json<Vec<McpServerInfo>>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    let servers = app.list_mcp_servers().await.map_err(|_e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::new(
            "Failed to list MCP servers",
            "mcp_error"
        )))
    })?;

    let server_info: Vec<McpServerInfo> = servers.into_iter().map(|server| {
        McpServerInfo {
            name: server.name,
            status: server.status,
            tools_count: 0,  // Would get actual counts
            resources_count: 0,
        }
    }).collect();

    Ok(Json(server_info))
}

pub async fn list_mcp_tools(
    Path(server_name): Path<String>,
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let _app = state.app.read().await;

    // This would get tools from the specific MCP server
    let tools = json!({
        "server": server_name,
        "tools": []  // Would list actual tools
    });

    Ok(Json(tools))
}

#[derive(Deserialize)]
pub struct ExecuteToolRequest {
    tool_name: String,
    arguments: serde_json::Value,
}

pub async fn execute_mcp_tool(
    Path(server_name): Path<String>,
    State(state): State<AppState>,
    Json(request): Json<ExecuteToolRequest>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let _app = state.app.read().await;

    // This would execute the tool on the MCP server
    let result = json!({
        "server": server_name,
        "tool": request.tool_name,
        "arguments": request.arguments,
        "result": "Tool execution not implemented yet"
    });

    Ok(Json(result))
}

// Provider endpoints
pub async fn list_providers(
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let app = state.app.read().await;

    let providers = app.get_available_providers().await;

    Ok(Json(json!({
        "providers": providers,
        "default": "github"
    })))
}

pub async fn list_models(
    Path(provider): Path<String>,
    State(state): State<AppState>
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ApiError>)> {
    let _app = state.app.read().await;

    // This would get models from the specific provider
    let models = match provider.as_str() {
        "github" => vec!["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
        "openai" => vec!["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        "anthropic" => vec!["claude-3-sonnet", "claude-3-haiku", "claude-3-opus"],
        "mlx" => vec!["local-model"],
        _ => vec![],
    };

    Ok(Json(json!({
        "provider": provider,
        "models": models
    })))
}

// API documentation endpoint
pub async fn api_docs() -> &'static str {
    r#"
<!DOCTYPE html>
<html>
<head>
    <title>Cortex Code API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2 { color: #333; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 10px 0; border-left: 4px solid #007cba; }
        .method { font-weight: bold; color: #007cba; }
        pre { background: #333; color: #fff; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🤖 Cortex Code API Documentation</h1>
    <p>RESTful API for the Cortex Code daemon service.</p>

    <h2>Health & Status</h2>
    <div class="endpoint">
        <span class="method">GET</span> /health<br>
        Returns service health status and memory statistics.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> /status<br>
        Returns detailed server status and capabilities.
    </div>

    <h2>Chat</h2>
    <div class="endpoint">
        <span class="method">POST</span> /api/v1/chat<br>
        Send a message and get AI response.
        <pre>{"message": "Hello", "provider": "github", "model": "gpt-4o-mini"}</pre>
    </div>

    <div class="endpoint">
        <span class="method">POST</span> /api/v1/chat/stream<br>
        Send a message and get streaming AI response via Server-Sent Events.
    </div>

    <h2>Memory</h2>
    <div class="endpoint">
        <span class="method">GET</span> /api/v1/memory/sessions<br>
        List all conversation sessions.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> /api/v1/memory/sessions/{session_id}<br>
        Get details for a specific session.
    </div>

    <div class="endpoint">
        <span class="method">POST</span> /api/v1/memory/search?q=query<br>
        Search conversation memory.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> /api/v1/memory/export?format=json|csv|markdown<br>
        Export conversation memory in specified format.
    </div>

    <h2>MCP (Model Context Protocol)</h2>
    <div class="endpoint">
        <span class="method">GET</span> /api/v1/mcp/servers<br>
        List all connected MCP servers.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> /api/v1/mcp/servers/{server_name}/tools<br>
        List tools available on a specific MCP server.
    </div>

    <div class="endpoint">
        <span class="method">POST</span> /api/v1/mcp/servers/{server_name}/execute<br>
        Execute a tool on a specific MCP server.
        <pre>{"tool_name": "list_files", "arguments": {"path": "/"}}</pre>
    </div>

    <h2>Providers</h2>
    <div class="endpoint">
        <span class="method">GET</span> /api/v1/providers<br>
        List all available AI providers.
    </div>

    <div class="endpoint">
        <span class="method">GET</span> /api/v1/providers/{provider}/models<br>
        List models available for a specific provider.
    </div>

    <h2>Example Usage</h2>
    <pre>
# Health check
curl http://localhost:8080/health

# Send chat message
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Rust?", "provider": "github"}'

# Search memory
curl "http://localhost:8080/api/v1/memory/search?q=rust&limit=5"

# Export memory as JSON
curl "http://localhost:8080/api/v1/memory/export?format=json" > memory.json
    </pre>
</body>
</html>
    "#
}
