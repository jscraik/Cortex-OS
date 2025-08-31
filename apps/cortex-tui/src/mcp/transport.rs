use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout};
use tokio::sync::{mpsc, oneshot};

#[derive(Debug)]
pub enum McpTransport {
    Stdio(StdioTransport),
    Sse(SseTransport),
}

#[derive(Debug)]
pub struct StdioTransport {
    stdin: Option<ChildStdin>,
    stdout_reader: Option<BufReader<ChildStdout>>,
    request_sender: mpsc::UnboundedSender<TransportRequest>,
    response_receiver: mpsc::UnboundedReceiver<TransportResponse>,
}

#[derive(Debug)]
pub struct SseTransport {
    endpoint: String,
    client: reqwest::Client,
    headers: HashMap<String, String>,
}

#[derive(Debug)]
pub struct TransportRequest {
    pub id: u64,
    pub method: String,
    pub params: Option<serde_json::Value>,
    pub response_sender: oneshot::Sender<TransportResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportResponse {
    pub id: u64,
    pub result: Option<serde_json::Value>,
    pub error: Option<TransportError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportError {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

impl McpTransport {
    pub fn stdio(child: &mut Child) -> Result<Self> {
        let stdin = child.stdin.take();
        let stdout = child.stdout.take();
        
        let stdout_reader = stdout.map(BufReader::new);
        
        let (request_sender, request_receiver) = mpsc::unbounded_channel();
        let (response_sender, response_receiver) = mpsc::unbounded_channel();
        
        let transport = StdioTransport {
            stdin,
            stdout_reader,
            request_sender,
            response_receiver,
        };
        
        // Spawn the I/O handling task
        if let (Some(mut stdin), Some(stdout_reader)) = (transport.stdin.as_ref(), transport.stdout_reader.as_ref()) {
            // Note: This is simplified - would need proper async handling
            tokio::spawn(async move {
                // Handle stdin/stdout communication
                // This would be the main transport loop
            });
        }
        
        Ok(McpTransport::Stdio(transport))
    }
    
    pub fn sse(endpoint: String) -> Self {
        let client = reqwest::Client::new();
        let headers = HashMap::new();
        
        let transport = SseTransport {
            endpoint,
            client,
            headers,
        };
        
        McpTransport::Sse(transport)
    }
    
    pub async fn send_request(&self, id: u64, method: String, params: Option<serde_json::Value>) -> Result<TransportResponse> {
        match self {
            McpTransport::Stdio(stdio) => {
                stdio.send_request(id, method, params).await
            }
            McpTransport::Sse(sse) => {
                sse.send_request(id, method, params).await
            }
        }
    }
    
    pub async fn send_notification(&self, method: String, params: Option<serde_json::Value>) -> Result<()> {
        match self {
            McpTransport::Stdio(stdio) => {
                stdio.send_notification(method, params).await
            }
            McpTransport::Sse(sse) => {
                sse.send_notification(method, params).await
            }
        }
    }
}

impl StdioTransport {
    pub async fn send_request(&self, id: u64, method: String, params: Option<serde_json::Value>) -> Result<TransportResponse> {
        let (response_sender, response_receiver) = oneshot::channel();
        
        let request = TransportRequest {
            id,
            method,
            params,
            response_sender,
        };
        
        self.request_sender.send(request)
            .map_err(|_| crate::error::ProviderError::Api("Transport channel closed".to_string()))?;
        
        response_receiver.await
            .map_err(|_| crate::error::ProviderError::Api("Response channel closed".to_string()).into())
    }
    
    pub async fn send_notification(&self, method: String, params: Option<serde_json::Value>) -> Result<()> {
        // Notifications don't have response channels
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });
        
        // Send notification through stdin (simplified)
        // In production, would need proper async write handling
        
        Ok(())
    }
}

impl SseTransport {
    pub async fn send_request(&self, id: u64, method: String, params: Option<serde_json::Value>) -> Result<TransportResponse> {
        let request_body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });
        
        let mut request_builder = self.client.post(&self.endpoint)
            .json(&request_body);
        
        for (key, value) in &self.headers {
            request_builder = request_builder.header(key, value);
        }
        
        let response = request_builder.send().await
            .map_err(|e| crate::error::ProviderError::Api(format!("HTTP request failed: {}", e)))?;
        
        if !response.status().is_success() {
            return Err(crate::error::ProviderError::Api(
                format!("HTTP error: {}", response.status())
            ).into());
        }
        
        let response_json: serde_json::Value = response.json().await
            .map_err(|e| crate::error::ProviderError::Api(format!("Failed to parse response: {}", e)))?;
        
        let transport_response: TransportResponse = serde_json::from_value(response_json)
            .map_err(|e| crate::error::ProviderError::Api(format!("Invalid response format: {}", e)))?;
        
        Ok(transport_response)
    }
    
    pub async fn send_notification(&self, method: String, params: Option<serde_json::Value>) -> Result<()> {
        let notification_body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });
        
        let mut request_builder = self.client.post(&self.endpoint)
            .json(&notification_body);
        
        for (key, value) in &self.headers {
            request_builder = request_builder.header(key, value);
        }
        
        let response = request_builder.send().await
            .map_err(|e| crate::error::ProviderError::Api(format!("HTTP request failed: {}", e)))?;
        
        if !response.status().is_success() {
            return Err(crate::error::ProviderError::Api(
                format!("HTTP error: {}", response.status())
            ).into());
        }
        
        Ok(())
    }
    
    pub fn with_header(mut self, key: String, value: String) -> Self {
        self.headers.insert(key, value);
        self
    }
    
    pub fn with_headers(mut self, headers: HashMap<String, String>) -> Self {
        self.headers.extend(headers);
        self
    }
}