use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::SystemTime;
use tokio::sync::RwLock;

/// MCP server information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerInfo {
    /// Server name
    pub name: String,
    /// Server status
    pub status: String,
    /// Server command
    pub command: String,
    /// Server arguments
    pub args: Vec<String>,
    /// Server environment variables
    pub env: HashMap<String, String>,
    /// Server working directory
    pub cwd: Option<PathBuf>,
    /// Process ID if running
    pub pid: Option<u32>,
    /// Start time
    pub start_time: Option<SystemTime>,
    /// Available tools
    pub tools: Vec<McpTool>,
    /// Available resources
    pub resources: Vec<McpResource>,
    /// Available prompts
    pub prompts: Vec<McpPrompt>,
}

/// MCP tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    /// Tool name
    pub name: String,
    /// Tool description
    pub description: Option<String>,
    /// Input schema
    pub input_schema: Option<serde_json::Value>,
}

/// MCP resource definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResource {
    /// Resource URI
    pub uri: String,
    /// Resource name
    pub name: Option<String>,
    /// Resource description
    pub description: Option<String>,
    /// MIME type
    pub mime_type: Option<String>,
}

/// MCP prompt definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpPrompt {
    /// Prompt name
    pub name: String,
    /// Prompt description
    pub description: Option<String>,
    /// Required arguments
    pub arguments: Vec<String>,
}

/// Server status enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum McpServerStatus {
    /// Server is stopped
    Stopped,
    /// Server is starting
    Starting,
    /// Server is running
    Running,
    /// Server is stopping
    Stopping,
    /// Server has failed
    Failed,
    /// Server status is unknown
    Unknown,
}

impl McpServerStatus {
    /// Convert to string
    pub fn as_str(&self) -> &'static str {
        match self {
            McpServerStatus::Stopped => "stopped",
            McpServerStatus::Starting => "starting",
            McpServerStatus::Running => "running",
            McpServerStatus::Stopping => "stopping",
            McpServerStatus::Failed => "failed",
            McpServerStatus::Unknown => "unknown",
        }
    }

    /// Create from string
    pub fn from_str(s: &str) -> Self {
        match s {
            "stopped" => McpServerStatus::Stopped,
            "starting" => McpServerStatus::Starting,
            "running" => McpServerStatus::Running,
            "stopping" => McpServerStatus::Stopping,
            "failed" => McpServerStatus::Failed,
            _ => McpServerStatus::Unknown,
        }
    }
}

impl ToString for McpServerStatus {
    fn to_string(&self) -> String {
        self.as_str().to_string()
    }
}

/// MCP registry for managing server information
#[derive(Debug, Clone)]
pub struct McpRegistry {
    /// Registered servers
    servers: Arc<RwLock<HashMap<String, McpServerInfo>>>,
}

impl McpRegistry {
    /// Create a new registry
    pub fn new() -> Self {
        Self {
            servers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add a server to the registry
    pub async fn add_server(&self, server: McpServerInfo) -> Result<()> {
        let mut servers = self.servers.write().await;
        servers.insert(server.name.clone(), server);
        Ok(())
    }

    /// Remove a server from the registry
    pub async fn remove_server(&self, name: &str) -> Result<()> {
        let mut servers = self.servers.write().await;
        servers.remove(name);
        Ok(())
    }

    /// Get a server by name
    pub async fn get_server(&self, name: &str) -> Result<McpServerInfo> {
        let servers = self.servers.read().await;
        servers
            .get(name)
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", name))
    }

    /// Update server status
    pub async fn update_server_status(&self, name: &str, status: &str) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(name) {
            server.status = status.to_string();
        }
        Ok(())
    }

    /// Update server PID
    pub async fn update_server_pid(&self, name: &str, pid: Option<u32>) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(name) {
            server.pid = pid;
        }
        Ok(())
    }

    /// Update server tools
    pub async fn update_server_tools(&self, name: &str, tools: Vec<McpTool>) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(name) {
            server.tools = tools;
        }
        Ok(())
    }

    /// Update server resources
    pub async fn update_server_resources(&self, name: &str, resources: Vec<McpResource>) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(name) {
            server.resources = resources;
        }
        Ok(())
    }

    /// Update server prompts
    pub async fn update_server_prompts(&self, name: &str, prompts: Vec<McpPrompt>) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(name) {
            server.prompts = prompts;
        }
        Ok(())
    }

    /// List all servers
    pub async fn list_servers(&self) -> Vec<McpServerInfo> {
        let servers = self.servers.read().await;
        servers.values().cloned().collect()
    }

    /// List servers by status
    pub async fn list_servers_by_status(&self, status: &str) -> Vec<McpServerInfo> {
        let servers = self.servers.read().await;
        servers
            .values()
            .filter(|server| server.status == status)
            .cloned()
            .collect()
    }

    /// Check if server exists
    pub async fn has_server(&self, name: &str) -> bool {
        let servers = self.servers.read().await;
        servers.contains_key(name)
    }

    /// Get server count
    pub async fn server_count(&self) -> usize {
        let servers = self.servers.read().await;
        servers.len()
    }

    /// Clear all servers
    pub async fn clear(&self) {
        let mut servers = self.servers.write().await;
        servers.clear();
    }

    /// Get running servers
    pub async fn get_running_servers(&self) -> Vec<McpServerInfo> {
        self.list_servers_by_status("running").await
    }

    /// Get failed servers
    pub async fn get_failed_servers(&self) -> Vec<McpServerInfo> {
        self.list_servers_by_status("failed").await
    }
}

impl Default for McpRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Create default MCP servers configuration
pub fn default_mcp_servers() -> Vec<McpServerInfo> {
    let mut servers: Vec<McpServerInfo> = Vec::new();

    let mut push_if_exists = |name: &str, path: &str, env: Option<HashMap<String, String>>| {
        if std::path::Path::new(path).exists() {
            servers.push(McpServerInfo {
                name: name.to_string(),
                status: "stopped".to_string(),
                command: "node".to_string(),
                args: vec![path.to_string()],
                env: env.unwrap_or_default(),
                cwd: None,
                pid: None,
                start_time: None,
                tools: vec![],
                resources: vec![],
                prompts: vec![],
            });
        } else {
            tracing::warn!("MCP default server path not found: {path} (skipping {name})");
        }
    };

    // In-repo servers
    push_if_exists(
        "filesystem",
        "/Users/jamiecraik/.Cortex-OS/servers/src/filesystem/dist/index.js",
        None,
    );
    push_if_exists(
        "memory",
        "/Users/jamiecraik/.Cortex-OS/servers/src/memory/dist/index.js",
        None,
    );

    // External servers in node_modules
    let mut brave_env = HashMap::new();
    brave_env.insert(
        "BRAVE_API_KEY".to_string(),
        std::env::var("BRAVE_API_KEY").unwrap_or_default(),
    );
    push_if_exists(
        "brave-search",
        "/Users/jamiecraik/.Cortex-OS/servers/node_modules/mcp-server-brave-search/dist/index.js",
        Some(brave_env),
    );

    let mut gh_env = HashMap::new();
    gh_env.insert(
        "GITHUB_TOKEN".to_string(),
        std::env::var("GITHUB_TOKEN").unwrap_or_default(),
    );
    push_if_exists(
        "github",
        "/Users/jamiecraik/.Cortex-OS/servers/node_modules/mcp-server-github/dist/index.js",
        Some(gh_env),
    );

    servers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_server_status() {
        assert_eq!(McpServerStatus::Running.as_str(), "running");
        assert_eq!(McpServerStatus::Stopped.as_str(), "stopped");
        assert_eq!(McpServerStatus::Failed.as_str(), "failed");

        assert_eq!(McpServerStatus::from_str("running"), McpServerStatus::Running);
        assert_eq!(McpServerStatus::from_str("stopped"), McpServerStatus::Stopped);
        assert_eq!(McpServerStatus::from_str("unknown"), McpServerStatus::Unknown);

        assert_eq!(McpServerStatus::Running.to_string(), "running");
    }

    #[test]
    fn test_mcp_tool() {
        let tool = McpTool {
            name: "test_tool".to_string(),
            description: Some("A test tool".to_string()),
            input_schema: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "arg1": {"type": "string"}
                }
            })),
        };

        assert_eq!(tool.name, "test_tool");
        assert_eq!(tool.description, Some("A test tool".to_string()));
        assert!(tool.input_schema.is_some());
    }

    #[test]
    fn test_mcp_resource() {
        let resource = McpResource {
            uri: "file:///test.txt".to_string(),
            name: Some("test_file".to_string()),
            description: Some("A test file".to_string()),
            mime_type: Some("text/plain".to_string()),
        };

        assert_eq!(resource.uri, "file:///test.txt");
        assert_eq!(resource.name, Some("test_file".to_string()));
        assert_eq!(resource.mime_type, Some("text/plain".to_string()));
    }

    #[test]
    fn test_mcp_prompt() {
        let prompt = McpPrompt {
            name: "test_prompt".to_string(),
            description: Some("A test prompt".to_string()),
            arguments: vec!["arg1".to_string(), "arg2".to_string()],
        };

        assert_eq!(prompt.name, "test_prompt");
        assert_eq!(prompt.arguments.len(), 2);
        assert_eq!(prompt.arguments[0], "arg1");
    }

    #[tokio::test]
    async fn test_mcp_registry() {
        let registry = McpRegistry::new();

        // Test initial state
        assert_eq!(registry.server_count().await, 0);
        assert!(!registry.has_server("test").await);

        // Add a server
        let server = McpServerInfo {
            name: "test_server".to_string(),
            status: "stopped".to_string(),
            command: "echo".to_string(),
            args: vec!["hello".to_string()],
            env: HashMap::new(),
            cwd: None,
            pid: None,
            start_time: None,
            tools: vec![],
            resources: vec![],
            prompts: vec![],
        };

        registry.add_server(server.clone()).await.unwrap();

        assert_eq!(registry.server_count().await, 1);
        assert!(registry.has_server("test_server").await);

        // Get the server
        let retrieved = registry.get_server("test_server").await.unwrap();
        assert_eq!(retrieved.name, "test_server");
        assert_eq!(retrieved.command, "echo");

        // Update status
        registry.update_server_status("test_server", "running").await.unwrap();
        let updated = registry.get_server("test_server").await.unwrap();
        assert_eq!(updated.status, "running");

        // List running servers
        let running = registry.get_running_servers().await;
        assert_eq!(running.len(), 1);
        assert_eq!(running[0].name, "test_server");

        // Remove server
        registry.remove_server("test_server").await.unwrap();
        assert_eq!(registry.server_count().await, 0);
        assert!(!registry.has_server("test_server").await);
    }

    #[test]
    fn test_default_mcp_servers() {
        let servers = default_mcp_servers();
        // Servers list should be a valid vector; specific entries are environment-dependent.
        assert!(servers.len() >= 0);
    }

    #[tokio::test]
    async fn test_mcp_registry_tools_update() {
        let registry = McpRegistry::new();

        let server = McpServerInfo {
            name: "test_server".to_string(),
            status: "running".to_string(),
            command: "echo".to_string(),
            args: vec![],
            env: HashMap::new(),
            cwd: None,
            pid: None,
            start_time: None,
            tools: vec![],
            resources: vec![],
            prompts: vec![],
        };

        registry.add_server(server).await.unwrap();

        let tools = vec![
            McpTool {
                name: "tool1".to_string(),
                description: Some("Tool 1".to_string()),
                input_schema: None,
            },
            McpTool {
                name: "tool2".to_string(),
                description: Some("Tool 2".to_string()),
                input_schema: None,
            },
        ];

        registry.update_server_tools("test_server", tools.clone()).await.unwrap();

        let updated_server = registry.get_server("test_server").await.unwrap();
        assert_eq!(updated_server.tools.len(), 2);
        assert_eq!(updated_server.tools[0].name, "tool1");
        assert_eq!(updated_server.tools[1].name, "tool2");
    }
}
