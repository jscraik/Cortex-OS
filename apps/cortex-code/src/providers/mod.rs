use crate::config::Config;
use crate::error::{ProviderError, Result};
use async_trait::async_trait;
use futures::Stream;
use std::pin::Pin;

pub mod github;
pub mod openai;
pub mod anthropic;
pub mod local;
pub mod ollama;

pub use github::GitHubModelsProvider;
pub use openai::OpenAIProvider;
pub use anthropic::AnthropicProvider;
pub use local::LocalMLXProvider;
pub use ollama::OllamaProvider;

/// Response stream type for streaming completions
pub type ResponseStream = Pin<Box<dyn Stream<Item = Result<String>> + Send>>;

/// Optional usage statistics for a request/response cycle
#[derive(Debug, Clone, Default)]
pub struct UsageStats {
    pub tokens_used: Option<u32>,
    pub context_window: Option<u32>,
}

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

    /// Optional: return usage stats from the most recent request, if available
    fn usage_stats(&self) -> Option<UsageStats> {
        None
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
        "mlx" => {
            // Check if a specific model is requested via environment variable
            if let Ok(model_name) = std::env::var("CORTEX_MODEL") {
                // Try to find the model in external inventory
                if let Ok(inventory_content) = std::fs::read_to_string("/Users/jamiecraik/.Cortex-OS/data/external-ssd-model-inventory.json") {
                    if let Ok(inventory) = serde_json::from_str::<serde_json::Value>(&inventory_content) {
                        if let Some(mlx_models) = inventory["mlx"].as_array() {
                            for model in mlx_models {
                                if let Some(name) = model["name"].as_str() {
                                    if name == model_name {
                                        if let Some(path) = model["path"].as_str() {
                                            tracing::info!("Using external MLX model: {} at {}", name, path);
                                            return Ok(Box::new(LocalMLXProvider::with_model_path(path.to_string(), name.to_string())?));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Ok(Box::new(LocalMLXProvider::new()?))
        }
        "ollama" => {
            // Check if a specific model is requested via environment variable
            let model_name = std::env::var("CORTEX_MODEL")
                .unwrap_or_else(|_| "deepseek-coder:6.7b".to_string());

            let provider_config = config.get_provider_config("ollama");
            let base_url = provider_config
                .and_then(|c| c.base_url.clone())
                .unwrap_or_else(|| "http://localhost:11434".to_string());

            Ok(Box::new(OllamaProvider::new(base_url, model_name)?))
        }

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
