//! Anthropic Claude API client for Cortex-Codex
//!
//! This crate provides a comprehensive client for the Anthropic Claude API,
//! implementing the ModelProvider trait for seamless integration with the
//! Cortex-Codex framework.

pub mod client;
pub mod error;
pub mod models;
pub mod streaming;

pub use client::AnthropicClient;
pub use error::AnthropicError;
pub use models::*;
pub use streaming::AnthropicStream;

/// Default Anthropic API base URL
pub const ANTHROPIC_API_BASE: &str = "https://api.anthropic.com/v1";

/// Anthropic API version header value
pub const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Beta features header for Claude
pub const ANTHROPIC_BETA: &str =
    "claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14";

/// Default models available through Anthropic
pub const DEFAULT_MODELS: &[&str] = &[
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
];

/// Initialize Anthropic client with API key from environment
pub fn new_client() -> Result<AnthropicClient, AnthropicError> {
    let api_key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| AnthropicError::MissingApiKey)?;
    AnthropicClient::new(api_key)
}

/// Initialize Anthropic client with custom API key
pub fn new_client_with_key(api_key: String) -> Result<AnthropicClient, AnthropicError> {
    AnthropicClient::new(api_key)
}

/// Check if a model name is a known Anthropic model
pub fn is_anthropic_model(model: &str) -> bool {
    DEFAULT_MODELS
        .iter()
        .any(|&m| model.contains(m) || m.contains(model))
        || model.to_lowercase().contains("claude")
}
