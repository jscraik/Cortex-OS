pub mod client;
pub mod server;
pub mod protocol;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Client-server architecture inspired by SST OpenCode
/// Allows remote operation and multi-client support

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub id: String,
    pub method: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub id: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<ErrorResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl Request {
    pub fn new(method: &str, params: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            method: method.to_string(),
            params,
        }
    }
}

impl Response {
    pub fn success(id: String, result: serde_json::Value) -> Self {
        Self {
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: String, code: i32, message: String) -> Self {
        Self {
            id,
            result: None,
            error: Some(ErrorResponse {
                code,
                message,
                data: None,
            }),
        }
    }
}

/// Supported client-server methods
pub mod methods {
    pub const AI_CHAT: &str = "ai.chat";
    pub const AI_STREAM: &str = "ai.stream";
    pub const GITHUB_LIST_PRS: &str = "github.list_prs";
    pub const GITHUB_GET_PR: &str = "github.get_pr";
    pub const MCP_LIST_SERVERS: &str = "mcp.list_servers";
    pub const MCP_CALL_TOOL: &str = "mcp.call_tool";
    pub const SYSTEM_STATUS: &str = "system.status";
    pub const CONFIG_GET: &str = "config.get";
    pub const CONFIG_SET: &str = "config.set";
}
