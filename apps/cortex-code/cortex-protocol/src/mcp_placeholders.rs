// Placeholder types for missing MCP dependencies
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CallToolResult {
    pub is_error: bool,
    pub content: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Tool {
    pub name: String,
    pub description: String,
}

pub type McpTool = Tool;

pub type RequestId = Uuid;
