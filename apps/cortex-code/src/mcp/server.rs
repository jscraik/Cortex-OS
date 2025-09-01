use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub working_dir: Option<PathBuf>,
    pub status: McpServerStatus,
    pub capabilities: Vec<McpCapability>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum McpServerStatus {
    Stopped,
    Starting,
    Running,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum McpCapability {
    Tools,
    Resources,
    Prompts,
    Logging,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpPrompt {
    pub name: String,
    pub description: String,
    pub arguments: Vec<McpPromptArgument>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpPromptArgument {
    pub name: String,
    pub description: String,
    pub required: bool,
}

impl McpServerInfo {
    pub fn new(name: impl Into<String>, command: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            description: String::new(),
            command: command.into(),
            args: Vec::new(),
            env: HashMap::new(),
            working_dir: None,
            status: McpServerStatus::Stopped,
            capabilities: Vec::new(),
            version: "1.0.0".to_string(),
        }
    }
    
    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = description.into();
        self
    }
    
    pub fn with_args(mut self, args: Vec<String>) -> Self {
        self.args = args;
        self
    }
    
    pub fn with_env(mut self, env: HashMap<String, String>) -> Self {
        self.env = env;
        self
    }
    
    pub fn with_working_dir(mut self, working_dir: PathBuf) -> Self {
        self.working_dir = Some(working_dir);
        self
    }
    
    pub fn with_capabilities(mut self, capabilities: Vec<McpCapability>) -> Self {
        self.capabilities = capabilities;
        self
    }
    
    pub fn is_running(&self) -> bool {
        matches!(self.status, McpServerStatus::Running)
    }
    
    pub fn set_status(&mut self, status: McpServerStatus) {
        self.status = status;
    }
}

impl Default for McpServerInfo {
    fn default() -> Self {
        Self::new("Unknown Server", "unknown")
    }
}

impl std::fmt::Display for McpServerStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            McpServerStatus::Stopped => write!(f, "Stopped"),
            McpServerStatus::Starting => write!(f, "Starting"),
            McpServerStatus::Running => write!(f, "Running"),
            McpServerStatus::Error(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl std::fmt::Display for McpCapability {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            McpCapability::Tools => write!(f, "Tools"),
            McpCapability::Resources => write!(f, "Resources"),
            McpCapability::Prompts => write!(f, "Prompts"),
            McpCapability::Logging => write!(f, "Logging"),
        }
    }
}

// Built-in MCP servers for common functionality
pub fn default_mcp_servers() -> Vec<McpServerInfo> {
    vec![
        McpServerInfo::new("cortex-fs", "cortex-mcp-fs")
            .with_description("File system operations - read, write, search files")
            .with_capabilities(vec![McpCapability::Tools, McpCapability::Resources]),
        
        McpServerInfo::new("cortex-git", "cortex-mcp-git")
            .with_description("Git operations - status, diff, commit, branch management")
            .with_capabilities(vec![McpCapability::Tools]),
        
        McpServerInfo::new("cortex-web", "cortex-mcp-web")
            .with_description("Web scraping and HTTP requests")
            .with_capabilities(vec![McpCapability::Tools]),
        
        McpServerInfo::new("cortex-db", "cortex-mcp-db")
            .with_description("Database operations and queries")
            .with_capabilities(vec![McpCapability::Tools, McpCapability::Resources]),
    ]
}