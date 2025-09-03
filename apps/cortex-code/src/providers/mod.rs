use crate::config::Config;
use crate::error::{ProviderError, Result};
use async_trait::async_trait;
use futures::Stream;
use std::pin::Pin;

pub mod github;
pub mod openai;
pub mod anthropic;
pub mod local;

pub use github::GitHubModelsProvider;
pub use openai::OpenAIProvider;
pub use anthropic::AnthropicProvider;
pub use local::LocalMLXProvider;

/// Response stream type for streaming completions
pub type ResponseStream = Pin<Box<dyn Stream<Item = Result<String>> + Send>>;

/// Core trait for all model providers
#[async_trait]
pub trait ModelProvider: Send + Sync {
    /// Get the provider name
    fn provider_name(&self) -> &str;

    /// Complete a single prompt (non-streaming)
    async fn complete(&self, prompt: &str) -> Result<String>;

    /// Stream completion chunks
    async fn stream(&self, prompt: &str) -> Result<ResponseStream>;

    /// Check if the provider is healthy/available
    async fn health_check(&self) -> Result<bool> {
        // Default implementation - try a simple completion
        match self.complete("ping").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Get supported models
    fn supported_models(&self) -> Vec<String> {
        vec![] // Default implementation
    }
}

/// Factory function to create providers based on config
pub fn create_provider(config: &Config) -> Result<Box<dyn ModelProvider>> {
    let default_provider = config.get_default_provider();

    // Try primary provider first
    if let Ok(provider) = create_specific_provider(config, default_provider) {
        return Ok(provider);
    }

    // Try fallback providers
    for fallback in config.get_fallback_providers() {
        if let Ok(provider) = create_specific_provider(config, fallback) {
            tracing::warn!("Primary provider '{}' failed, using fallback '{}'",
                          default_provider, fallback);
            return Ok(provider);
        }
    }

    Err(ProviderError::UnknownProvider(default_provider.to_string()).into())
}

fn create_specific_provider(config: &Config, provider_name: &str) -> Result<Box<dyn ModelProvider>> {
    match provider_name {
        // Provider names from cortex.json
        "github" => {
            let provider_config = config.get_provider_config("github")
                .ok_or_else(|| ProviderError::NotConfigured("github".to_string()))?;

            let github_config = crate::config::GitHubModelsConfig {
                model: "gpt-4o-mini".to_string(),
                endpoint: provider_config.base_url.clone()
                    .unwrap_or_else(|| "https://models.inference.ai.azure.com".to_string()),
                token: std::env::var("GITHUB_TOKEN").ok(),
            };
            Ok(Box::new(GitHubModelsProvider::new(&github_config)?))
        }
        "openai" => {
            let api_key = std::env::var("OPENAI_API_KEY")
                .map_err(|_| ProviderError::NotConfigured("OPENAI_API_KEY not set".to_string()))?;

            let provider_config = config.get_provider_config("openai");
            let openai_config = crate::config::OpenAIConfig {
                api_key,
                model: "gpt-4o-mini".to_string(),
                endpoint: provider_config.and_then(|c| c.base_url.clone()),
            };
            Ok(Box::new(OpenAIProvider::new(&openai_config)?))
        }
        "anthropic" => {
            let api_key = std::env::var("ANTHROPIC_API_KEY")
                .map_err(|_| ProviderError::NotConfigured("ANTHROPIC_API_KEY not set".to_string()))?;

            let anthropic_config = crate::config::AnthropicConfig {
                api_key,
                model: "claude-3-haiku-20240307".to_string(),
            };
            Ok(Box::new(AnthropicProvider::new(&anthropic_config)?))
        }
        "mlx" => Ok(Box::new(LocalMLXProvider::new()?)),

        _ => Err(ProviderError::UnknownProvider(provider_name.to_string()).into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;

    #[test]
    fn test_create_provider_unknown() {
    let mut config = Config::default();
    config.providers.default = "unknown".to_string();
    // Ensure we don't fall back for this test
    config.providers.fallback.clear();

        let result = create_provider(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_provider_github_models() {
    // Provide a fake token so provider creation does not fall back
    std::env::set_var("GITHUB_TOKEN", "test-token");
    let config = Config::default(); // default is github
    let result = create_provider(&config);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().provider_name(), "github");
    std::env::remove_var("GITHUB_TOKEN");
    }
}
