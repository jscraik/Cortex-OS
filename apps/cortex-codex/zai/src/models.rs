//! Data models for Z.ai API

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Chat completion request to Z.ai
#[derive(Debug, Clone, Serialize)]
pub struct ZaiChatCompletionRequest {
    /// Model to use for completion
    pub model: String,
    /// Messages to complete
    pub messages: Vec<ZaiMessage>,
    /// Maximum number of tokens to generate
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    /// Temperature for sampling (0.0 to 2.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Top-p for nucleus sampling (0.0 to 1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    /// Number of completions to generate
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    /// Whether to stream the response
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    /// Stop sequences
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Vec<String>>,
    /// Presence penalty (-2.0 to 2.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
    /// Frequency penalty (-2.0 to 2.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,
    /// User identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
    /// Additional model parameters
    #[serde(flatten)]
    pub additional_params: HashMap<String, serde_json::Value>,
}

/// A message in a chat completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaiMessage {
    /// Role of the message sender
    pub role: ZaiRole,
    /// Content of the message
    pub content: String,
    /// Optional name of the sender
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Role of a message sender
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ZaiRole {
    /// System message (instructions)
    System,
    /// User message
    User,
    /// Assistant response
    Assistant,
}

/// Chat completion response from Z.ai
#[derive(Debug, Clone, Deserialize)]
pub struct ZaiChatCompletionResponse {
    /// Unique identifier for the completion
    pub id: String,
    /// Object type (always "chat.completion")
    pub object: String,
    /// Unix timestamp of creation
    pub created: u64,
    /// Model used for completion
    pub model: String,
    /// List of completion choices
    pub choices: Vec<ZaiChoice>,
    /// Usage statistics
    pub usage: Option<ZaiUsage>,
}

/// A completion choice
#[derive(Debug, Clone, Deserialize)]
pub struct ZaiChoice {
    /// Index of this choice
    pub index: u32,
    /// The completion message
    pub message: ZaiMessage,
    /// Reason why the completion finished
    pub finish_reason: Option<String>,
}

/// Usage statistics for a completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaiUsage {
    /// Number of tokens in the prompt
    pub prompt_tokens: u32,
    /// Number of tokens in the completion
    pub completion_tokens: u32,
    /// Total number of tokens used
    pub total_tokens: u32,
}

/// Available Z.ai models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaiModel {
    /// Model identifier
    pub id: String,
    /// Object type (always "model")
    pub object: String,
    /// Unix timestamp of creation
    pub created: u64,
    /// Model owner
    pub owned_by: String,
    /// Model permissions
    #[serde(default)]
    pub permission: Vec<ZaiPermission>,
}

/// Model permission
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaiPermission {
    /// Permission ID
    pub id: String,
    /// Object type
    pub object: String,
    /// Creation timestamp
    pub created: u64,
    /// Whether fine-tuning is allowed
    pub allow_create_engine: bool,
    /// Whether sampling is allowed
    pub allow_sampling: bool,
    /// Whether log probabilities are allowed
    pub allow_logprobs: bool,
    /// Whether search indices are allowed
    pub allow_search_indices: bool,
    /// Whether viewing is allowed
    pub allow_view: bool,
    /// Whether fine-tuning is allowed
    pub allow_fine_tuning: bool,
    /// Organization
    pub organization: String,
    /// Group
    pub group: Option<String>,
    /// Whether this is a blocking permission
    pub is_blocking: bool,
}

/// List of models response
#[derive(Debug, Clone, Deserialize)]
pub struct ZaiModelsResponse {
    /// Object type (always "list")
    pub object: String,
    /// List of models
    pub data: Vec<ZaiModel>,
}

/// Streaming events from Z.ai
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ZaiStreamEvent {
    /// Ping event (keep-alive)
    Ping,
    /// Content delta event
    ContentDelta {
        /// Delta content
        delta: ZaiDelta,
        /// Message index
        index: u32,
    },
    /// Message start event
    MessageStart {
        /// Message being started
        message: ZaiMessage,
    },
    /// Message delta event
    MessageDelta {
        /// Delta content
        delta: ZaiMessageDelta,
        /// Usage statistics
        usage: ZaiUsage,
    },
    /// Message stop event
    MessageStop,
    /// Error event
    Error {
        /// Error details
        error: ErrorContent,
    },
}

/// Content delta for streaming
#[derive(Debug, Clone, Deserialize)]
pub struct ZaiDelta {
    /// Text delta
    pub text: Option<String>,
}

/// Message delta for streaming
#[derive(Debug, Clone, Deserialize)]
pub struct ZaiMessageDelta {
    /// Stop reason
    pub stop_reason: Option<String>,
    /// Stop sequence
    pub stop_sequence: Option<String>,
}

/// Error content
#[derive(Debug, Clone, Deserialize)]
pub struct ErrorContent {
    /// Error type
    #[serde(rename = "type")]
    pub error_type: String,
    /// Error message
    pub message: String,
}

impl ZaiChatCompletionRequest {
    /// Create a new chat completion request
    pub fn new(model: impl Into<String>, messages: Vec<ZaiMessage>) -> Self {
        Self {
            model: model.into(),
            messages,
            max_tokens: None,
            temperature: None,
            top_p: None,
            n: None,
            stream: None,
            stop: None,
            presence_penalty: None,
            frequency_penalty: None,
            user: None,
            additional_params: HashMap::new(),
        }
    }

    /// Set maximum tokens
    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }

    /// Set temperature
    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = Some(temperature);
        self
    }

    /// Set top-p
    pub fn with_top_p(mut self, top_p: f32) -> Self {
        self.top_p = Some(top_p);
        self
    }

    /// Enable streaming
    pub fn with_streaming(mut self, stream: bool) -> Self {
        self.stream = Some(stream);
        self
    }

    /// Set stop sequences
    pub fn with_stop(mut self, stop: Vec<String>) -> Self {
        self.stop = Some(stop);
        self
    }

    /// Set user identifier
    pub fn with_user(mut self, user: impl Into<String>) -> Self {
        self.user = Some(user.into());
        self
    }

    /// Add an additional parameter
    pub fn with_param(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.additional_params.insert(key.into(), value);
        self
    }
}

impl ZaiMessage {
    /// Create a new system message
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: ZaiRole::System,
            content: content.into(),
            name: None,
        }
    }

    /// Create a new user message
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: ZaiRole::User,
            content: content.into(),
            name: None,
        }
    }

    /// Create a new assistant message
    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: ZaiRole::Assistant,
            content: content.into(),
            name: None,
        }
    }

    /// Set the sender name
    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }
}
