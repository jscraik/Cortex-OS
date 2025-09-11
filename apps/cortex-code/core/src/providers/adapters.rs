//! Provider adapters for external client packages
//!
//! This module provides adapter implementations that bridge between external
//! provider client packages and the core ModelProvider trait.

use async_trait::async_trait;
use crate::error::Result;
use super::{
    traits::{ModelProvider, CompletionRequest, CompletionResponse, Usage, BoxStream, StreamResult, Message},
    ProviderError,
};
use super::{anthropic_client, zai_client};

/// Adapter for the external Anthropic client
pub struct AnthropicAdapter {
    client: anthropic_client::AnthropicClient,
}

impl AnthropicAdapter {
    /// Create a new Anthropic adapter
    pub fn new(api_key: Option<String>) -> Result<Self> {
        let api_key = api_key
            .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok())
            .ok_or_else(|| ProviderError::AuthMissing)?;

        let client = anthropic_client::AnthropicClient::new(api_key)
            .map_err(|e| ProviderError::unknown(format!("Failed to create Anthropic client: {}", e)))?;

        Ok(Self { client })
    }

    /// Create with custom configuration
    pub fn with_config(
        api_key: String,
        base_url: Option<String>,
        timeout: Option<std::time::Duration>,
    ) -> Result<Self> {
        let client = if let (Some(url), Some(timeout)) = (base_url, timeout) {
            anthropic_client::AnthropicClient::with_config(api_key, url, timeout)
        } else {
            anthropic_client::AnthropicClient::new(api_key)
        };

        let client = client
            .map_err(|e| ProviderError::unknown(format!("Failed to create Anthropic client: {}", e)))?;

        Ok(Self { client })
    }
}

#[async_trait]
impl ModelProvider for AnthropicAdapter {
    fn name(&self) -> &str {
        "anthropic"
    }

    fn display_name(&self) -> &str {
        "Anthropic Claude"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        // Use the external client to get models
        let models = self.client
            .list_models()
            .await
            .map_err(|e| ProviderError::unknown(format!("Failed to list models: {}", e)))?;

        Ok(models.data.into_iter().map(|m| m.id).collect())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        // Convert core messages to Anthropic messages
        let anthropic_messages: Vec<anthropic_client::AnthropicMessage> = req
            .messages
            .iter()
            .map(|msg| {
                match msg.role.as_str() {
                    "system" => anthropic_client::AnthropicMessage::system(&msg.content),
                    "user" => anthropic_client::AnthropicMessage::user(&msg.content),
                    "assistant" => anthropic_client::AnthropicMessage::assistant(&msg.content),
                    _ => anthropic_client::AnthropicMessage::user(&msg.content),
                }
            })
            .collect();

        // Create Anthropic request
        let mut anthropic_req = anthropic_client::AnthropicChatCompletionRequest::new(
            req.model.clone(),
            anthropic_messages,
        );

        if let Some(max_tokens) = req.max_tokens {
            anthropic_req = anthropic_req.with_max_tokens(max_tokens);
        }

        if let Some(temperature) = req.temperature {
            anthropic_req = anthropic_req.with_temperature(temperature);
        }

        // Make the request
        let response = self.client
            .chat_completion(anthropic_req)
            .await
            .map_err(|e| ProviderError::unknown(format!("Anthropic API error: {}", e)))?;

        // Convert response
        let content = response.content
            .into_iter()
            .filter_map(|block| {
                if let anthropic_client::ContentBlock::Text { text } = block {
                    Some(text)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("\\n");

        let usage = Usage {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        };

        Ok(CompletionResponse {
            content,
            model: response.model,
            usage,
            finish_reason: response.stop_reason,
        })
    }

    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>> {
        // Convert core messages to Anthropic messages
        let anthropic_messages: Vec<anthropic_client::AnthropicMessage> = req
            .messages
            .iter()
            .map(|msg| {
                match msg.role.as_str() {
                    "system" => anthropic_client::AnthropicMessage::system(&msg.content),
                    "user" => anthropic_client::AnthropicMessage::user(&msg.content),
                    "assistant" => anthropic_client::AnthropicMessage::assistant(&msg.content),
                    _ => anthropic_client::AnthropicMessage::user(&msg.content),
                }
            })
            .collect();

        // Create Anthropic request
        let mut anthropic_req = anthropic_client::AnthropicChatCompletionRequest::new(
            req.model.clone(),
            anthropic_messages,
        );

        if let Some(max_tokens) = req.max_tokens {
            anthropic_req = anthropic_req.with_max_tokens(max_tokens);
        }

        if let Some(temperature) = req.temperature {
            anthropic_req = anthropic_req.with_temperature(temperature);
        }

        // Get streaming response
        let stream = self.client
            .chat_completion_stream(anthropic_req)
            .await
            .map_err(|e| ProviderError::unknown(format!("Anthropic streaming error: {}", e)))?;

        // Convert stream to core stream format
        use futures::StreamExt;
        let core_stream = stream.map(|event_result| {
            match event_result {
                Ok(event) => {
                    match event {
                        anthropic_client::AnthropicStreamEvent::ContentBlockDelta { delta, .. } => {
                            if let Some(text) = delta.text {
                                Ok(super::traits::StreamEvent::Token { text, index: 0 })
                            } else {
                                Ok(super::traits::StreamEvent::Heartbeat)
                            }
                        }
                        anthropic_client::AnthropicStreamEvent::MessageStop => {
                            // For now, we'll handle this as a heartbeat since we need the full content
                            Ok(super::traits::StreamEvent::Heartbeat)
                        }
                        anthropic_client::AnthropicStreamEvent::Error { error } => {
                            Ok(super::traits::StreamEvent::Error(error.message))
                        }
                        _ => Ok(super::traits::StreamEvent::Heartbeat),
                    }
                }
                Err(e) => Err(ProviderError::unknown(format!("Stream error: {}", e)).into()),
            }
        });

        Ok(Box::pin(core_stream))
    }

    async fn validate_config(&self) -> Result<()> {
        self.client
            .health_check()
            .await
            .map_err(|e| ProviderError::unknown(format!("Anthropic validation failed: {}", e)))?;
        Ok(())
    }
}

/// Adapter for the external Z.ai client
pub struct ZaiAdapter {
    client: zai_client::ZaiClient,
}

impl ZaiAdapter {
    /// Create a new Z.ai adapter
    pub fn new(api_key: Option<String>) -> Result<Self> {
        let api_key = api_key
            .or_else(|| std::env::var("ZAI_API_KEY").ok())
            .ok_or_else(|| ProviderError::AuthMissing)?;

        let client = zai_client::ZaiClient::new(api_key)
            .map_err(|e| ProviderError::unknown(format!("Failed to create Z.ai client: {}", e)))?;

        Ok(Self { client })
    }

    /// Create with custom configuration
    pub fn with_config(
        api_key: String,
        base_url: Option<String>,
        timeout: Option<std::time::Duration>,
    ) -> Result<Self> {
        let client = if let (Some(url), Some(timeout)) = (base_url, timeout) {
            zai_client::ZaiClient::with_config(
                api_key,
                Some(url),
                Some(timeout),
                None, // organization
            )
        } else {
            zai_client::ZaiClient::new(api_key)
        };

        let client = client
            .map_err(|e| ProviderError::unknown(format!("Failed to create Z.ai client: {}", e)))?;

        Ok(Self { client })
    }
}

#[async_trait]
impl ModelProvider for ZaiAdapter {
    fn name(&self) -> &str {
        "zai"
    }

    fn display_name(&self) -> &str {
        "Z.ai"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        let models = self.client
            .list_models()
            .await
            .map_err(|e| ProviderError::unknown(format!("Failed to list models: {}", e)))?;

        Ok(models.data.into_iter().map(|m| m.id).collect())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        // Convert core messages to Z.ai messages
        let zai_messages: Vec<zai_client::ZaiMessage> = req
            .messages
            .iter()
            .map(|msg| {
                match msg.role.as_str() {
                    "system" => zai_client::ZaiMessage::system(&msg.content),
                    "user" => zai_client::ZaiMessage::user(&msg.content),
                    "assistant" => zai_client::ZaiMessage::assistant(&msg.content),
                    _ => zai_client::ZaiMessage::user(&msg.content),
                }
            })
            .collect();

        // Create Z.ai request
        let mut zai_req = zai_client::ZaiChatCompletionRequest::new(
            req.model.clone(),
            zai_messages,
        );

        if let Some(max_tokens) = req.max_tokens {
            zai_req = zai_req.with_max_tokens(max_tokens);
        }

        if let Some(temperature) = req.temperature {
            zai_req = zai_req.with_temperature(temperature);
        }

        // Make the request
        let response = self.client
            .chat_completion(zai_req)
            .await
            .map_err(|e| ProviderError::unknown(format!("Z.ai API error: {}", e)))?;

        // Convert response
        let choice = response.choices
            .into_iter()
            .next()
            .ok_or_else(|| ProviderError::unknown("No response choices"))?;

        let usage = response.usage
            .map(|u| Usage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            })
            .unwrap_or_default();

        Ok(CompletionResponse {
            content: choice.message.content,
            model: response.model,
            usage,
            finish_reason: choice.finish_reason,
        })
    }

    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>> {
        // Convert core messages to Z.ai messages
        let zai_messages: Vec<zai_client::ZaiMessage> = req
            .messages
            .iter()
            .map(|msg| {
                match msg.role.as_str() {
                    "system" => zai_client::ZaiMessage::system(&msg.content),
                    "user" => zai_client::ZaiMessage::user(&msg.content),
                    "assistant" => zai_client::ZaiMessage::assistant(&msg.content),
                    _ => zai_client::ZaiMessage::user(&msg.content),
                }
            })
            .collect();

        // Create Z.ai request
        let mut zai_req = zai_client::ZaiChatCompletionRequest::new(
            req.model.clone(),
            zai_messages,
        );

        if let Some(max_tokens) = req.max_tokens {
            zai_req = zai_req.with_max_tokens(max_tokens);
        }

        if let Some(temperature) = req.temperature {
            zai_req = zai_req.with_temperature(temperature);
        }

        // Get streaming response
        let stream = self.client
            .chat_completion_stream(zai_req)
            .await
            .map_err(|e| ProviderError::unknown(format!("Z.ai streaming error: {}", e)))?;

        // Convert stream to core stream format
        use futures::StreamExt;
        let core_stream = stream.map(|event_result| {
            match event_result {
                Ok(event) => {
                    match event {
                        zai_client::ZaiStreamEvent::ContentDelta { delta, .. } => {
                            if let Some(text) = delta.text {
                                Ok(super::traits::StreamEvent::Token { text, index: 0 })
                            } else {
                                Ok(super::traits::StreamEvent::Heartbeat)
                            }
                        }
                        zai_client::ZaiStreamEvent::MessageStop => {
                            Ok(super::traits::StreamEvent::Heartbeat)
                        }
                        zai_client::ZaiStreamEvent::Error { error } => {
                            Ok(super::traits::StreamEvent::Error(error.message))
                        }
                        _ => Ok(super::traits::StreamEvent::Heartbeat),
                    }
                }
                Err(e) => Err(ProviderError::unknown(format!("Stream error: {}", e)).into()),
            }
        });

        Ok(Box::pin(core_stream))
    }

    async fn validate_config(&self) -> Result<()> {
        self.client
            .test_connection()
            .await
            .map_err(|e| ProviderError::unknown(format!("Z.ai validation failed: {}", e)))?;
        Ok(())
    }
}
