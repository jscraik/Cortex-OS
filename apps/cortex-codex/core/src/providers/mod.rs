//! Provider abstraction module
//!
//! This module provides the core provider abstraction system for Codex,
//! enabling support for multiple AI model providers through a unified interface.
//!
//! External provider packages:
//! - anthropic: Anthropic Claude API client
//! - zai: Z.ai API client
//! - ollama: Local model client (existing package)

pub mod errors;
pub mod openai;
pub mod registry;
pub mod streaming;
pub mod traits;

// Re-export key types for convenience
pub use errors::ProviderError;
pub use openai::OpenAIProvider;
pub use registry::ProviderRegistry;
pub use streaming::{SseConfig, sse_into_stream, start_sse};
pub use traits::{
    BoxStream, CompletionRequest, CompletionResponse, Message, ModelProvider, StreamEvent,
    StreamResult, Usage,
};

// TODO: External provider packages (enable after they compile)
// pub use codex_anthropic as anthropic_client;
// pub use codex_zai as zai_client;

// TODO: Provider adapters for external clients (enable after external packages work)
// mod adapters;
// pub use adapters::{AnthropicAdapter, ZaiAdapter};
