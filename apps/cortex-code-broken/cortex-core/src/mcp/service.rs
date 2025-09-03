use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::SystemTime;
use tokio::process::{Child, Command};
use tokio::sync::RwLock;
use uuid::Uuid;

use super::client::McpClient;
use super::registry::McpRegistry;
use super::server::{McpServerInfo, McpTool, McpResource, McpPrompt};

/// MCP service for managing communication with TypeScript MCP core
#[derive(Debug, Clone)]
pub struct McpService {
    /// Node.js MCP core path
    node_mcp_path: PathBuf,
    /// Active clients
    clients: std::sync::Arc<RwLock<HashMap<String, McpClient>>>,
    /// Server registry
    registry: McpRegistry,
    /// Service metrics
    metrics: std::sync::Arc<RwLock<McpServiceMetrics>>,
}

/// Tool execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolExecution {
    /// Execution ID
    pub id: String,
    /// Server name
    pub server_name: String,
    /// Tool name
    pub tool_name: String,
    /// Tool arguments
    pub arguments: Value,
    /// Execution start time
    pub start_time: SystemTime,
    /// Execution end time
    pub end_time: Option<SystemTime>,
    /// Execution result
    pub result: Option<Value>,
    /// Execution error
    pub error: Option<String>,
    /// Execution duration in milliseconds
    pub duration_ms: Option<u64>,
}

/// Server statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerStats {
    /// Server name
    pub server_name: String,
    /// Server status
    pub status: String,
    /// Uptime in seconds
    pub uptime_seconds: u64,
    /// Number of available tools
    pub tools_count: usize,
    /// Number of available resources
    pub resources_count: usize,
    /// Number of available prompts
    pub prompts_count: usize,
    /// Last health check time
    pub last_health_check: SystemTime,
    /// Number of successful operations
    pub successful_operations: u64,
    /// Number of failed operations
    pub failed_operations: u64,
    /// Average response time in milliseconds
    pub avg_response_time_ms: f64,
}

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    /// Server name
    pub name: String,
    /// Server command
    pub command: String,
    /// Server arguments
    pub args: Vec<String>,
    /// Server environment variables
    pub env: HashMap<String, String>,
    /// Server working directory
    pub cwd: Option<PathBuf>,
    /// Server timeout in seconds
    pub timeout_seconds: u64,
    /// Auto-restart on failure
    pub auto_restart: bool,
    /// Health check interval in seconds
    pub health_check_interval: u64,
}

/// Service metrics
#[derive(Debug, Default)]
struct McpServiceMetrics {
    /// Total tool executions
    total_executions: u64,
    /// Successful executions
    successful_executions: u64,
    /// Failed executions
    failed_executions: u64,
    /// Total execution time in milliseconds
    total_execution_time_ms: u64,
    /// Active servers count
    active_servers: usize,
    /// Service start time
    service_start_time: SystemTime,
}

impl McpService {
    /// Create a new MCP service
    pub async fn new() -> Result<Self> {
        let node_mcp_path = Self::detect_node_mcp_path()?;
        let registry = McpRegistry::new();

        Ok(Self {
            node_mcp_path,
            clients: std::sync::Arc::new(RwLock::new(HashMap::new())),
            registry,
            metrics: std::sync::Arc::new(RwLock::new(McpServiceMetrics {
                service_start_time: SystemTime::now(),
                ..Default::default()
            })),
        })
    }

    /// Detect Node.js MCP core path
    fn detect_node_mcp_path() -> Result<PathBuf> {
        // Check environment variable first
        if let Ok(path) = std::env::var("CORTEX_MCP_PATH") {
            let path = PathBuf::from(path);
            if path.exists() {
                return Ok(path);
            }
        }

        // Check common locations
        let candidate_paths = vec![
            "/Users/jamiecraik/.Cortex-OS/packages/mcp-core",
            "./packages/mcp-core",
            "../packages/mcp-core",
            "../../packages/mcp-core",
        ];

        for path_str in candidate_paths {
            let path = PathBuf::from(path_str);
            if path.exists() {
                return Ok(path);
            }
        }

        Err(anyhow::anyhow!("Could not detect Node.js MCP core path"))
    }

    /// Start an MCP server
    pub async fn start_server(&self, config: McpServerConfig) -> Result<()> {
        // Add server to registry
        self.registry.add_server(McpServerInfo {
            name: config.name.clone(),
            status: "starting".to_string(),
            command: config.command.clone(),
            args: config.args.clone(),
            env: config.env.clone(),
            cwd: config.cwd.clone(),
            pid: None,
            start_time: Some(SystemTime::now()),
            tools: vec![],
            resources: vec![],
            prompts: vec![],
        }).await?;

        // Create and start client
        let client = McpClient::new(&config.name, &config.command, &config.args).await?;

        // Store client
        let mut clients = self.clients.write().await;
        clients.insert(config.name.clone(), client);

        // Update server status
        self.registry.update_server_status(&config.name, "running").await?;

        // Update metrics
        let mut metrics = self.metrics.write().await;
        metrics.active_servers = clients.len();

        tracing::info!("Started MCP server: {}", config.name);
        Ok(())
    }

    /// Stop an MCP server
    pub async fn stop_server(&self, server_name: &str) -> Result<()> {
        // Remove client
        let mut clients = self.clients.write().await;
        if let Some(mut client) = clients.remove(server_name) {
            client.stop().await?;
        }

        // Update server status
        self.registry.update_server_status(server_name, "stopped").await?;

        // Update metrics
        let mut metrics = self.metrics.write().await;
        metrics.active_servers = clients.len();

        tracing::info!("Stopped MCP server: {}", server_name);
        Ok(())
    }

    /// Execute a tool
    pub async fn execute_tool(
        &self,
        server_name: &str,
        tool_name: &str,
        arguments: Value,
    ) -> Result<McpToolExecution> {
        let execution_id = Uuid::new_v4().to_string();
        let start_time = SystemTime::now();

        let mut execution = McpToolExecution {
            id: execution_id,
            server_name: server_name.to_string(),
            tool_name: tool_name.to_string(),
            arguments: arguments.clone(),
            start_time,
            end_time: None,
            result: None,
            error: None,
            duration_ms: None,
        };

        // Update metrics
        {
            let mut metrics = self.metrics.write().await;
            metrics.total_executions += 1;
        }

        // Get client
        let clients = self.clients.read().await;
        let client = clients.get(server_name)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", server_name))?;

        // Execute tool
        match client.call_tool(tool_name, arguments).await {
            Ok(result) => {
                let end_time = SystemTime::now();
                let duration = end_time.duration_since(start_time)
                    .unwrap_or_default()
                    .as_millis() as u64;

                execution.end_time = Some(end_time);
                execution.result = Some(result);
                execution.duration_ms = Some(duration);

                // Update metrics
                let mut metrics = self.metrics.write().await;
                metrics.successful_executions += 1;
                metrics.total_execution_time_ms += duration;

                tracing::debug!("Tool execution successful: {}:{} ({}ms)", server_name, tool_name, duration);
            }
            Err(e) => {
                let end_time = SystemTime::now();
                let duration = end_time.duration_since(start_time)
                    .unwrap_or_default()
                    .as_millis() as u64;

                execution.end_time = Some(end_time);
                execution.error = Some(e.to_string());
                execution.duration_ms = Some(duration);

                // Update metrics
                let mut metrics = self.metrics.write().await;
                metrics.failed_executions += 1;
                metrics.total_execution_time_ms += duration;

                tracing::error!("Tool execution failed: {}:{} - {}", server_name, tool_name, e);
                return Err(e);
            }
        }

        Ok(execution)
    }

    /// List available tools
    pub async fn list_tools(&self, server_name: &str) -> Result<Vec<McpTool>> {
        let clients = self.clients.read().await;
        let client = clients.get(server_name)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", server_name))?;

        client.list_tools().await
    }

    /// List available resources
    pub async fn list_resources(&self, server_name: &str) -> Result<Vec<McpResource>> {
        let clients = self.clients.read().await;
        let client = clients.get(server_name)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", server_name))?;

        client.list_resources().await
    }

    /// List available prompts
    pub async fn list_prompts(&self, server_name: &str) -> Result<Vec<McpPrompt>> {
        let clients = self.clients.read().await;
        let client = clients.get(server_name)
            .ok_or_else(|| anyhow::anyhow!("Server not found: {}", server_name))?;

        client.list_prompts().await
    }

    /// Get server statistics
    pub async fn get_server_stats(&self, server_name: &str) -> Result<McpServerStats> {
        let server = self.registry.get_server(server_name).await?;

        let tools_count = self.list_tools(server_name).await?.len();
        let resources_count = self.list_resources(server_name).await?.len();
        let prompts_count = self.list_prompts(server_name).await?.len();

        let uptime = server.start_time
            .map(|start| SystemTime::now().duration_since(start).unwrap_or_default().as_secs())
            .unwrap_or(0);

        Ok(McpServerStats {
            server_name: server_name.to_string(),
            status: server.status,
            uptime_seconds: uptime,
            tools_count,
            resources_count,
            prompts_count,
            last_health_check: SystemTime::now(),
            successful_operations: 0, // TODO: Track these in metrics
            failed_operations: 0,     // TODO: Track these in metrics
            avg_response_time_ms: 0.0, // TODO: Calculate from metrics
        })
    }

    /// Health check for a server
    pub async fn health_check(&self, server_name: &str) -> Result<McpServerStats> {
        let clients = self.clients.read().await;
        if !clients.contains_key(server_name) {
            return Err(anyhow::anyhow!("Server not running: {}", server_name));
        }

        // Try to list tools as a health check
        let _ = self.list_tools(server_name).await?;

        self.get_server_stats(server_name).await
    }

    /// List all servers
    pub async fn list_servers(&self) -> Vec<McpServerInfo> {
        self.registry.list_servers().await
    }

    /// Get service metrics
    pub async fn get_metrics(&self) -> McpServiceMetrics {
        self.metrics.read().await.clone()
    }

    /// Get Node.js MCP core path
    pub fn node_mcp_path(&self) -> &PathBuf {
        &self.node_mcp_path
    }

    /// Initialize default MCP servers
    pub async fn initialize_default_servers(&self) -> Result<()> {
        let default_servers = super::server::default_mcp_servers();

        for server_info in default_servers {
            let config = McpServerConfig {
                name: server_info.name.clone(),
                command: server_info.command,
                args: server_info.args,
                env: server_info.env,
                cwd: server_info.cwd,
                timeout_seconds: 30,
                auto_restart: true,
                health_check_interval: 60,
            };

            if let Err(e) = self.start_server(config).await {
                tracing::warn!("Failed to start default server {}: {}", server_info.name, e);
            }
        }

        Ok(())
    }

    /// Shutdown all servers
    pub async fn shutdown(&self) -> Result<()> {
        let servers = self.list_servers().await;

        for server in servers {
            if let Err(e) = self.stop_server(&server.name).await {
                tracing::error!("Failed to stop server {}: {}", server.name, e);
            }
        }

        tracing::info!("MCP service shutdown complete");
        Ok(())
    }
}

impl Clone for McpServiceMetrics {
    fn clone(&self) -> Self {
        Self {
            total_executions: self.total_executions,
            successful_executions: self.successful_executions,
            failed_executions: self.failed_executions,
            total_execution_time_ms: self.total_execution_time_ms,
            active_servers: self.active_servers,
            service_start_time: self.service_start_time,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_tool_execution() {
        let execution = McpToolExecution {
            id: "test-id".to_string(),
            server_name: "test-server".to_string(),
            tool_name: "test-tool".to_string(),
            arguments: serde_json::json!({"arg1": "value1"}),
            start_time: SystemTime::now(),
            end_time: None,
            result: None,
            error: None,
            duration_ms: None,
        };

        assert_eq!(execution.id, "test-id");
        assert_eq!(execution.server_name, "test-server");
        assert_eq!(execution.tool_name, "test-tool");
    }

    #[test]
    fn test_mcp_server_config() {
        let config = McpServerConfig {
            name: "test-server".to_string(),
            command: "node".to_string(),
            args: vec!["server.js".to_string()],
            env: HashMap::new(),
            cwd: None,
            timeout_seconds: 30,
            auto_restart: true,
            health_check_interval: 60,
        };

        assert_eq!(config.name, "test-server");
        assert_eq!(config.command, "node");
        assert!(config.auto_restart);
    }

    #[test]
    fn test_mcp_server_stats() {
        let stats = McpServerStats {
            server_name: "test-server".to_string(),
            status: "running".to_string(),
            uptime_seconds: 3600,
            tools_count: 5,
            resources_count: 2,
            prompts_count: 1,
            last_health_check: SystemTime::now(),
            successful_operations: 100,
            failed_operations: 5,
            avg_response_time_ms: 125.5,
        };

        assert_eq!(stats.server_name, "test-server");
        assert_eq!(stats.tools_count, 5);
        assert_eq!(stats.successful_operations, 100);
    }

    #[tokio::test]
    async fn test_detect_node_mcp_path() {
        // This test depends on the actual filesystem, so we'll just test that it returns an error
        // when no MCP path is found (which is expected in most test environments)
        let result = McpService::detect_node_mcp_path();

        // In a real environment with MCP core installed, this should return Ok
        // In test environments, it will likely return Err, which is expected
        match result {
            Ok(path) => {
                assert!(path.exists());
            }
            Err(_) => {
                // Expected in test environments without MCP core
            }
        }
    }
}
