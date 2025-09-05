//! Provider Abstraction Tests - Task 2.2
//!
//! Tests for the provider abstraction layer that enables switching between
//! different AI model providers (OpenAI, Anthropic, Ollama, etc.) while
//! maintaining a consistent interface.
//!
//! Test Categories:
//! - Provider trait implementation and basic operations
//! - Provider registry and discovery
//! - Provider configuration and authentication
//! - Model selection and provider switching
//! - Error handling for provider operations
//! - Provider lifecycle management

use codex_core::providers::{
    ModelProvider, ProviderRegistry, Message, CompletionRequest, StreamEvent,
    MockOpenAIProvider, MockAnthropicProvider, MockOllamaProvider
};
use codex_core::error::CodexErr;
use futures::StreamExt;
use tokio;

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use futures::StreamExt;

    /// Test basic provider trait implementation
    #[tokio::test]
    async fn test_provider_basic_operations() {
        let provider = MockOpenAIProvider::new(Some("test-key".to_string()));

        assert_eq!(provider.name(), "openai");
        assert_eq!(provider.display_name(), "OpenAI");
        assert!(provider.supports_streaming());

        let models = provider.available_models().await.unwrap();
        assert!(models.contains(&"gpt-4".to_string()));
        assert!(models.contains(&"gpt-3.5-turbo".to_string()));
    }

    /// Test provider completion functionality
    #[tokio::test]
    async fn test_provider_completion() {
        let provider = MockOpenAIProvider::new(Some("test-key".to_string()));

        let req = CompletionRequest::new(vec![Message { role: "user".into(), content: "Hello, how are you?".into() }], "gpt-4")
            .with_temperature(0.7);
        let response = provider.complete(&req).await.unwrap();

        assert_eq!(response.model, "gpt-4");
        assert!(response.content.contains("Hello, how are you?"));
        assert!(response.usage.total_tokens > 0);
    }

    /// Test provider streaming functionality
    #[tokio::test]
    async fn test_provider_streaming() {
        let provider = MockOpenAIProvider::new(Some("test-key".to_string()));

        let req = CompletionRequest::new(vec![Message { role: "user".into(), content: "Tell me a story".into() }], "gpt-4");
        let mut stream = provider.complete_streaming(&req).await.unwrap();
        let mut tokens = Vec::new();
        while let Some(evt) = stream.next().await {
            match evt.unwrap() {
                StreamEvent::Token { text, .. } => tokens.push(text),
                StreamEvent::Finished { .. } => break,
                _ => {}
            }
        }
        assert!(tokens.join("").contains("Mock"));
    }

    /// Test provider registry registration and retrieval
    #[tokio::test]
    async fn test_provider_registry_registration() {
        let mut registry = ProviderRegistry::new();

        let openai_provider = MockOpenAIProvider::new(Some("test-key".to_string()));
        registry.register("openai".to_string(), Box::new(openai_provider));

        let anthropic_provider = MockAnthropicProvider::new(Some("test-key".to_string()));
        registry.register("anthropic".to_string(), Box::new(anthropic_provider));

        assert!(registry.get("openai").is_some());
        assert!(registry.get("anthropic").is_some());
        assert!(registry.get("nonexistent").is_none());

        let providers = registry.list_providers();
        assert_eq!(providers.len(), 2);
        assert!(providers.contains(&"openai".to_string()));
        assert!(providers.contains(&"anthropic".to_string()));
    }

    /// Test provider registry default provider functionality
    #[tokio::test]
    async fn test_provider_registry_default() {
        let mut registry = ProviderRegistry::new();

        let openai_provider = MockOpenAIProvider::new(Some("test-key".to_string()));
        registry.register("openai".to_string(), Box::new(openai_provider));

        // Test setting default provider
        registry.set_default("openai".to_string()).unwrap();

        let default_provider = registry.get_default().unwrap();
        assert_eq!(default_provider.name(), "openai");

        // Test setting non-existent provider as default
        let result = registry.set_default("nonexistent".to_string());
        assert!(result.is_err());
    }

    /// Test multiple provider types work together
    #[tokio::test]
    async fn test_multiple_provider_types() {
        let mut registry = ProviderRegistry::new();

        // Register multiple providers
        let openai = MockOpenAIProvider::new(Some("openai-key".to_string()));
        let anthropic = MockAnthropicProvider::new(Some("anthropic-key".to_string()));
        let ollama = MockOllamaProvider::new(Some("http://localhost:11434".to_string()));

        registry.register("openai".to_string(), Box::new(openai));
        registry.register("anthropic".to_string(), Box::new(anthropic));
        registry.register("ollama".to_string(), Box::new(ollama));

        // Test each provider works
        let openai_provider = registry.get("openai").unwrap();
        let anthropic_provider = registry.get("anthropic").unwrap();
        let ollama_provider = registry.get("ollama").unwrap();

        assert_eq!(openai_provider.display_name(), "OpenAI");
        assert_eq!(anthropic_provider.display_name(), "Anthropic");
        assert_eq!(ollama_provider.display_name(), "Ollama");

        // Test they all support streaming
        assert!(openai_provider.supports_streaming());
        assert!(anthropic_provider.supports_streaming());
        assert!(ollama_provider.supports_streaming());
    }

    /// Test provider configuration validation
    #[tokio::test]
    async fn test_provider_config_validation() {
        // Test OpenAI without API key
        let openai_no_key = MockOpenAIProvider::new(None);
        let validation_result = openai_no_key.validate_config().await;
        assert!(validation_result.is_err());

        // Test OpenAI with API key
        let openai_with_key = MockOpenAIProvider::new(Some("test-key".to_string()));
        let validation_result = openai_with_key.validate_config().await;
        assert!(validation_result.is_ok());

        // Test Anthropic without API key
        let anthropic_no_key = MockAnthropicProvider::new(None);
        let validation_result = anthropic_no_key.validate_config().await;
        assert!(validation_result.is_err());

        // Test Ollama (doesn't require API key)
        let ollama = MockOllamaProvider::new(None);
        let validation_result = ollama.validate_config().await;
        assert!(validation_result.is_ok());
    }

    /// Test provider error handling for invalid models
    #[tokio::test]
    async fn test_provider_invalid_model_error() {
        let provider = MockOpenAIProvider::new(Some("test-key".to_string()));

        let req = CompletionRequest::new(vec![Message { role: "user".into(), content: "Hello".into() }], "invalid-model");
        let result = provider.complete(&req).await;
        assert!(result.is_err());

        if let Err(CodexErr::ConfigurationError(msg)) = result {
            assert!(msg.contains("Model 'invalid-model' not available"));
        } else {
            panic!("Expected ConfigurationError for invalid model");
        }
    }

    /// Test provider error handling for missing authentication
    #[tokio::test]
    async fn test_provider_missing_auth_error() {
        let provider = MockOpenAIProvider::new(None);

        let req = CompletionRequest::new(vec![Message { role: "user".into(), content: "Hello".into() }], "gpt-4");
        let result = provider.complete(&req).await;
        assert!(result.is_err());

        if let Err(CodexErr::ConfigurationError(msg)) = result {
            assert!(msg.contains("API key not provided"));
        } else {
            panic!("Expected ConfigurationError for missing API key");
        }
    }

    /// Test provider model availability across different providers
    #[tokio::test]
    async fn test_provider_model_availability() {
        let openai = MockOpenAIProvider::new(Some("key".to_string()));
        let anthropic = MockAnthropicProvider::new(Some("key".to_string()));
        let ollama = MockOllamaProvider::new(None);

        let openai_models = openai.available_models().await.unwrap();
        let anthropic_models = anthropic.available_models().await.unwrap();
        let ollama_models = ollama.available_models().await.unwrap();

        // Each provider should have different models
        assert!(openai_models.contains(&"gpt-4".to_string()));
        assert!(!openai_models.contains(&"claude-3-opus".to_string()));

        assert!(anthropic_models.contains(&"claude-3-opus".to_string()));
        assert!(!anthropic_models.contains(&"gpt-4".to_string()));

        assert!(ollama_models.contains(&"llama2".to_string()));
        assert!(!ollama_models.contains(&"gpt-4".to_string()));
    }

    /// Test provider response format consistency
    #[tokio::test]
    async fn test_provider_response_consistency() {
        let openai = MockOpenAIProvider::new(Some("key".to_string()));
        let anthropic = MockAnthropicProvider::new(Some("key".to_string()));
        let ollama = MockOllamaProvider::new(None);

        let req_openai = CompletionRequest::new(vec![Message { role: "user".into(), content: "Test message".into() }], "gpt-4");
        let req_anthropic = CompletionRequest::new(vec![Message { role: "user".into(), content: "Test message".into() }], "claude-3-opus");
        let req_ollama = CompletionRequest::new(vec![Message { role: "user".into(), content: "Test message".into() }], "llama2");
        let openai_response = openai.complete(&req_openai).await.unwrap();
        let anthropic_response = anthropic.complete(&req_anthropic).await.unwrap();
        let ollama_response = ollama.complete(&req_ollama).await.unwrap();

        // All responses should have the same structure
        assert!(!openai_response.content.is_empty());
        assert!(!anthropic_response.content.is_empty());
        assert!(!ollama_response.content.is_empty());

        assert!(openai_response.usage.total_tokens > 0);
        assert!(anthropic_response.usage.total_tokens > 0);
        assert!(ollama_response.usage.total_tokens > 0);

        assert_eq!(openai_response.model, "gpt-4");
        assert_eq!(anthropic_response.model, "claude-3-opus");
        assert_eq!(ollama_response.model, "llama2");
    }
}
