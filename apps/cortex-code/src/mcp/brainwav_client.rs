use crate::enhanced_config::McpServerConfig;
use crate::Result;
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::time::Duration;
use tracing::{debug, error, info, warn};

/// Specialized client for connecting to Brainwav MCP server
pub struct BrainwavMcpClient {
    config: McpServerConfig,
    base_url: String,
    client: reqwest::Client,
    connected: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpRequest {
    pub jsonrpc: String,
    pub id: String,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpResponse {
    pub jsonrpc: String,
    pub id: String,
    pub result: Option<Value>,
    pub error: Option<McpError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpError {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

impl BrainwavMcpClient {
    pub fn new(config: McpServerConfig) -> Result<Self> {
        let base_url = config.remote_url.clone()
            .unwrap_or_else(|| "http://localhost:3000".to_string());

        let timeout = config.timeout.unwrap_or(30);
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(timeout))
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            config,
            base_url,
            client,
            connected: false,
        })
    }

    /// Connect to the MCP server and verify it's accessible
    pub async fn connect(&mut self) -> Result<()> {
        info!("Connecting to Brainwav MCP server at {}", self.base_url);

        // Check if the MCP package directory exists
        if let Some(ref package_path) = self.config.package_path {
            if !package_path.exists() {
                warn!("MCP package directory does not exist: {:?}", package_path);
            } else {
                info!("Found MCP package directory: {:?}", package_path);
            }
        }

        // Test connection with a simple ping or initialize request
        match self.send_request("initialize", Some(serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "roots": {
                    "listChanged": true
                },
                "sampling": {}
            },
            "clientInfo": {
                "name": "cortex-code",
                "version": env!("CARGO_PKG_VERSION")
            }
        }))).await {
            Ok(_) => {
                self.connected = true;
                info!("Successfully connected to Brainwav MCP server");
                Ok(())
            }
            Err(e) => {
                error!("Failed to connect to MCP server: {}", e);
                // Try to start local MCP server if it's not running
                self.try_start_local_server().await?;
                Err(e)
            }
        }
    }

    /// Try to start the local MCP server from the package directory
    async fn try_start_local_server(&self) -> Result<()> {
        if let Some(ref package_path) = self.config.package_path {
            info!("Attempting to start local MCP server from {:?}", package_path);

            // Look for common MCP server files
            let possible_commands = vec![
                ("npm", vec!["start"]),
                ("node", vec!["server.js"]),
                ("node", vec!["index.js"]),
                ("python", vec!["server.py"]),
                ("python3", vec!["server.py"]),
            ];

            for (cmd, args) in possible_commands {
                let mut command = tokio::process::Command::new(cmd);
                command.current_dir(package_path);
                for arg in &args {
                    command.arg(arg);
                }

                match command.spawn() {
                    Ok(mut child) => {
                        info!("Started MCP server with command: {} {:?}", cmd, args);

                        // Give the server a moment to start
                        tokio::time::sleep(Duration::from_secs(3)).await;

                        // Check if it's still running
                        if let Ok(Some(status)) = child.try_wait() {
                            warn!("MCP server exited with status: {:?}", status);
                        } else {
                            info!("MCP server appears to be running");
                            return Ok(());
                        }
                    }
                    Err(e) => {
                        debug!("Failed to start with {}: {}", cmd, e);
                    }
                }
            }
        }

    Err(anyhow!("Could not start local MCP server").into())
    }

    /// Send a request to the MCP server
    pub async fn send_request(&self, method: &str, params: Option<Value>) -> Result<Value> {
        let request = McpRequest {
            jsonrpc: "2.0".to_string(),
            id: uuid::Uuid::new_v4().to_string(),
            method: method.to_string(),
            params,
        };

        debug!("Sending MCP request: {}", method);

        let response = self.client
            .post(&format!("{}/mcp", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!("HTTP error: {}", response.status()).into());
        }

        let mcp_response: McpResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse JSON response: {}", e))?;

        if let Some(error) = mcp_response.error {
            return Err(anyhow!("MCP error {}: {}", error.code, error.message).into());
        }

        Ok(mcp_response.result.unwrap_or(Value::Null))
    }

    /// List available tools from the MCP server
    pub async fn list_tools(&self) -> Result<Vec<McpTool>> {
        let result = self.send_request("tools/list", None).await?;

        if let Some(tools) = result.get("tools") {
            let tools: Vec<McpTool> = serde_json::from_value(tools.clone())
                .map_err(|e| anyhow!("Failed to parse tools: {}", e))?;
            Ok(tools)
        } else {
            Ok(vec![])
        }
    }

    /// Call a tool on the MCP server
    pub async fn call_tool(&self, name: &str, arguments: Value) -> Result<Value> {
        let params = serde_json::json!({
            "name": name,
            "arguments": arguments
        });

        self.send_request("tools/call", Some(params)).await
    }

    /// List available resources from the MCP server
    pub async fn list_resources(&self) -> Result<Vec<McpResource>> {
        let result = self.send_request("resources/list", None).await?;

        if let Some(resources) = result.get("resources") {
            let resources: Vec<McpResource> = serde_json::from_value(resources.clone())
                .map_err(|e| anyhow!("Failed to parse resources: {}", e))?;
            Ok(resources)
        } else {
            Ok(vec![])
        }
    }

    /// Read a resource from the MCP server
    pub async fn read_resource(&self, uri: &str) -> Result<Value> {
        let params = serde_json::json!({
            "uri": uri
        });

        self.send_request("resources/read", Some(params)).await
    }

    /// Get server capabilities
    pub async fn get_capabilities(&self) -> Result<Value> {
        self.send_request("capabilities", None).await
    }

    /// Check if connected to the server
    pub fn is_connected(&self) -> bool {
        self.connected
    }

    /// Get server info
    pub async fn get_server_info(&self) -> Result<HashMap<String, Value>> {
        let mut info = HashMap::new();

        info.insert("url".to_string(), Value::String(self.base_url.clone()));
        info.insert("connected".to_string(), Value::Bool(self.connected));

        if let Some(ref package_path) = self.config.package_path {
            info.insert("package_path".to_string(),
                       Value::String(package_path.to_string_lossy().to_string()));
        }

        // Try to get capabilities if connected
        if self.connected {
            if let Ok(capabilities) = self.get_capabilities().await {
                info.insert("capabilities".to_string(), capabilities);
            }
        }

        Ok(info)
    }

    /// Get the package path if configured
    pub fn get_package_path(&self) -> Option<&PathBuf> {
        self.config.package_path.as_ref()
    }
}

impl Drop for BrainwavMcpClient {
    fn drop(&mut self) {
        if self.connected {
            debug!("Disconnecting from Brainwav MCP server");
        }
    }
}
