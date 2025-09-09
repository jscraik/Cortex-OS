//! Provider-specific error taxonomy.
//!
//! This layer narrows external HTTP / transport / parsing failures into a
//! stable enum so higher layers can perform consistent matching without
//! depending on underlying client crate specifics.

use crate::error::CodexErr;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Serialize, Deserialize, PartialEq, Eq, Clone)]
#[non_exhaustive]
pub enum ProviderError {
    #[error("unsupported model: {model}")]
    UnsupportedModel { model: String },

    #[error("authentication missing or invalid")]
    AuthMissing,

    #[error("rate limited (retry after: {retry_after:?})")]
    RateLimited { retry_after: Option<u64> },

    #[error("upstream timeout")]
    Timeout,

    #[error("network error: {message}")]
    Network { message: String },

    #[error("protocol error: {message}")]
    Protocol { message: String },

    #[error("stream closed prematurely")]
    StreamClosed,

    #[error("retries exhausted")]
    RetriesExhausted,

    #[error("json decode error: {message}")]
    Json { message: String },

    #[error("unknown error: {message}")]
    Unknown { message: String },

    #[error("no providers registered")]
    NoProvidersRegistered,

    #[error("unknown provider: {provider}")]
    UnknownProvider { provider: String },

    #[error("model not supported: {model}")]
    ModelNotSupported { model: String },

    #[error("no resolution path available")]
    NoResolutionPath,
}

impl ProviderError {
    pub fn unknown<E: std::fmt::Display>(e: E) -> Self {
        Self::Unknown {
            message: e.to_string(),
        }
    }
}

impl From<reqwest::Error> for ProviderError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_timeout() {
            return ProviderError::Timeout;
        }
        if e.is_decode() {
            return ProviderError::Json {
                message: e.to_string(),
            };
        }
        ProviderError::Network {
            message: e.to_string(),
        }
    }
}

// Map provider-layer errors into top-level CodexErr without creating a circular
// dependency by adding a CodexErr variant.
impl From<ProviderError> for CodexErr {
    fn from(p: ProviderError) -> Self {
        use ProviderError::*;
        match p {
            UnsupportedModel { model } => {
                CodexErr::ConfigurationError(format!("unsupported model: {model}"))
            }
            AuthMissing => CodexErr::ConfigurationError("authentication missing or invalid".into()),
            RateLimited { .. } => CodexErr::RetryLimit(StatusCode::TOO_MANY_REQUESTS),
            Timeout => CodexErr::Timeout,
            Network { message } => {
                CodexErr::ConfigurationError(format!("network error: {message}"))
            }
            Protocol { message } => {
                CodexErr::ConfigurationError(format!("protocol error: {message}"))
            }
            StreamClosed => CodexErr::Stream("stream closed prematurely".into(), None),
            RetriesExhausted => CodexErr::RetryLimit(StatusCode::INTERNAL_SERVER_ERROR),
            Json { message } => {
                CodexErr::ConfigurationError(format!("json decode error: {message}"))
            }
            Unknown { message } => {
                CodexErr::ConfigurationError(format!("unknown provider error: {message}"))
            }
            NoProvidersRegistered => {
                CodexErr::ConfigurationError("no providers registered".into())
            }
            UnknownProvider { provider } => {
                CodexErr::ConfigurationError(format!("unknown provider: {provider}"))
            }
            ModelNotSupported { model } => {
                CodexErr::ConfigurationError(format!("model not supported: {model}"))
            }
            NoResolutionPath => {
                CodexErr::ConfigurationError("no resolution path available".into())
            }
        }
    }
}
