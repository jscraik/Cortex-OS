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
    // Try primary provider first
    if let Ok(provider) = create_specific_provider(config, &config.provider.default) {
        return Ok(provider);
    }
    
    // Try fallback providers
    for fallback in &config.provider.fallback {
        if let Ok(provider) = create_specific_provider(config, fallback) {
            tracing::warn!("Primary provider '{}' failed, using fallback '{}'", 
                          config.provider.default, fallback);
            return Ok(provider);
        }
    }
    
    Err(ProviderError::UnknownProvider(config.provider.default.clone()).into())
}

fn create_specific_provider(config: &Config, provider_name: &str) -> Result<Box<dyn ModelProvider>> {
    match provider_name {
        "github-models" => Ok(Box::new(GitHubModelsProvider::new(&config.github_models)?)),
        "openai" => {
            let openai_config = config.openai.as_ref()
                .ok_or_else(|| ProviderError::NotConfigured("openai".to_string()))?;
            Ok(Box::new(OpenAIProvider::new(openai_config)?))
        }
        "anthropic" => {
            let anthropic_config = config.anthropic.as_ref()
                .ok_or_else(|| ProviderError::NotConfigured("anthropic".to_string()))?;
            Ok(Box::new(AnthropicProvider::new(anthropic_config)?))
        }
        "local-mlx" => Ok(Box::new(LocalMLXProvider::new()?)),
        _ => Err(ProviderError::UnknownProvider(provider_name.to_string()).into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Config, OpenAIConfig};
    
    #[test]
    fn test_create_provider_unknown() {
        let mut config = Config::default();
        config.provider.default = "unknown".to_string();
        
        let result = create_provider(&config);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_create_provider_github_models() {
        let config = Config::default(); // default is github-models
        let result = create_provider(&config);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().provider_name(), "github-models");
    }
}