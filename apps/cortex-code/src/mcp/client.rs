use crate::error::{ProviderError, Result};
use crate::mcp::{McpServerInfo, McpTool, McpResource, McpPrompt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Stdio;
use tokio::io::BufReader;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpRequest {
    jsonrpc: String,
    id: u64,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpResponse {
    jsonrpc: String,
    id: u64,
    result: Option<Value>,
    error: Option<McpError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpError {
    code: i32,
    message: String,
    data: Option<Value>,
}

#[derive(Debug)]
pub struct McpClient {
    server_info: McpServerInfo,
    process: Arc<Mutex<Option<Child>>>,
    request_id: Arc<Mutex<u64>>,
    tools: Vec<McpTool>,
    resources: Vec<McpResource>,
    prompts: Vec<McpPrompt>,
}

impl McpClient {
    pub fn new(server_info: McpServerInfo) -> Self {
        Self {
            server_info,
            process: Arc::new(Mutex::new(None)),
            request_id: Arc::new(Mutex::new(0)),
            tools: Vec::new(),
            resources: Vec::new(),
            prompts: Vec::new(),
        }
    }

    pub async fn start(&mut self) -> Result<()> {
        let mut process_lock = self.process.lock().await;

        if process_lock.is_some() {
            return Ok(()); // Already running
        }

        let mut cmd = Command::new(&self.server_info.command);
        cmd.args(&self.server_info.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .envs(&self.server_info.env);

        if let Some(working_dir) = &self.server_info.working_dir {
            cmd.current_dir(working_dir);
        }

        let child = cmd.spawn()
            .map_err(|e| ProviderError::Api(format!("Failed to start MCP server: {}", e)))?;

        *process_lock = Some(child);

        // Initialize the MCP protocol
        self.initialize().await?;

        Ok(())
    }

    pub async fn stop(&mut self) -> Result<()> {
        let mut process_lock = self.process.lock().await;

        if let Some(mut child) = process_lock.take() {
            // Send graceful shutdown
            let _ = child.kill().await;
            let _ = child.wait().await;
        }

        Ok(())
    }

    pub async fn is_running(&self) -> bool {
        let process_lock = self.process.lock().await;
        process_lock.is_some()
    }

    pub async fn list_tools(&self) -> Result<Vec<McpTool>> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let response = self.send_request("tools/list", None).await?;

        let tools: Vec<McpTool> = serde_json::from_value(
            response.result.unwrap_or(Value::Array(vec![]))
        ).map_err(|e| ProviderError::Api(format!("Failed to parse tools: {}", e)))?;

        Ok(tools)
    }

    pub async fn call_tool(&self, name: &str, arguments: Value) -> Result<Value> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let params = serde_json::json!({
            "name": name,
            "arguments": arguments
        });

        let response = self.send_request("tools/call", Some(params)).await?;

        response.result
            .ok_or_else(|| ProviderError::Api("No result from tool call".to_string()).into())
    }

    pub async fn list_resources(&self) -> Result<Vec<McpResource>> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let response = self.send_request("resources/list", None).await?;

        let resources: Vec<McpResource> = serde_json::from_value(
            response.result.unwrap_or(Value::Array(vec![]))
        ).map_err(|e| ProviderError::Api(format!("Failed to parse resources: {}", e)))?;

        Ok(resources)
    }

    pub async fn read_resource(&self, uri: &str) -> Result<Value> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let params = serde_json::json!({
            "uri": uri
        });

        let response = self.send_request("resources/read", Some(params)).await?;

        response.result
            .ok_or_else(|| ProviderError::Api("No result from resource read".to_string()).into())
    }

    pub async fn list_prompts(&self) -> Result<Vec<McpPrompt>> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let response = self.send_request("prompts/list", None).await?;

        let prompts: Vec<McpPrompt> = serde_json::from_value(
            response.result.unwrap_or(Value::Array(vec![]))
        ).map_err(|e| ProviderError::Api(format!("Failed to parse prompts: {}", e)))?;

        Ok(prompts)
    }

    pub async fn get_prompt(&self, name: &str, arguments: Value) -> Result<Value> {
        if !self.is_running().await {
            return Err(ProviderError::Api("MCP server not running".to_string()).into());
        }

        let params = serde_json::json!({
            "name": name,
            "arguments": arguments
        });

        let response = self.send_request("prompts/get", Some(params)).await?;

        response.result
            .ok_or_else(|| ProviderError::Api("No result from prompt get".to_string()).into())
    }

    async fn initialize(&self) -> Result<()> {
        let params = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "roots": {
                    "listChanged": true
                },
                "sampling": {}
            },
            "clientInfo": {
                "name": "cortex-code",
                "version": "2.0.0"
            }
        });

        let _response = self.send_request("initialize", Some(params)).await?;

        // Send initialized notification
        self.send_notification("notifications/initialized", None).await?;

        Ok(())
    }

    async fn send_request(&self, method: &str, params: Option<Value>) -> Result<McpResponse> {
        let mut id_lock = self.request_id.lock().await;
        *id_lock += 1;
        let id = *id_lock;
        drop(id_lock);

        let request = McpRequest {
            jsonrpc: "2.0".to_string(),
            id,
            method: method.to_string(),
            params,
        };

        let request_json = serde_json::to_string(&request)
            .map_err(|e| ProviderError::Api(format!("Failed to serialize request: {}", e)))?;

        // Send request (simplified - in production would use proper JSON-RPC over stdio)
        let process_lock = self.process.lock().await;
        if let Some(child) = process_lock.as_ref() {
            if let Some(stdin) = child.stdin.as_ref() {
                // Note: This is a simplified implementation
                // In production, would need proper async read/write handling
                return Err(ProviderError::Api("MCP communication not yet fully implemented".to_string()).into());
            }
        }

        // Placeholder response for now
        Ok(McpResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(Value::Array(vec![])),
            error: None,
        })
    }

    async fn send_notification(&self, method: &str, params: Option<Value>) -> Result<()> {
        // Notifications don't have IDs and don't expect responses
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        let _notification_json = serde_json::to_string(&notification)
            .map_err(|e| ProviderError::Api(format!("Failed to serialize notification: {}", e)))?;

        // Send notification (simplified)
        Ok(())
    }

    pub fn server_info(&self) -> &McpServerInfo {
        &self.server_info
    }

    pub fn tools(&self) -> &[McpTool] {
        &self.tools
    }

    pub fn resources(&self) -> &[McpResource] {
        &self.resources
    }

    pub fn prompts(&self) -> &[McpPrompt] {
        &self.prompts
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        // Note: Can't make Drop async, so this is best effort cleanup
        // In production, should use proper async cleanup
    }
}
