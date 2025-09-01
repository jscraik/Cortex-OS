use crate::{app::CortexApp, error::Result, memory::MemoryStorage};
use crate::server::handlers;
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, warn};

#[derive(Clone)]
pub struct AppState {
    pub app: Arc<RwLock<CortexApp>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub session_id: Option<String>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub response: String,
    pub provider: String,
    pub model: String,
    pub session_id: String,
    pub token_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime: u64,
    pub memory_stats: Option<MemoryStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub active_sessions: usize,
    pub total_conversations: usize,
    pub providers_used: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerInfo {
    pub name: String,
    pub status: String,
    pub tools_count: usize,
    pub resources_count: usize,
}

pub struct DaemonServer {
    app_state: AppState,
    port: u16,
    start_time: std::time::Instant,
}

impl DaemonServer {
    pub fn new(app: CortexApp, port: u16) -> Self {
        Self {
            app_state: AppState {
                app: Arc::new(RwLock::new(app)),
            },
            port,
            start_time: std::time::Instant::now(),
        }
    }

    pub async fn start(&self) -> Result<()> {
        let app = self.create_router();

        // Secure binding - only bind to localhost in development, configurable for production
        let bind_addr = if cfg!(debug_assertions) {
            format!("127.0.0.1:{}", self.port)
        } else {
            // In production, allow configuration via environment variable
            std::env::var("CORTEX_BIND_ADDRESS")
                .unwrap_or_else(|_| format!("127.0.0.1:{}", self.port))
        };

        let listener = tokio::net::TcpListener::bind(&bind_addr).await
            .map_err(|e| crate::error::ProviderError::Api(format!("Failed to bind to port {}: {}", self.port, e)))?;

        info!("🚀 Cortex TUI Daemon started on http://{}", bind_addr);
        info!("📚 API Documentation available at http://localhost:{}/docs", self.port);

        axum::serve(listener, app).await
            .map_err(|e| crate::error::ProviderError::Api(format!("Server error: {}", e)).into())
    }

    fn create_router(&self) -> Router {
        Router::new()
            // Health and status endpoints
            .route("/health", get(handlers::health_check))
            .route("/status", get(handlers::server_status))

            // Chat endpoints
            .route("/api/v1/chat", post(handlers::chat))
            .route("/api/v1/chat/stream", post(handlers::chat_stream))

            // Memory endpoints
            .route("/api/v1/memory/sessions", get(handlers::list_sessions))
            .route("/api/v1/memory/sessions/:session_id", get(handlers::get_session))
            .route("/api/v1/memory/search", post(handlers::search_memory))
            .route("/api/v1/memory/export", get(handlers::export_memory))

            // MCP endpoints
            .route("/api/v1/mcp/servers", get(handlers::list_mcp_servers))
            .route("/api/v1/mcp/servers/:server_name/tools", get(handlers::list_mcp_tools))
            .route("/api/v1/mcp/servers/:server_name/execute", post(handlers::execute_mcp_tool))

            // Provider endpoints
            .route("/api/v1/providers", get(handlers::list_providers))
            .route("/api/v1/providers/:provider/models", get(handlers::list_models))

            // Documentation
            .route("/docs", get(handlers::api_docs))

            // Middleware
            .layer(
                ServiceBuilder::new()
                    .layer(TraceLayer::new_for_http())
                    .layer(CorsLayer::permissive())
            )
            .with_state(self.app_state.clone())
    }

    pub fn uptime(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
}

// Error handling for API responses
impl From<crate::error::Error> for StatusCode {
    fn from(err: crate::error::Error) -> Self {
        match err {
            crate::error::Error::Provider(crate::error::ProviderError::RateLimited) => StatusCode::TOO_MANY_REQUESTS,
            crate::error::Error::Provider(crate::error::ProviderError::Api(_)) => StatusCode::BAD_REQUEST,
            crate::error::Error::Config(_) => StatusCode::BAD_REQUEST,
            crate::error::Error::Mcp(_) => StatusCode::SERVICE_UNAVAILABLE,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub error: String,
    pub code: String,
    pub details: Option<serde_json::Value>,
}

impl ApiError {
    pub fn new(error: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            code: code.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}
