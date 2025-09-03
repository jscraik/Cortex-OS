use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Stdio;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use uuid::Uuid;

use super::transport::{McpMessage, McpRequest, McpResponse, McpError};
use super::server::{McpTool, McpResource, McpPrompt};

/// MCP client for communicating with individual MCP servers
#[derive(Debug)]
pub struct McpClient {
    /// Server name
    server_name: String,
    /// Child process
    process: Option<Child>,
    /// Request sender
    request_tx: mpsc::UnboundedSender<McpRequest>,
    /// Response receiver
    response_rx: mpsc::UnboundedReceiver<McpResponse>,
    /// Client configuration
    config: McpClientConfig,
}

/// Client configuration
#[derive(Debug, Clone)]
pub struct McpClientConfig {
    /// Request timeout
    pub timeout: Duration,
    /// Maximum message size
    pub max_message_size: usize,
    /// Enable debug logging
    pub debug: bool,
    /// Buffer size for communication
    pub buffer_size: usize,
}

impl Default for McpClientConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            max_message_size: 1024 * 1024, // 1MB
            debug: false,
            buffer_size: 8192,
        }
    }
}

/// Request tracking
#[derive(Debug)]
struct PendingRequest {
    /// Request ID
    id: String,
    /// Response sender
    response_tx: tokio::sync::oneshot::Sender<Result<Value>>,
}

impl McpClient {
    /// Create a new MCP client
    pub async fn new(server_name: &str, command: &str, args: &[String]) -> Result<Self> {
        let config = McpClientConfig::default();
        Self::new_with_config(server_name, command, args, config).await
    }

    /// Create a new MCP client with configuration
    pub async fn new_with_config(
        server_name: &str,
        command: &str,
        args: &[String],
        config: McpClientConfig,
    ) -> Result<Self> {
        // Start the MCP server process
        let mut process = Command::new(command)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to start MCP server process: {}", e))?;

        // Create communication channels
        let (request_tx, mut request_rx) = mpsc::unbounded_channel::<McpRequest>();
        let (response_tx, response_rx) = mpsc::unbounded_channel::<McpResponse>();

        // Get stdin and stdout handles
        let stdin = process.stdin.take().ok_or_else(|| {
            anyhow::anyhow!("Failed to get stdin handle for MCP server")
        })?;

        let stdout = process.stdout.take().ok_or_else(|| {
            anyhow::anyhow!("Failed to get stdout handle for MCP server")
        })?;

        // Start communication task
        let server_name_clone = server_name.to_string();
        let config_clone = config.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::communication_task(
                server_name_clone,
                stdin,
                stdout,
                request_rx,
                response_tx,
                config_clone,
            ).await {
                tracing::error!("MCP client communication error: {}", e);
            }
        });

        Ok(Self {
            server_name: server_name.to_string(),
            process: Some(process),
            request_tx,
            response_rx,
            config,
        })
    }

    /// Communication task
    async fn communication_task(
        server_name: String,
        mut stdin: tokio::process::ChildStdin,
        stdout: tokio::process::ChildStdout,
        mut request_rx: mpsc::UnboundedReceiver<McpRequest>,
        response_tx: mpsc::UnboundedSender<McpResponse>,
        config: McpClientConfig,
    ) -> Result<()> {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        let mut pending_requests: std::collections::HashMap<String, PendingRequest> =
            std::collections::HashMap::new();

        loop {
            tokio::select! {
                // Handle incoming requests
                request = request_rx.recv() => {
                    match request {
                        Some(req) => {
                            let message = McpMessage::Request(req.clone());
                            let json = serde_json::to_string(&message)?;

                            if config.debug {
                                tracing::debug!("Sending to {}: {}", server_name, json);
                            }

                            stdin.write_all(json.as_bytes()).await?;
                            stdin.write_all(b"\n").await?;
                            stdin.flush().await?;

                            // Track the request
                            if let Some(response_tx) = req.response_tx {
                                pending_requests.insert(req.id.clone(), PendingRequest {
                                    id: req.id,
                                    response_tx,
                                });
                            }
                        }
                        None => break,
                    }
                }

                // Handle incoming responses
                result = reader.read_line(&mut line) => {
                    match result {
                        Ok(0) => break, // EOF
                        Ok(_) => {
                            let trimmed = line.trim();
                            if !trimmed.is_empty() {
                                if config.debug {
                                    tracing::debug!("Received from {}: {}", server_name, trimmed);
                                }

                                if let Ok(message) = serde_json::from_str::<McpMessage>(trimmed) {
                                    match message {
                                        McpMessage::Response(response) => {
                                            // Send to response channel
                                            if let Err(e) = response_tx.send(response.clone()) {
                                                tracing::error!("Failed to send response: {}", e);
                                            }

                                            // Handle pending request
                                            if let Some(pending) = pending_requests.remove(&response.id) {
                                                let result = match response.error {
                                                    Some(error) => Err(anyhow::anyhow!("MCP error: {}", error.message)),
                                                    None => Ok(response.result.unwrap_or(Value::Null)),
                                                };

                                                if let Err(_) = pending.response_tx.send(result) {
                                                    tracing::warn!("Failed to send response to pending request");
                                                }
                                            }
                                        }
                                        McpMessage::Request(_) => {
                                            // Handle incoming requests from server (notifications, etc.)
                                            tracing::debug!("Received request from server: {}", trimmed);
                                        }
                                    }
                                }
                            }
                            line.clear();
                        }
                        Err(e) => {
                            tracing::error!("Error reading from MCP server: {}", e);
                            break;
                        }
                    }
                }
            }
        }

        // Clean up pending requests
        for (_, pending) in pending_requests {
            let _ = pending.response_tx.send(Err(anyhow::anyhow!("Client shut down")));
        }

        Ok(())
    }

    /// Send a request and wait for response
    async fn send_request(&self, method: &str, params: Option<Value>) -> Result<Value> {
        let id = Uuid::new_v4().to_string();
        let (response_tx, response_rx) = tokio::sync::oneshot::channel();

        let request = McpRequest {
            id,
            method: method.to_string(),
            params,
            response_tx: Some(response_tx),
        };

        self.request_tx.send(request)
            .map_err(|e| anyhow::anyhow!("Failed to send request: {}", e))?;

        // Wait for response with timeout
        tokio::time::timeout(self.config.timeout, response_rx)
            .await
            .map_err(|_| anyhow::anyhow!("Request timeout"))?
            .map_err(|e| anyhow::anyhow!("Failed to receive response: {}", e))?
    }

    /// Initialize connection
    pub async fn initialize(&self) -> Result<Value> {
        let params = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {}
            },
            "clientInfo": {
                "name": "cortex-code",
                "version": "1.0.0"
            }
        });

        self.send_request("initialize", Some(params)).await
    }

    /// List available tools
    pub async fn list_tools(&self) -> Result<Vec<McpTool>> {
        let response = self.send_request("tools/list", None).await?;

        let tools = response
            .get("tools")
            .and_then(|t| t.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid tools response"))?;

        let mut result = Vec::new();
        for tool in tools {
            let name = tool.get("name")
                .and_then(|n| n.as_str())
                .ok_or_else(|| anyhow::anyhow!("Tool missing name"))?;

            let description = tool.get("description")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());

            let input_schema = tool.get("inputSchema").cloned();

            result.push(McpTool {
                name: name.to_string(),
                description,
                input_schema,
            });
        }

        Ok(result)
    }

    /// List available resources
    pub async fn list_resources(&self) -> Result<Vec<McpResource>> {
        let response = self.send_request("resources/list", None).await?;

        let resources = response
            .get("resources")
            .and_then(|r| r.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid resources response"))?;

        let mut result = Vec::new();
        for resource in resources {
            let uri = resource.get("uri")
                .and_then(|u| u.as_str())
                .ok_or_else(|| anyhow::anyhow!("Resource missing uri"))?;

            let name = resource.get("name")
                .and_then(|n| n.as_str())
                .map(|s| s.to_string());

            let description = resource.get("description")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());

            let mime_type = resource.get("mimeType")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string());

            result.push(McpResource {
                uri: uri.to_string(),
                name,
                description,
                mime_type,
            });
        }

        Ok(result)
    }

    /// List available prompts
    pub async fn list_prompts(&self) -> Result<Vec<McpPrompt>> {
        let response = self.send_request("prompts/list", None).await?;

        let prompts = response
            .get("prompts")
            .and_then(|p| p.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid prompts response"))?;

        let mut result = Vec::new();
        for prompt in prompts {
            let name = prompt.get("name")
                .and_then(|n| n.as_str())
                .ok_or_else(|| anyhow::anyhow!("Prompt missing name"))?;

            let description = prompt.get("description")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());

            let arguments = prompt.get("arguments")
                .and_then(|a| a.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();

            result.push(McpPrompt {
                name: name.to_string(),
                description,
                arguments,
            });
        }

        Ok(result)
    }

    /// Call a tool
    pub async fn call_tool(&self, name: &str, arguments: Value) -> Result<Value> {
        let params = serde_json::json!({
            "name": name,
            "arguments": arguments
        });

        let response = self.send_request("tools/call", Some(params)).await?;

        response.get("content")
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("Tool call response missing content"))
    }

    /// Read a resource
    pub async fn read_resource(&self, uri: &str) -> Result<Value> {
        let params = serde_json::json!({
            "uri": uri
        });

        self.send_request("resources/read", Some(params)).await
    }

    /// Get a prompt
    pub async fn get_prompt(&self, name: &str, arguments: Option<Value>) -> Result<Value> {
        let mut params = serde_json::json!({
            "name": name
        });

        if let Some(args) = arguments {
            params["arguments"] = args;
        }

        self.send_request("prompts/get", Some(params)).await
    }

    /// Stop the client
    pub async fn stop(&mut self) -> Result<()> {
        if let Some(mut process) = self.process.take() {
            process.kill().await?;
            process.wait().await?;
        }

        tracing::info!("Stopped MCP client for server: {}", self.server_name);
        Ok(())
    }

    /// Get server name
    pub fn server_name(&self) -> &str {
        &self.server_name
    }

    /// Check if client is running
    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }

    /// Get configuration
    pub fn config(&self) -> &McpClientConfig {
        &self.config
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        if let Some(mut process) = self.process.take() {
            tokio::spawn(async move {
                if let Err(e) = process.kill().await {
                    tracing::error!("Failed to kill MCP server process: {}", e);
                }
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_client_config_default() {
        let config = McpClientConfig::default();
        assert_eq!(config.timeout, Duration::from_secs(30));
        assert_eq!(config.max_message_size, 1024 * 1024);
        assert!(!config.debug);
        assert_eq!(config.buffer_size, 8192);
    }

    #[test]
    fn test_pending_request() {
        let (tx, _rx) = tokio::sync::oneshot::channel();
        let pending = PendingRequest {
            id: "test-id".to_string(),
            response_tx: tx,
        };

        assert_eq!(pending.id, "test-id");
    }

    #[tokio::test]
    async fn test_mcp_client_creation_failure() {
        // Test with invalid command
        let result = McpClient::new("test", "nonexistent_command", &[]).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_tool_parsing() {
        let tool_json = serde_json::json!({
            "name": "test_tool",
            "description": "A test tool",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "arg1": {"type": "string"}
                }
            }
        });

        let name = tool_json.get("name").and_then(|n| n.as_str()).unwrap();
        assert_eq!(name, "test_tool");

        let description = tool_json.get("description").and_then(|d| d.as_str());
        assert_eq!(description, Some("A test tool"));
    }

    #[test]
    fn test_resource_parsing() {
        let resource_json = serde_json::json!({
            "uri": "file:///test.txt",
            "name": "test_resource",
            "description": "A test resource",
            "mimeType": "text/plain"
        });

        let uri = resource_json.get("uri").and_then(|u| u.as_str()).unwrap();
        assert_eq!(uri, "file:///test.txt");

        let mime_type = resource_json.get("mimeType").and_then(|m| m.as_str());
        assert_eq!(mime_type, Some("text/plain"));
    }

    #[test]
    fn test_prompt_parsing() {
        let prompt_json = serde_json::json!({
            "name": "test_prompt",
            "description": "A test prompt",
            "arguments": ["arg1", "arg2"]
        });

        let name = prompt_json.get("name").and_then(|n| n.as_str()).unwrap();
        assert_eq!(name, "test_prompt");

        let arguments = prompt_json.get("arguments")
            .and_then(|a| a.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<_>>())
            .unwrap_or_default();
        assert_eq!(arguments, vec!["arg1".to_string(), "arg2".to_string()]);
    }
}
