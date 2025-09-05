//! Mock provider implementations for testing
//!
//! This module contains mock implementations of AI model providers that can be
//! used for testing and development without requiring actual API keys or
//! network connectivity.

use super::traits::{
    BoxStream, CompletionRequest, CompletionResponse, ModelProvider, StreamResult, Usage,
    response_to_stream,
};
use crate::error::{CodexErr, Result};
use async_trait::async_trait;

/// Mock OpenAI provider for testing
pub struct MockOpenAIProvider {
    name: String,
    api_key: Option<String>,
    // Base URL retained for potential future test customization; suppress dead_code warning.
    #[allow(dead_code)]
    base_url: String,
    available_models: Vec<String>,
}

impl MockOpenAIProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            name: "openai".to_string(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
            available_models: vec![
                "gpt-4".to_string(),
                "gpt-4-turbo".to_string(),
                "gpt-3.5-turbo".to_string(),
            ],
        }
    }
}

#[async_trait]
impl ModelProvider for MockOpenAIProvider {
    fn name(&self) -> &str {
        &self.name
    }

    fn display_name(&self) -> &str {
        "OpenAI"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        Ok(self.available_models.clone())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        if self.api_key.is_none() {
            return Err(CodexErr::ConfigurationError(
                "OpenAI API key not provided".to_string(),
            ));
        }

        if !self.available_models.contains(&req.model) {
            return Err(CodexErr::ConfigurationError(format!(
                "Model '{}' not available",
                req.model
            )));
        }

        // Mock response based on input
        let content = format!(
            "Mock OpenAI response to: {}",
            req.messages
                .last()
                .map(|m| m.content.as_str())
                .unwrap_or("empty")
        );

        Ok(CompletionResponse {
            content,
            model: req.model.clone(),
            usage: Usage {
                prompt_tokens: 10,
                completion_tokens: 15,
                total_tokens: 25,
            },
            finish_reason: Some("stop".into()),
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        Ok(response_to_stream(self.complete(req).await?))
    }

    async fn validate_config(&self) -> Result<()> {
        if self.api_key.is_none() {
            return Err(CodexErr::ConfigurationError(
                "OpenAI API key required".to_string(),
            ));
        }
        // In real implementation, would make a test request to the API
        Ok(())
    }
}

/// Mock Anthropic provider for testing
pub struct MockAnthropicProvider {
    name: String,
    api_key: Option<String>,
    available_models: Vec<String>,
}

impl MockAnthropicProvider {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            name: "anthropic".to_string(),
            api_key,
            available_models: vec![
                "claude-3-opus".to_string(),
                "claude-3-sonnet".to_string(),
                "claude-3-haiku".to_string(),
            ],
        }
    }
}

#[async_trait]
impl ModelProvider for MockAnthropicProvider {
    fn name(&self) -> &str {
        &self.name
    }

    fn display_name(&self) -> &str {
        "Anthropic"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        Ok(self.available_models.clone())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        if self.api_key.is_none() {
            return Err(CodexErr::ConfigurationError(
                "Anthropic API key not provided".to_string(),
            ));
        }

        if !self.available_models.contains(&req.model) {
            return Err(CodexErr::ConfigurationError(format!(
                "Model '{}' not available",
                req.model
            )));
        }

        let content = format!(
            "Mock Claude response to: {}",
            req.messages
                .last()
                .map(|m| m.content.as_str())
                .unwrap_or("empty")
        );

        Ok(CompletionResponse {
            content,
            model: req.model.clone(),
            usage: Usage {
                prompt_tokens: 12,
                completion_tokens: 18,
                total_tokens: 30,
            },
            finish_reason: Some("stop".into()),
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        Ok(response_to_stream(self.complete(req).await?))
    }

    async fn validate_config(&self) -> Result<()> {
        if self.api_key.is_none() {
            return Err(CodexErr::ConfigurationError(
                "Anthropic API key required".to_string(),
            ));
        }
        Ok(())
    }
}

/// Mock Ollama provider for testing
pub struct MockOllamaProvider {
    name: String,
    // Base URL retained for parity with real implementation.
    #[allow(dead_code)]
    base_url: String,
    available_models: Vec<String>,
}

impl MockOllamaProvider {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            name: "ollama".to_string(),
            base_url: base_url.unwrap_or_else(|| "http://localhost:11434".to_string()),
            available_models: vec![
                "llama2".to_string(),
                "codellama".to_string(),
                "mistral".to_string(),
            ],
        }
    }
}

#[async_trait]
impl ModelProvider for MockOllamaProvider {
    fn name(&self) -> &str {
        &self.name
    }

    fn display_name(&self) -> &str {
        "Ollama"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        Ok(self.available_models.clone())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        if !self.available_models.contains(&req.model) {
            return Err(CodexErr::ConfigurationError(format!(
                "Model '{}' not available",
                req.model
            )));
        }

        let content = format!(
            "Mock Ollama response to: {}",
            req.messages
                .last()
                .map(|m| m.content.as_str())
                .unwrap_or("empty")
        );

        Ok(CompletionResponse {
            content,
            model: req.model.clone(),
            usage: Usage {
                prompt_tokens: 8,
                completion_tokens: 12,
                total_tokens: 20,
            },
            finish_reason: Some("stop".into()),
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        Ok(response_to_stream(self.complete(req).await?))
    }

    async fn validate_config(&self) -> Result<()> {
        // In real implementation, would check if Ollama server is running
        Ok(())
    }
}
