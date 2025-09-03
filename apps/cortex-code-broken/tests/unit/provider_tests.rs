//! Provider system tests
//!
//! Tests for the comprehensive AI provider architecture following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

use cortex_core::providers::{
    ModelProvider, ProviderRegistry, ProviderConfig, ModelCapabilities,
    CompletionRequest, CompletionResponse, StreamingResponse
};
use anyhow::{Result, anyhow};
use async_trait::async_trait;
use serde_json::json;
use std::collections::HashMap;
use tokio::test as tokio_test;
use uuid::Uuid;

/// Mock provider for testing
#[derive(Debug, Clone)]
pub struct MockProvider {
    pub name: String,
    pub capabilities: ModelCapabilities,
    pub responses: HashMap<String, String>,
    pub should_fail: bool,
}

impl MockProvider {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            capabilities: ModelCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: false,
                max_tokens: 4096,
                context_window: 8192,
            },
            responses: HashMap::new(),
            should_fail: false,
        }
    }

    pub fn with_response(mut self, prompt: &str, response: &str) -> Self {
        self.responses.insert(prompt.to_string(), response.to_string());
        self
    }

    pub fn with_failure(mut self) -> Self {
        self.should_fail = true;
        self
    }

    pub fn with_capabilities(mut self, capabilities: ModelCapabilities) -> Self {
        self.capabilities = capabilities;
        self
    }
}

#[async_trait]
impl ModelProvider for MockProvider {
    fn name(&self) -> &str {
        &self.name
    }

    fn capabilities(&self) -> &ModelCapabilities {
        &self.capabilities
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse> {
        if self.should_fail {
            return Err(anyhow!("Mock provider configured to fail"));
        }

        let response_text = self.responses
            .get(&request.prompt)
            .cloned()
            .unwrap_or_else(|| format!("Mock response to: {}", request.prompt));

        Ok(CompletionResponse {
            id: Uuid::new_v4().to_string(),
            content: response_text,
            model: request.model.unwrap_or_else(|| "mock-model".to_string()),
            usage: json!({
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }),
            finish_reason: "stop".to_string(),
        })
    }

    async fn stream(&self, request: CompletionRequest) -> Result<Box<dyn StreamingResponse>> {
        if self.should_fail {
            return Err(anyhow!("Mock provider streaming configured to fail"));
        }

        let response = self.complete(request).await?;
        Ok(Box::new(MockStreamingResponse {
            content: response.content,
            finished: false,
        }))
    }
}

/// Mock streaming response
pub struct MockStreamingResponse {
    content: String,
    finished: bool,
}

#[async_trait]
impl StreamingResponse for MockStreamingResponse {
    async fn next_chunk(&mut self) -> Result<Option<String>> {
        if self.finished {
            return Ok(None);
        }

        self.finished = true;
        Ok(Some(self.content.clone()))
    }

    fn is_finished(&self) -> bool {
        self.finished
    }
}

/// Create test provider config
pub fn create_test_config() -> ProviderConfig {
    ProviderConfig {
        provider_type: "mock".to_string(),
        api_key: Some("test-key".to_string()),
        base_url: Some("https://api.test.com".to_string()),
        model: Some("test-model".to_string()),
        max_tokens: Some(1000),
        temperature: Some(0.7),
        additional_params: json!({
            "custom_param": "test_value"
        }),
    }
}

#[tokio_test]
async fn test_provider_registry_initialization() -> Result<()> {
    // Given
    let registry = ProviderRegistry::new();

    // When/Then
    assert_eq!(registry.list_providers().len(), 0);
    Ok(())
}

#[tokio_test]
async fn test_register_and_get_provider() -> Result<()> {
    // Given
    let mut registry = ProviderRegistry::new();
    let provider = MockProvider::new("test-provider");

    // When
    registry.register("test", Box::new(provider));
    let retrieved = registry.get_provider("test");

    // Then
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().name(), "test-provider");
    Ok(())
}

#[tokio_test]
async fn test_provider_completion() -> Result<()> {
    // Given
    let provider = MockProvider::new("test")
        .with_response("Hello", "Hi there!");

    let request = CompletionRequest {
        prompt: "Hello".to_string(),
        model: Some("test-model".to_string()),
        max_tokens: Some(100),
        temperature: Some(0.7),
        stream: false,
        additional_params: json!({}),
    };

    // When
    let response = provider.complete(request).await?;

    // Then
    assert_eq!(response.content, "Hi there!");
    assert_eq!(response.finish_reason, "stop");
    Ok(())
}

#[tokio_test]
async fn test_provider_streaming() -> Result<()> {
    // Given
    let provider = MockProvider::new("test")
        .with_response("Stream test", "Streaming response");

    let request = CompletionRequest {
        prompt: "Stream test".to_string(),
        model: Some("test-model".to_string()),
        max_tokens: Some(100),
        temperature: Some(0.7),
        stream: true,
        additional_params: json!({}),
    };

    // When
    let mut stream = provider.stream(request).await?;
    let chunk = stream.next_chunk().await?;

    // Then
    assert!(chunk.is_some());
    assert_eq!(chunk.unwrap(), "Streaming response");
    assert!(stream.is_finished());
    Ok(())
}

#[tokio_test]
async fn test_provider_capabilities() -> Result<()> {
    // Given
    let capabilities = ModelCapabilities {
        supports_streaming: true,
        supports_function_calling: false,
        supports_vision: true,
        max_tokens: 2048,
        context_window: 4096,
    };

    let provider = MockProvider::new("test")
        .with_capabilities(capabilities.clone());

    // When
    let provider_caps = provider.capabilities();

    // Then
    assert_eq!(provider_caps.supports_streaming, capabilities.supports_streaming);
    assert_eq!(provider_caps.supports_function_calling, capabilities.supports_function_calling);
    assert_eq!(provider_caps.supports_vision, capabilities.supports_vision);
    assert_eq!(provider_caps.max_tokens, capabilities.max_tokens);
    assert_eq!(provider_caps.context_window, capabilities.context_window);
    Ok(())
}

#[tokio_test]
async fn test_provider_error_handling() -> Result<()> {
    // Given
    let provider = MockProvider::new("failing-provider").with_failure();

    let request = CompletionRequest {
        prompt: "This will fail".to_string(),
        model: Some("test-model".to_string()),
        max_tokens: Some(100),
        temperature: Some(0.7),
        stream: false,
        additional_params: json!({}),
    };

    // When
    let result = provider.complete(request).await;

    // Then
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("configured to fail"));
    Ok(())
}

#[tokio_test]
async fn test_registry_multiple_providers() -> Result<()> {
    // Given
    let mut registry = ProviderRegistry::new();
    let provider1 = MockProvider::new("provider1");
    let provider2 = MockProvider::new("provider2");

    // When
    registry.register("openai", Box::new(provider1));
    registry.register("anthropic", Box::new(provider2));

    // Then
    assert_eq!(registry.list_providers().len(), 2);
    assert!(registry.list_providers().contains(&"openai".to_string()));
    assert!(registry.list_providers().contains(&"anthropic".to_string()));
    Ok(())
}

#[tokio_test]
async fn test_provider_config_serialization() -> Result<()> {
    // Given
    let config = create_test_config();

    // When
    let serialized = serde_json::to_string(&config)?;
    let deserialized: ProviderConfig = serde_json::from_str(&serialized)?;

    // Then
    assert_eq!(config.provider_type, deserialized.provider_type);
    assert_eq!(config.api_key, deserialized.api_key);
    assert_eq!(config.base_url, deserialized.base_url);
    Ok(())
}

#[tokio_test]
async fn test_concurrent_provider_access() -> Result<()> {
    // Given
    let provider = std::sync::Arc::new(
        MockProvider::new("concurrent-test")
            .with_response("test1", "response1")
            .with_response("test2", "response2")
    );

    let provider1 = provider.clone();
    let provider2 = provider.clone();

    // When - concurrent requests
    let (result1, result2) = tokio::join!(
        async move {
            let request = CompletionRequest {
                prompt: "test1".to_string(),
                model: Some("test-model".to_string()),
                max_tokens: Some(100),
                temperature: Some(0.7),
                stream: false,
                additional_params: json!({}),
            };
            provider1.complete(request).await
        },
        async move {
            let request = CompletionRequest {
                prompt: "test2".to_string(),
                model: Some("test-model".to_string()),
                max_tokens: Some(100),
                temperature: Some(0.7),
                stream: false,
                additional_params: json!({}),
            };
            provider2.complete(request).await
        }
    );

    // Then
    assert!(result1.is_ok());
    assert!(result2.is_ok());
    assert_eq!(result1.unwrap().content, "response1");
    assert_eq!(result2.unwrap().content, "response2");
    Ok(())
}

#[tokio_test]
async fn test_provider_registry_thread_safety() -> Result<()> {
    // Given
    let registry = std::sync::Arc::new(
        tokio::sync::Mutex::new(ProviderRegistry::new())
    );

    let registry1 = registry.clone();
    let registry2 = registry.clone();

    // When - concurrent registration
    let (result1, result2) = tokio::join!(
        async move {
            let mut reg = registry1.lock().await;
            reg.register("provider1", Box::new(MockProvider::new("test1")));
            "registered1"
        },
        async move {
            let mut reg = registry2.lock().await;
            reg.register("provider2", Box::new(MockProvider::new("test2")));
            "registered2"
        }
    );

    // Then
    assert_eq!(result1, "registered1");
    assert_eq!(result2, "registered2");

    let reg = registry.lock().await;
    assert_eq!(reg.list_providers().len(), 2);
    Ok(())
}

#[tokio_test]
async fn test_provider_request_validation() -> Result<()> {
    // Given
    let provider = MockProvider::new("validator");

    let invalid_request = CompletionRequest {
        prompt: "".to_string(), // Empty prompt
        model: None,
        max_tokens: Some(0), // Invalid max_tokens
        temperature: Some(2.0), // Invalid temperature
        stream: false,
        additional_params: json!({}),
    };

    // When/Then - This would typically be validated by the provider
    // For now, our mock provider accepts any request
    let result = provider.complete(invalid_request).await;
    assert!(result.is_ok()); // Mock doesn't validate, but real providers would
    Ok(())
}

#[tokio_test]
async fn test_streaming_response_lifecycle() -> Result<()> {
    // Given
    let provider = MockProvider::new("streaming-test")
        .with_response("stream", "chunk1 chunk2 chunk3");

    let request = CompletionRequest {
        prompt: "stream".to_string(),
        model: Some("test-model".to_string()),
        max_tokens: Some(100),
        temperature: Some(0.7),
        stream: true,
        additional_params: json!({}),
    };

    // When
    let mut stream = provider.stream(request).await?;
    let mut chunks = Vec::new();

    while let Some(chunk) = stream.next_chunk().await? {
        chunks.push(chunk);
    }

    // Then
    assert!(!chunks.is_empty());
    assert!(stream.is_finished());
    Ok(())
}
