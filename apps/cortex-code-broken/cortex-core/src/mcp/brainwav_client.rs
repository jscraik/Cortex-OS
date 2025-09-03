use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::client::{McpClient, McpClientConfig};
use super::server::{McpTool, McpResource, McpPrompt};

/// Specialized BrainwAV MCP client
#[derive(Debug)]
pub struct BrainwavMcpClient {
    /// Base MCP client
    client: McpClient,
    /// BrainwAV-specific configuration
    config: BrainwavConfig,
}

/// BrainwAV MCP configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavConfig {
    /// Server URL
    pub server_url: String,
    /// API key
    pub api_key: Option<String>,
    /// Model preference
    pub model: String,
    /// Temperature setting
    pub temperature: f32,
    /// Max tokens
    pub max_tokens: usize,
    /// Enable streaming
    pub streaming: bool,
    /// Custom headers
    pub headers: std::collections::HashMap<String, String>,
}

impl Default for BrainwavConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:3001".to_string(),
            api_key: None,
            model: "gpt-4".to_string(),
            temperature: 0.7,
            max_tokens: 4096,
            streaming: true,
            headers: std::collections::HashMap::new(),
        }
    }
}

/// BrainwAV conversation context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavContext {
    /// Conversation ID
    pub conversation_id: String,
    /// Session ID
    pub session_id: String,
    /// User ID
    pub user_id: Option<String>,
    /// Context metadata
    pub metadata: std::collections::HashMap<String, Value>,
    /// Message history
    pub history: Vec<BrainwavMessage>,
}

/// BrainwAV message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavMessage {
    /// Message ID
    pub id: String,
    /// Message role (user, assistant, system)
    pub role: String,
    /// Message content
    pub content: String,
    /// Message timestamp
    pub timestamp: std::time::SystemTime,
    /// Message metadata
    pub metadata: std::collections::HashMap<String, Value>,
}

/// BrainwAV completion request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavCompletionRequest {
    /// Model to use
    pub model: String,
    /// Messages
    pub messages: Vec<BrainwavMessage>,
    /// Temperature
    pub temperature: Option<f32>,
    /// Max tokens
    pub max_tokens: Option<usize>,
    /// Enable streaming
    pub stream: Option<bool>,
    /// Additional parameters
    pub parameters: std::collections::HashMap<String, Value>,
}

/// BrainwAV completion response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavCompletionResponse {
    /// Response ID
    pub id: String,
    /// Model used
    pub model: String,
    /// Generated text
    pub content: String,
    /// Usage statistics
    pub usage: Option<BrainwavUsage>,
    /// Response metadata
    pub metadata: std::collections::HashMap<String, Value>,
}

/// Usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrainwavUsage {
    /// Prompt tokens
    pub prompt_tokens: usize,
    /// Completion tokens
    pub completion_tokens: usize,
    /// Total tokens
    pub total_tokens: usize,
}

impl BrainwavMcpClient {
    /// Create a new BrainwAV MCP client
    pub async fn new(config: BrainwavConfig) -> Result<Self> {
        let command = "node";
        // Allow override via env to avoid hardcoded paths and adapt to repo layout changes.
        let server_path = std::env::var("BRAINWAV_MCP_SERVER_PATH")
            .unwrap_or_else(|_| "/Users/jamiecraik/.Cortex-OS/servers/src/everything/dist/index.js".to_string());
        let args = vec![server_path];

        let client_config = McpClientConfig {
            timeout: std::time::Duration::from_secs(60), // Longer timeout for AI operations
            max_message_size: 2 * 1024 * 1024, // 2MB for larger responses
            debug: false,
            buffer_size: 16384, // Larger buffer for streaming
        };

        let client = McpClient::new_with_config("brainwav", command, &args, client_config).await?;

        Ok(Self { client, config })
    }

    /// Create with default configuration
    pub async fn default() -> Result<Self> {
        Self::new(BrainwavConfig::default()).await
    }

    /// Initialize the BrainwAV client
    pub async fn initialize(&self) -> Result<()> {
        // Initialize the base MCP client
        self.client.initialize().await?;

        // Configure BrainwAV-specific settings
        let config_params = serde_json::json!({
            "server_url": self.config.server_url,
            "model": self.config.model,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "streaming": self.config.streaming
        });

        self.client.call_tool("configure", config_params).await?;

        tracing::info!("BrainwAV MCP client initialized");
        Ok(())
    }

    /// Create a new conversation
    pub async fn create_conversation(&self, user_id: Option<String>) -> Result<BrainwavContext> {
        let params = serde_json::json!({
            "user_id": user_id
        });

        let response = self.client.call_tool("create_conversation", params).await?;

        let conversation_id = response
            .get("conversation_id")
            .and_then(|id| id.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing conversation_id in response"))?;

        let session_id = response
            .get("session_id")
            .and_then(|id| id.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing session_id in response"))?;

        Ok(BrainwavContext {
            conversation_id: conversation_id.to_string(),
            session_id: session_id.to_string(),
            user_id,
            metadata: std::collections::HashMap::new(),
            history: Vec::new(),
        })
    }

    /// Send a completion request
    pub async fn complete(&self, request: BrainwavCompletionRequest) -> Result<BrainwavCompletionResponse> {
        let params = serde_json::to_value(&request)?;
        let response = self.client.call_tool("complete", params).await?;

        let completion: BrainwavCompletionResponse = serde_json::from_value(response)?;
        Ok(completion)
    }

    /// Stream a completion request
    pub async fn stream_complete(
        &self,
        request: BrainwavCompletionRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<BrainwavCompletionResponse>> {
        let (tx, rx) = tokio::sync::mpsc::channel(100);

        let mut stream_request = request;
        stream_request.stream = Some(true);

        let params = serde_json::to_value(&stream_request)?;
        let client = &self.client;

        // Start streaming in a background task
        tokio::spawn(async move {
            match client.call_tool("stream_complete", params).await {
                Ok(response) => {
                    // Parse streaming response
                    if let Some(chunks) = response.get("chunks").and_then(|c| c.as_array()) {
                        for chunk in chunks {
                            if let Ok(completion) = serde_json::from_value::<BrainwavCompletionResponse>(chunk.clone()) {
                                if tx.send(completion).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Streaming error: {}", e);
                }
            }
        });

        Ok(rx)
    }

    /// Send a message in a conversation
    pub async fn send_message(
        &self,
        context: &mut BrainwavContext,
        content: String,
        role: Option<String>,
    ) -> Result<BrainwavMessage> {
        let message = BrainwavMessage {
            id: uuid::Uuid::new_v4().to_string(),
            role: role.unwrap_or_else(|| "user".to_string()),
            content: content.clone(),
            timestamp: std::time::SystemTime::now(),
            metadata: std::collections::HashMap::new(),
        };

        let params = serde_json::json!({
            "conversation_id": context.conversation_id,
            "message": message
        });

        let response = self.client.call_tool("send_message", params).await?;

        // Parse assistant response
        let assistant_message: BrainwavMessage = serde_json::from_value(
            response.get("response").cloned().unwrap_or_default()
        )?;

        // Update context history
        context.history.push(message.clone());
        context.history.push(assistant_message.clone());

        Ok(assistant_message)
    }

    /// Get conversation history
    pub async fn get_conversation_history(&self, conversation_id: &str) -> Result<Vec<BrainwavMessage>> {
        let params = serde_json::json!({
            "conversation_id": conversation_id
        });

        let response = self.client.call_tool("get_history", params).await?;

        let messages: Vec<BrainwavMessage> = serde_json::from_value(
            response.get("messages").cloned().unwrap_or_default()
        )?;

        Ok(messages)
    }

    /// List available models
    pub async fn list_models(&self) -> Result<Vec<String>> {
        let response = self.client.call_tool("list_models", serde_json::json!({})).await?;

        let models: Vec<String> = response
            .get("models")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }

    /// Update configuration
    pub async fn update_config(&mut self, config: BrainwavConfig) -> Result<()> {
        let params = serde_json::to_value(&config)?;
        self.client.call_tool("update_config", params).await?;

        self.config = config;
        tracing::info!("BrainwAV configuration updated");
        Ok(())
    }

    /// Get current configuration
    pub fn config(&self) -> &BrainwavConfig {
        &self.config
    }

    /// Get base MCP client
    pub fn client(&self) -> &McpClient {
        &self.client
    }

    /// Health check
    pub async fn health_check(&self) -> Result<serde_json::Value> {
        self.client.call_tool("health_check", serde_json::json!({})).await
    }

    /// Get server statistics
    pub async fn get_stats(&self) -> Result<serde_json::Value> {
        self.client.call_tool("get_stats", serde_json::json!({})).await
    }

    /// Stop the client
    pub async fn stop(&mut self) -> Result<()> {
        self.client.stop().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brainwav_config_default() {
        let config = BrainwavConfig::default();
        assert_eq!(config.server_url, "http://localhost:3001");
        assert_eq!(config.model, "gpt-4");
        assert_eq!(config.temperature, 0.7);
        assert_eq!(config.max_tokens, 4096);
        assert!(config.streaming);
    }

    #[test]
    fn test_brainwav_message() {
        let message = BrainwavMessage {
            id: "test-id".to_string(),
            role: "user".to_string(),
            content: "Hello, world!".to_string(),
            timestamp: std::time::SystemTime::now(),
            metadata: std::collections::HashMap::new(),
        };

        assert_eq!(message.id, "test-id");
        assert_eq!(message.role, "user");
        assert_eq!(message.content, "Hello, world!");
    }

    #[test]
    fn test_brainwav_context() {
        let context = BrainwavContext {
            conversation_id: "conv-123".to_string(),
            session_id: "sess-456".to_string(),
            user_id: Some("user-789".to_string()),
            metadata: std::collections::HashMap::new(),
            history: Vec::new(),
        };

        assert_eq!(context.conversation_id, "conv-123");
        assert_eq!(context.session_id, "sess-456");
        assert_eq!(context.user_id, Some("user-789".to_string()));
        assert!(context.history.is_empty());
    }

    #[test]
    fn test_completion_request() {
        let request = BrainwavCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![],
            temperature: Some(0.7),
            max_tokens: Some(1000),
            stream: Some(false),
            parameters: std::collections::HashMap::new(),
        };

        assert_eq!(request.model, "gpt-4");
        assert_eq!(request.temperature, Some(0.7));
        assert_eq!(request.max_tokens, Some(1000));
        assert_eq!(request.stream, Some(false));
    }

    #[test]
    fn test_completion_response() {
        let response = BrainwavCompletionResponse {
            id: "resp-123".to_string(),
            model: "gpt-4".to_string(),
            content: "Generated text".to_string(),
            usage: Some(BrainwavUsage {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            }),
            metadata: std::collections::HashMap::new(),
        };

        assert_eq!(response.id, "resp-123");
        assert_eq!(response.model, "gpt-4");
        assert_eq!(response.content, "Generated text");

        let usage = response.usage.unwrap();
        assert_eq!(usage.total_tokens, 30);
    }

    #[test]
    fn test_brainwav_usage() {
        let usage = BrainwavUsage {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
        };

        assert_eq!(usage.prompt_tokens, 100);
        assert_eq!(usage.completion_tokens, 200);
        assert_eq!(usage.total_tokens, 300);
    }

    #[test]
    fn test_config_serialization() {
        let config = BrainwavConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: BrainwavConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.server_url, deserialized.server_url);
        assert_eq!(config.model, deserialized.model);
        assert_eq!(config.temperature, deserialized.temperature);
    }

    #[test]
    fn test_message_serialization() {
        let message = BrainwavMessage {
            id: "test-id".to_string(),
            role: "user".to_string(),
            content: "Test content".to_string(),
            timestamp: std::time::SystemTime::now(),
            metadata: std::collections::HashMap::new(),
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: BrainwavMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(message.id, deserialized.id);
        assert_eq!(message.role, deserialized.role);
        assert_eq!(message.content, deserialized.content);
    }
}
