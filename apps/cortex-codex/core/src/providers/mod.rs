//! Provider abstraction module
//!
//! This module provides the core provider abstraction system for Codex,
//! enabling support for multiple AI model providers through a unified interface.

pub mod traits;
pub mod registry;
pub mod mocks;

// Re-export key types for convenience
pub use traits::{ModelProvider, Message, CompletionResponse, Usage};
pub use registry::ProviderRegistry;
pub use mocks::{MockOpenAIProvider, MockAnthropicProvider, MockOllamaProvider};
