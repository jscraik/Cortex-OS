//! Provider abstraction traits and interfaces
//!
//! This module provides the core abstraction layer for AI model providers,
//! enabling the Codex system to work with multiple providers (OpenAI, Anthropic,
//! Ollama, etc.) through a unified interface.

use crate::error::Result;
use crate::providers::ProviderError;
use async_trait::async_trait;
use futures::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

/// Message structure for provider communication
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// Token usage information
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Completion response from a provider (non-streaming)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: Usage,
    pub finish_reason: Option<String>,
}

/// Structured request for completion APIs (unifies params for testability)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompletionRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

impl CompletionRequest {
    pub fn new(messages: Vec<Message>, model: impl Into<String>) -> Self {
        Self { messages, model: model.into(), temperature: None, max_tokens: None }
    }

    pub fn with_temperature(mut self, t: f32) -> Self { self.temperature = Some(t); self }
    pub fn with_max_tokens(mut self, mt: u32) -> Self { self.max_tokens = Some(mt); self }
}

/// Streaming events emitted incrementally by providers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum StreamEvent {
    /// A token or textual delta.
    Token { text: String, index: usize },
    /// Provider/system message (e.g. tool call notice, internal metadata).
    System(String),
    /// Streaming completed; includes the fully assembled content.
    Finished { full: String, usage: Option<Usage> },
    /// Error mid-stream (surface for diagnostic tests).
    Error(String),
    /// Heartbeat / keep-alive (useful for timeout tests).
    Heartbeat,
}

pub type StreamResult = Result<StreamEvent>;
pub type BoxStream<'a, T> = Pin<Box<dyn Stream<Item = T> + Send + 'a>>;

/// Helper for assembling a streaming sequence of `StreamEvent`s into a final
/// `CompletionResponse` while also yielding each incremental event to callers.
///
/// Providers can optionally use this to standardize how streaming fragments
/// are concatenated and how usage metadata is surfaced. This avoids duplicating
/// logic across provider implementations and keeps tests focused on events.
#[derive(Debug, Default)]
pub struct StreamAssembler {
    buffer: String,
    usage: Option<Usage>,
    finished: bool,
}

impl StreamAssembler {
    pub fn new() -> Self { Self { buffer: String::new(), usage: None, finished: false } }

    /// Ingest a `StreamEvent`, updating internal state. Returns `Some` when a
    /// Finished event has been processed (idempotent for subsequent calls).
    pub fn ingest(&mut self, event: &StreamEvent) -> Option<CompletionResponse> {
        match event {
            StreamEvent::Token { text, .. } => {
                self.buffer.push_str(text);
                None
            }
            StreamEvent::Finished { full, usage } => {
                if !self.finished {
                    self.finished = true;
                    if self.buffer.is_empty() { self.buffer.push_str(full); }
                    if let Some(u) = usage.clone() { self.usage = Some(u); }
                    return Some(CompletionResponse {
                        content: self.buffer.clone(),
                        model: String::new(), // provider may patch later
                        usage: self.usage.clone().unwrap_or_default(),
                        finish_reason: Some("stop".into()),
                    });
                }
                None
            }
            _ => None,
        }
    }

    pub fn partial(&self) -> &str { &self.buffer }
}

/// Utility to convert a non-streaming `CompletionResponse` into a one-shot
/// streaming sequence. Providers that do not have native streaming can reuse
/// this to satisfy the `complete_streaming` contract.
pub fn response_to_stream(resp: CompletionResponse) -> BoxStream<'static, StreamResult> {
    use futures::{stream, StreamExt};
    let full = resp.content.clone();
    let usage = resp.usage.clone();
    stream::iter(vec![
        Ok(StreamEvent::Token { text: full.clone(), index: 0 }),
        Ok(StreamEvent::Finished { full, usage: Some(usage) }),
    ])
    .boxed()
}

/// Map a provider-level error into a streaming error event so test harnesses
/// can assert intermediate failures without collapsing the whole stream.
pub fn provider_error_event(err: ProviderError) -> StreamResult {
    Ok(StreamEvent::Error(err.to_string()))
}

/// Core trait that all AI model providers must implement
#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Get the provider's unique identifier (slug form)
    fn name(&self) -> &str;

    /// Get the provider's human-readable display name
    fn display_name(&self) -> &str;

    /// Check if the provider supports streaming responses
    fn supports_streaming(&self) -> bool { true }

    /// Get list of available models for this provider
    async fn available_models(&self) -> Result<Vec<String>>;

    /// Send a non-streaming completion request
    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse>;

    /// Send a streaming completion request (if supported). Implementations
    /// may fall back to non-streaming by returning a single Finished event.
    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>>;

    /// Validate provider configuration and connectivity
    async fn validate_config(&self) -> Result<()>;
}
