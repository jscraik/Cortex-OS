use crate::error::{ProviderError, Result};
use crate::mcp::McpRegistry;
use crate::mcp::McpTool;
use crate::mcp::server::McpServerInfo;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::process::Command;
use tokio::sync::RwLock;
use tracing::{debug, info};

/// Production-ready MCP service that bridges to the TypeScript MCP core
#[derive(Debug)]
pub struct McpService {
    registry: Arc<RwLock<McpRegistry>>,
    node_mcp_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolExecution {
    pub server_name: String,
    pub tool_name: String,
    pub arguments: Value,
    pub result: Option<Value>,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerStats {
    pub name: String,
    pub status: String,
    pub tools_count: usize,
    pub resources_count: usize,
    pub uptime_seconds: u64,
    pub total_executions: u64,
    pub failed_executions: u64,
}

impl McpService {
    pub async fn new() -> Result<Self> {
        // Find the Node.js MCP core package
        let node_mcp_path = Self::find_mcp_core_path()?;

        let registry = McpRegistry::new();

        let service = Self {
            registry: Arc::new(RwLock::new(registry)),
            node_mcp_path,
        };

        // Initialize with default servers
        service.initialize_default_servers().await?;

        Ok(service)
    }

    fn find_mcp_core_path() -> Result<String> {
        // Priority:
        // 1) CORTEX_MCP_CORE_PATH env var
        // 2) Workspace-relative path: ./packages/mcp-core
        if let Ok(env_path) = std::env::var("CORTEX_MCP_CORE_PATH") {
            let package_json = format!("{}/package.json", env_path);
            if std::path::Path::new(&package_json).exists() {
                return Ok(env_path);
            }
        }

        let workspace_path = "./packages/mcp-core";
        let package_json = format!("{}/package.json", workspace_path);
        if std::path::Path::new(&package_json).exists() {
            return Ok(workspace_path.to_string());
        }

        Err(ProviderError::Api("MCP core package not found. Set CORTEX_MCP_CORE_PATH or ensure packages/mcp-core exists.".to_string()).into())
    }

    async fn initialize_default_servers(&self) -> Result<()> {
    let registry = self.registry.write().await;
        registry.initialize_default_servers().await?;

        info!("Initialized {} default MCP servers", registry.list_servers().await.len());
        Ok(())
    }

    pub async fn add_server(&self, name: &str, config: McpServerConfig) -> Result<()> {
        let server_info = McpServerInfo::new(name, &config.command)
            .with_description(config.description.unwrap_or_default())
            .with_args(config.args.unwrap_or_default())
            .with_env(config.env.unwrap_or_default());

    let registry = self.registry.write().await;
        registry.register_server(server_info).await?;

        info!("Added MCP server: {}", name);
        Ok(())
    }

    pub async fn remove_server(&self, name: &str) -> Result<()> {
    let registry = self.registry.write().await;
        registry.unregister_server(name).await?;

        info!("Removed MCP server: {}", name);
        Ok(())
    }

    pub async fn list_servers(&self) -> Result<Vec<McpServerStats>> {
        let registry = self.registry.read().await;
        let servers = registry.list_servers().await;
        let stats = registry.get_server_stats().await;

        let mut result = Vec::new();
        for server in servers {
            if let Some(server_stats) = stats.get(&server.id) {
                result.push(McpServerStats {
                    name: server.name,
                    status: server_stats.status.to_string(),
                    tools_count: server_stats.tools_count,
                    resources_count: 0, // Will be populated when resource tracking is implemented
                    uptime_seconds: 0,  // Will be populated when uptime tracking is implemented
                    total_executions: 0, // Will be populated when execution tracking is implemented
                    failed_executions: 0, // Will be populated when error tracking is implemented
                });
            }
        }

        Ok(result)
    }

    pub async fn get_server_tools(&self, server_name: &str) -> Result<Vec<McpTool>> {
        let registry = self.registry.read().await;

        if let Some(client) = registry.get_client(server_name).await {
            Ok(client.tools().to_vec())
        } else {
            // Try to start the server and get tools
            drop(registry);
            self.start_server(server_name).await?;

            let registry = self.registry.read().await;
            if let Some(client) = registry.get_client(server_name).await {
                Ok(client.tools().to_vec())
            } else {
                Err(ProviderError::Api(format!("Server {} not found or failed to start", server_name)).into())
            }
        }
    }

    pub async fn execute_tool(&self, server_name: &str, tool_name: &str, arguments: Value) -> Result<McpToolExecution> {
        let start_time = std::time::Instant::now();

        // Get or start the server
        let registry = self.registry.read().await;
        let _client = if let Some(client) = registry.get_client(server_name).await {
            client
        } else {
            drop(registry);
            self.start_server(server_name).await?;
            let registry = self.registry.read().await;
            registry.get_client(server_name).await
                .ok_or_else(|| ProviderError::Api(format!("Failed to start server {}", server_name)))?
        };

        // Execute the tool via Node.js MCP core
        let result = self.execute_tool_via_node(server_name, tool_name, &arguments).await;

        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        let execution = match result {
            Ok(result) => McpToolExecution {
                server_name: server_name.to_string(),
                tool_name: tool_name.to_string(),
                arguments,
                result: Some(result),
                error: None,
                execution_time_ms,
            },
            Err(e) => McpToolExecution {
                server_name: server_name.to_string(),
                tool_name: tool_name.to_string(),
                arguments,
                result: None,
                error: Some(e.to_string()),
                execution_time_ms,
            },
        };

        debug!("MCP tool execution: {:?}", execution);
        Ok(execution)
    }

    async fn execute_tool_via_node(&self, server_name: &str, tool_name: &str, arguments: &Value) -> Result<Value> {
        // Create a bridge script to execute MCP tools via the TypeScript implementation
                let script = format!(r#"
(async () => {{
    try {{
        // Dynamically import ESM modules from the MCP core package
        const clientMod = await import('{}/dist/client.js');
        const {{ createEnhancedClient }} = clientMod;

        // TODO: Load actual server configuration from registry when available
        const serverInfo = {{
            name: '{}',
            transport: 'stdio',
            command: 'cortex-mcp-fs', // Placeholder; should come from server config
            args: []
        }};

        const client = await createEnhancedClient(serverInfo);
        const result = await client.callTool({{
            name: '{}',
            arguments: {}
        }});

        console.log(JSON.stringify(result));
        await client.close();
    }} catch (error) {{
        console.error(JSON.stringify({{ error: error?.message ?? String(error) }}));
        process.exit(1);
    }}
}})();
"#, self.node_mcp_path, server_name, tool_name, arguments);

        // Execute the Node.js script
        let output = Command::new("node")
            .arg("-e")
            .arg(&script)
            .output()
            .await
            .map_err(|e| ProviderError::Api(format!("Failed to execute Node.js MCP bridge: {}", e)))?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(ProviderError::Api(format!("MCP tool execution failed: {}", error_msg)).into());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&stdout)
            .map_err(|e| ProviderError::Api(format!("Failed to parse MCP response: {}", e)).into())
    }

    pub async fn start_server(&self, server_name: &str) -> Result<()> {
        let registry = self.registry.read().await;
        registry.start_server(server_name).await?;

        info!("Started MCP server: {}", server_name);
        Ok(())
    }

    pub async fn stop_server(&self, server_name: &str) -> Result<()> {
        let registry = self.registry.read().await;
        registry.stop_server(server_name).await?;

        info!("Stopped MCP server: {}", server_name);
        Ok(())
    }

    pub async fn health_check(&self) -> Result<HashMap<String, bool>> {
        let registry = self.registry.read().await;
        Ok(registry.health_check().await)
    }

    pub async fn get_server_info(&self, server_name: &str) -> Result<Option<McpServerInfo>> {
        let registry = self.registry.read().await;
        Ok(registry.get_server(server_name).await)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub command: String,
    pub description: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub working_dir: Option<String>,
}
