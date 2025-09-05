//! Provider abstraction module
//!
//! This module provides the core provider abstraction system for Codex,
//! enabling support for multiple AI model providers through a unified interface.

pub mod anthropic;
pub mod errors;
pub mod mocks;
pub mod openai;
pub mod registry;
pub mod streaming;
pub mod traits;
pub mod zai;

// Re-export key types for convenience
pub use anthropic::AnthropicProvider;
pub use errors::ProviderError;
pub use mocks::{MockAnthropicProvider, MockOllamaProvider, MockOpenAIProvider};
pub use openai::OpenAIProvider;
pub use registry::ProviderRegistry;
pub use streaming::{SseConfig, sse_into_stream, start_sse};
pub use traits::{
    BoxStream, CompletionRequest, CompletionResponse, Message, ModelProvider, StreamEvent,
    StreamResult, Usage,
};
pub use zai::ZaiProvider;
