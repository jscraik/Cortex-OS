//! Provider abstraction traits and interfaces
//!
//! This module provides the core abstraction layer for AI model providers,
//! enabling the Codex system to work with multiple providers (OpenAI, Anthropic,
//! Ollama, etc.) through a unified interface.

use crate::error::Result;
use async_trait::async_trait;
use futures::Stream;
use serde::{Deserialize, Serialize};

/// Message structure for provider communication
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// Completion response from a provider
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: Usage,
}

/// Token usage information
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Core trait that all AI model providers must implement
#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Get the provider's unique identifier
    fn name(&self) -> &str;

    /// Get the provider's human-readable display name
    fn display_name(&self) -> &str;

    /// Check if the provider supports streaming responses
    fn supports_streaming(&self) -> bool;

    /// Get list of available models for this provider
    async fn available_models(&self) -> Result<Vec<String>>;

    /// Send a completion request to the provider
    async fn complete(
        &self,
        messages: &[Message],
        model: &str,
        temperature: Option<f32>,
    ) -> Result<CompletionResponse>;

    /// Send a streaming completion request (if supported)
    async fn complete_streaming(
        &self,
        messages: &[Message],
        model: &str,
        temperature: Option<f32>,
    ) -> Result<Box<dyn Stream<Item = Result<String>> + Send + Unpin>>;

    /// Validate provider configuration and connectivity
    async fn validate_config(&self) -> Result<()>;
}
