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
use tower_http::cors::CorsLayer;

use crate::{app::CortexApp, enhanced_config::EnhancedConfig, cloudflare::CloudflareManager};

/// WebUI server for browser-based interface
/// Inspired by the documentation provided about MCP WebUI
pub struct WebUIServer {
    app: Arc<RwLock<CortexApp>>,
    config: EnhancedConfig,
    cloudflare: Option<Arc<CloudflareManager>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusResponse {
    pub status: String,
    pub version: String,
    pub uptime: u64,
    pub active_connections: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolCallRequest {
    pub tool_name: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigUpdate {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TunnelRequest {
    pub action: String, // "start" or "stop"
}

impl WebUIServer {
    pub fn new(app: Arc<RwLock<CortexApp>>, config: EnhancedConfig) -> Self {
        let cloudflare = if let Some(cf_config) = &config.server.cloudflare {
            Some(Arc::new(CloudflareManager::new(cf_config.clone())))
        } else {
            None
        };

        Self {
            app,
            config,
            cloudflare,
        }
    }

    pub fn router(&self) -> Router {
        Router::new()
            // API routes
            .route("/api/status", get(Self::get_status))
            .route("/api/tools/call", post(Self::call_tool))
            .route("/api/config", get(Self::get_config))
            .route("/api/config", post(Self::update_config))
            .route("/api/chat", post(Self::chat))
            .route("/api/github/prs", get(Self::list_prs))
            .route("/api/mcp/servers", get(Self::list_mcp_servers))
            .route("/api/tunnel/status", get(Self::get_tunnel_status))
            .route("/api/tunnel/control", post(Self::control_tunnel))
            // Static file serving would go here
            .layer(CorsLayer::permissive())
            .with_state(Arc::new(self.clone()))
    }

    async fn get_status(State(_state): State<Arc<WebUIServer>>) -> Result<Json<StatusResponse>, StatusCode> {
        Ok(Json(StatusResponse {
            status: "running".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime: 0, // TODO: Calculate actual uptime
            active_connections: 1, // TODO: Track actual connections
        }))
    }

    async fn call_tool(
        State(_state): State<Arc<WebUIServer>>,
        Json(request): Json<ToolCallRequest>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        // TODO: Implement MCP tool calling
        let result = serde_json::json!({
            "tool": request.tool_name,
            "result": "Tool execution would happen here",
            "parameters": request.parameters
        });
        Ok(Json(result))
    }

    async fn get_config(State(state): State<Arc<WebUIServer>>) -> Result<Json<EnhancedConfig>, StatusCode> {
        Ok(Json(state.config.clone()))
    }

    async fn update_config(
        State(_state): State<Arc<WebUIServer>>,
        Json(_update): Json<ConfigUpdate>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        // TODO: Implement config updates
        Ok(Json(serde_json::json!({"status": "updated"})))
    }

    async fn chat(
        State(_state): State<Arc<WebUIServer>>,
        Json(request): Json<serde_json::Value>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        // TODO: Implement chat functionality
        let response = serde_json::json!({
            "response": "AI response would be generated here",
            "request": request
        });
        Ok(Json(response))
    }

    async fn list_prs(State(_state): State<Arc<WebUIServer>>) -> Result<Json<serde_json::Value>, StatusCode> {
        // TODO: Implement GitHub PR listing
        Ok(Json(serde_json::json!({"prs": []})))
    }

    async fn list_mcp_servers(State(_state): State<Arc<WebUIServer>>) -> Result<Json<serde_json::Value>, StatusCode> {
        // TODO: Implement MCP server listing
        Ok(Json(serde_json::json!({"servers": []})))
    }

    async fn get_tunnel_status(State(state): State<Arc<WebUIServer>>) -> Result<Json<serde_json::Value>, StatusCode> {
        if let Some(ref cloudflare) = state.cloudflare {
            match cloudflare.get_status().await {
                Ok(Some(status)) => Ok(Json(serde_json::to_value(status).unwrap())),
                Ok(None) => Ok(Json(serde_json::json!({"status": "not_running"}))),
                Err(e) => {
                    eprintln!("Error getting tunnel status: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        } else {
            Ok(Json(serde_json::json!({"status": "not_configured"})))
        }
    }

    async fn control_tunnel(
        State(state): State<Arc<WebUIServer>>,
        Json(request): Json<TunnelRequest>,
    ) -> Result<Json<serde_json::Value>, StatusCode> {
        if let Some(ref cloudflare) = state.cloudflare {
            match request.action.as_str() {
                "start" => {
                    match cloudflare.start_tunnel(state.config.webui.port).await {
                        Ok(url) => Ok(Json(serde_json::json!({
                            "status": "started",
                            "url": url
                        }))),
                        Err(e) => {
                            eprintln!("Error starting tunnel: {}", e);
                            Err(StatusCode::INTERNAL_SERVER_ERROR)
                        }
                    }
                }
                "stop" => {
                    match cloudflare.stop_tunnel().await {
                        Ok(_) => Ok(Json(serde_json::json!({"status": "stopped"}))),
                        Err(e) => {
                            eprintln!("Error stopping tunnel: {}", e);
                            Err(StatusCode::INTERNAL_SERVER_ERROR)
                        }
                    }
                }
                _ => Err(StatusCode::BAD_REQUEST)
            }
        } else {
            Err(StatusCode::NOT_FOUND)
        }
    }
}

impl Clone for WebUIServer {
    fn clone(&self) -> Self {
        Self {
            app: self.app.clone(),
            config: self.config.clone(),
            cloudflare: self.cloudflare.clone(),
        }
    }
}

pub async fn start_webui_server(
    app: Arc<RwLock<CortexApp>>,
    config: EnhancedConfig,
) -> anyhow::Result<()> {
    if !config.webui.enabled {
        return Ok(());
    }

    let server = WebUIServer::new(app, config.clone());

    // Auto-start Cloudflare tunnel if configured
    if let Some(ref cloudflare) = server.cloudflare {
        if let Ok(Some(tunnel_url)) = cloudflare.auto_start(config.webui.port).await {
            println!("🌐 Cortex Code WebUI accessible via Cloudflare tunnel: {}", tunnel_url);
        }
    }

    let app_router = server.router();

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.webui.host, config.webui.port)).await?;

    println!("🚀 WebUI server starting on http://{}:{}", config.webui.host, config.webui.port);

    axum::serve(listener, app_router).await?;

    Ok(())
}
