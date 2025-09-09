//! Error types for Z.ai API client

use thiserror::Error;

/// Errors that can occur when using the Z.ai client
#[derive(Error, Debug)]
pub enum ZaiError {
    /// HTTP request failed
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    /// Failed to serialize or deserialize JSON
    #[error("JSON serialization/deserialization failed: {0}")]
    JsonError(#[from] serde_json::Error),

    /// Z.ai API returned an error
    #[error("Z.ai API error: {message} (code: {code})")]
    ApiError {
        /// Error code from Z.ai
        code: String,
        /// Error message from Z.ai
        message: String,
    },

    /// Authentication failed
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),

    /// Rate limit exceeded
    #[error("Rate limit exceeded: {0}")]
    RateLimitError(String),

    /// Invalid request
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    /// Model not found
    #[error("Model not found: {0}")]
    ModelNotFound(String),

    /// Stream error
    #[error("Stream error: {0}")]
    StreamError(String),

    /// General error
    #[error("Z.ai client error: {0}")]
    Other(String),
}

// Import CodexErr for conversion
use codex_core::error::CodexErr;

impl From<ZaiError> for CodexErr {
    fn from(err: ZaiError) -> Self {
        match err {
            ZaiError::HttpError(e) => {
                if e.is_timeout() {
                    CodexErr::Timeout
                } else {
                    CodexErr::ConfigurationError(format!("Z.ai HTTP error: {}", e))
                }
            }
            ZaiError::JsonError(e) => {
                CodexErr::ConfigurationError(format!("Z.ai JSON error: {}", e))
            }
            ZaiError::ApiError { code, message } => {
                CodexErr::ConfigurationError(format!("Z.ai API error [{}]: {}", code, message))
            }
            ZaiError::AuthenticationError(msg) => {
                CodexErr::ConfigurationError(format!("Z.ai authentication error: {}", msg))
            }
            ZaiError::RateLimitError(_msg) => {
                CodexErr::RetryLimit(reqwest::StatusCode::TOO_MANY_REQUESTS)
            }
            ZaiError::InvalidRequest(msg) => {
                CodexErr::ConfigurationError(format!("Z.ai invalid request: {}", msg))
            }
            ZaiError::ModelNotFound(model) => {
                CodexErr::ConfigurationError(format!("Z.ai model not found: {}", model))
            }
            ZaiError::StreamError(msg) => {
                CodexErr::Stream(format!("Z.ai stream error: {}", msg), None)
            }
            ZaiError::Other(msg) => {
                CodexErr::ConfigurationError(format!("Z.ai error: {}", msg))
            }
        }
    }
}

impl ZaiError {
    /// Create a new API error
    pub fn api_error(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ApiError {
            code: code.into(),
            message: message.into(),
        }
    }

    /// Create a new authentication error
    pub fn authentication_error(message: impl Into<String>) -> Self {
        Self::AuthenticationError(message.into())
    }

    /// Create a new rate limit error
    pub fn rate_limit_error(message: impl Into<String>) -> Self {
        Self::RateLimitError(message.into())
    }

    /// Create a new invalid request error
    pub fn invalid_request(message: impl Into<String>) -> Self {
        Self::InvalidRequest(message.into())
    }

    /// Create a new model not found error
    pub fn model_not_found(model: impl Into<String>) -> Self {
        Self::ModelNotFound(model.into())
    }

    /// Create a new stream error
    pub fn stream_error(message: impl Into<String>) -> Self {
        Self::StreamError(message.into())
    }

    /// Create a new general error
    pub fn other(message: impl Into<String>) -> Self {
        Self::Other(message.into())
    }

    /// Check if this is a rate limit error
    pub fn is_rate_limit(&self) -> bool {
        matches!(self, Self::RateLimitError(_))
    }

    /// Check if this is an authentication error
    pub fn is_authentication_error(&self) -> bool {
        matches!(self, Self::AuthenticationError(_))
    }

    /// Check if this is a retryable error
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::HttpError(_) | Self::RateLimitError(_) | Self::StreamError(_) => true,
            Self::ApiError { code, .. } => {
                // Certain API error codes are retryable
                matches!(code.as_str(), "rate_limit_exceeded" | "server_error" | "timeout")
            }
            _ => false,
        }
    }
}
