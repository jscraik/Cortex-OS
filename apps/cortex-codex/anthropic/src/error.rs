//! Error types for Anthropic client

use codex_core::error::CodexErr;
use thiserror::Error;

/// Errors that can occur when using the Anthropic client
#[derive(Error, Debug)]
pub enum AnthropicError {
    /// Missing API key
    #[error("Anthropic API key not found. Set the ANTHROPIC_API_KEY environment variable.")]
    MissingApiKey,

    /// HTTP request error
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    /// API returned an error response
    #[error("Anthropic API error (status {status}): {message}")]
    ApiError { status: u16, message: String },

    /// Failed to parse API response
    #[error("Failed to parse response: {0}")]
    ParseError(#[from] serde_json::Error),

    /// Streaming error
    #[error("Streaming error: {0}")]
    StreamError(String),

    /// Invalid model name
    #[error("Invalid model name: {0}")]
    InvalidModel(String),

    /// Rate limit exceeded
    #[error("Rate limit exceeded. Please try again later.")]
    RateLimitExceeded,

    /// Invalid request parameters
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    /// Authentication failed
    #[error("Authentication failed. Check your API key.")]
    AuthenticationFailed,

    /// Service unavailable
    #[error("Anthropic service is currently unavailable. Please try again later.")]
    ServiceUnavailable,

    /// Unknown error
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<AnthropicError> for CodexErr {
    fn from(err: AnthropicError) -> Self {
        match err {
            AnthropicError::ApiError { status, message } => CodexErr::ConfigurationError(format!(
                "Anthropic API error [{}]: {}",
                status, message
            )),
            AnthropicError::RateLimitExceeded => {
                CodexErr::RetryLimit(reqwest::StatusCode::TOO_MANY_REQUESTS)
            }
            AnthropicError::HttpError(e) => {
                if e.is_timeout() {
                    CodexErr::Timeout
                } else {
                    CodexErr::ConfigurationError(format!("Anthropic HTTP error: {}", e))
                }
            }
            AnthropicError::StreamError(message) => {
                CodexErr::Stream(format!("Anthropic stream error: {}", message), None)
            }
            AnthropicError::MissingApiKey => {
                CodexErr::ConfigurationError("Missing Anthropic API key".into())
            }
            AnthropicError::ParseError(e) => {
                CodexErr::ConfigurationError(format!("Anthropic parse error: {}", e))
            }
            AnthropicError::AuthenticationFailed => {
                CodexErr::ConfigurationError("Anthropic authentication failed".into())
            }
            AnthropicError::InvalidModel(model) => {
                CodexErr::ConfigurationError(format!("Anthropic invalid model: {}", model))
            }
            AnthropicError::InvalidRequest(msg) => {
                CodexErr::ConfigurationError(format!("Anthropic invalid request: {}", msg))
            }
            AnthropicError::ServiceUnavailable => {
                CodexErr::ConfigurationError("Anthropic service unavailable".into())
            }
            AnthropicError::Unknown(msg) => {
                CodexErr::ConfigurationError(format!("Anthropic unknown error: {}", msg))
            }
        }
    }
}
