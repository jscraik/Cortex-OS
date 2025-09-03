//! Enhanced provider management system for Cortex Code
//!
//! This module extends the base ModelProviderInfo system with comprehensive
//! support for all major AI providers including OpenAI, Anthropic, Google,
//! Cohere, Mistral, GitHub Models, Ollama, and Local MLX.

pub mod registry;
pub mod factory;
pub mod client;
pub mod capabilities;
pub mod feature_toggles;

pub use registry::*;
pub use factory::*;
pub use client::*;
pub use capabilities::*;
pub use feature_toggles::*;

use crate::ModelProviderInfo;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Enhanced provider configuration extending ModelProviderInfo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedProviderConfig {
    pub base_provider: ModelProviderInfo,
    pub capabilities: ProviderCapabilities,
    pub feature_flags: ProviderFeatures,
    pub safety_config: SafetyConfig,
    pub rate_limits: RateLimitConfig,
    pub model_mappings: HashMap<String, ModelConfig>,
}

/// Provider-specific capabilities and features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub supports_streaming: bool,
    pub supports_function_calling: bool,
    pub supports_vision: bool,
    pub supports_code_generation: bool,
    pub supports_reasoning: bool,
    pub max_context_length: usize,
    pub max_output_tokens: usize,
    pub supported_languages: Vec<String>,
    pub specialized_models: HashMap<String, String>, // task -> model_id
}

/// Feature flags for provider functionality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderFeatures {
    pub enable_background_processing: bool,
    pub enable_context_caching: bool,
    pub enable_response_validation: bool,
    pub enable_cost_tracking: bool,
    pub enable_quality_metrics: bool,
    pub enable_fallback_provider: bool,
    pub fallback_provider_id: Option<String>,
}

/// Safety and moderation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyConfig {
    pub enable_content_filtering: bool,
    pub enable_code_safety_checks: bool,
    pub enable_prompt_injection_detection: bool,
    pub safety_threshold: f32,
    pub blocked_patterns: Vec<String>,
    pub allowed_domains: Vec<String>,
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub tokens_per_minute: u32,
    pub concurrent_requests: u32,
    pub burst_allowance: u32,
    pub backoff_strategy: BackoffStrategy,
}

/// Model-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub model_id: String,
    pub display_name: String,
    pub context_length: usize,
    pub output_tokens: usize,
    pub cost_per_token: Option<f64>,
    pub specialized_for: Vec<String>, // e.g., ["code", "reasoning", "vision"]
    pub parameters: HashMap<String, serde_json::Value>,
}

/// Backoff strategy for rate limiting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackoffStrategy {
    Linear { increment_ms: u64 },
    Exponential { base_ms: u64, multiplier: f64 },
    Fixed { delay_ms: u64 },
}

impl Default for ProviderCapabilities {
    fn default() -> Self {
        Self {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: false,
            supports_code_generation: true,
            supports_reasoning: false,
            max_context_length: 8192,
            max_output_tokens: 4096,
            supported_languages: vec![
                "rust".to_string(),
                "python".to_string(),
                "javascript".to_string(),
                "typescript".to_string(),
                "go".to_string(),
                "java".to_string(),
            ],
            specialized_models: HashMap::new(),
        }
    }
}

impl Default for ProviderFeatures {
    fn default() -> Self {
        Self {
            enable_background_processing: true,
            enable_context_caching: true,
            enable_response_validation: true,
            enable_cost_tracking: false,
            enable_quality_metrics: false,
            enable_fallback_provider: false,
            fallback_provider_id: None,
        }
    }
}

impl Default for SafetyConfig {
    fn default() -> Self {
        Self {
            enable_content_filtering: true,
            enable_code_safety_checks: true,
            enable_prompt_injection_detection: true,
            safety_threshold: 0.8,
            blocked_patterns: vec![
                "rm -rf".to_string(),
                "sudo rm".to_string(),
                "format c:".to_string(),
            ],
            allowed_domains: vec![
                "github.com".to_string(),
                "stackoverflow.com".to_string(),
                "docs.rs".to_string(),
            ],
        }
    }
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 60,
            tokens_per_minute: 100000,
            concurrent_requests: 5,
            burst_allowance: 10,
            backoff_strategy: BackoffStrategy::Exponential {
                base_ms: 1000,
                multiplier: 2.0,
            },
        }
    }
}

impl Default for BackoffStrategy {
    fn default() -> Self {
        Self::Exponential {
            base_ms: 1000,
            multiplier: 2.0,
        }
    }
}

/// Provider identification and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderId {
    pub id: String,
    pub name: String,
    pub version: String,
    pub vendor: String,
    pub category: ProviderCategory,
}

/// Provider categories for organization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProviderCategory {
    Commercial,    // OpenAI, Anthropic, Google, etc.
    OpenSource,    // Ollama, local models
    Specialized,   // GitHub Models, domain-specific
    Local,         // MLX, local inference
    Experimental,  // Beta providers
}

/// Provider status and health information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub available: bool,
    pub healthy: bool,
    pub last_check: std::time::SystemTime,
    pub error_count: u32,
    pub response_time_ms: Option<u64>,
    pub active_connections: u32,
}

/// Unified provider interface
pub trait Provider: Send + Sync {
    fn id(&self) -> &ProviderId;
    fn config(&self) -> &EnhancedProviderConfig;
    fn status(&self) -> &ProviderStatus;

    async fn health_check(&self) -> crate::Result<bool>;
    async fn get_models(&self) -> crate::Result<Vec<ModelConfig>>;
    async fn validate_request(&self, request: &serde_json::Value) -> crate::Result<bool>;
    async fn estimate_cost(&self, tokens: u32) -> crate::Result<f64>;
}

/// Provider statistics and metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMetrics {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub average_response_time: f64,
    pub uptime_percentage: f64,
    pub last_reset: std::time::SystemTime,
}

impl Default for ProviderMetrics {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            total_tokens: 0,
            total_cost: 0.0,
            average_response_time: 0.0,
            uptime_percentage: 100.0,
            last_reset: std::time::SystemTime::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::Result;
    use std::sync::Arc;

    /// Mock provider for testing
    struct MockProvider {
        name: String,
        models: Vec<String>,
        should_fail: bool,
    }

    #[async_trait::async_trait]
    impl ModelProvider for MockProvider {
        fn provider_name(&self) -> &str {
            &self.name
        }

        fn supported_models(&self) -> Vec<String> {
            self.models.clone()
        }

        async fn complete(&self, _prompt: &str) -> Result<String> {
            if self.should_fail {
                anyhow::bail!("Mock provider failure")
            }
            Ok("Mock completion response".to_string())
        }

        async fn stream(&self, _prompt: &str) -> Result<ResponseStream> {
            anyhow::bail!("Stream not implemented for mock provider")
        }

        async fn health_check(&self) -> Result<bool> {
            Ok(!self.should_fail)
        }
    }

    fn create_test_registry() -> ProviderRegistry {
        let mut registry = ProviderRegistry::new();

        // Add mock providers
        registry.register_provider(
            "mock-openai",
            Arc::new(MockProvider {
                name: "mock-openai".to_string(),
                models: vec!["gpt-4".to_string(), "gpt-3.5-turbo".to_string()],
                should_fail: false,
            })
        );

        registry.register_provider(
            "mock-anthropic",
            Arc::new(MockProvider {
                name: "mock-anthropic".to_string(),
                models: vec!["claude-3-sonnet".to_string(), "claude-3-haiku".to_string()],
                should_fail: false,
            })
        );

        registry.register_provider(
            "mock-failing",
            Arc::new(MockProvider {
                name: "mock-failing".to_string(),
                models: vec!["failing-model".to_string()],
                should_fail: true,
            })
        );

        registry
    }

    #[test]
    fn test_provider_registry_creation() {
        let registry = ProviderRegistry::new();
        assert!(registry.list_providers().is_empty());
    }

    #[test]
    fn test_provider_registration() {
        let registry = create_test_registry();
        let providers = registry.list_providers();

        assert_eq!(providers.len(), 3);
        assert!(providers.contains(&"mock-openai".to_string()));
        assert!(providers.contains(&"mock-anthropic".to_string()));
        assert!(providers.contains(&"mock-failing".to_string()));
    }

    #[tokio::test]
    async fn test_provider_completion() {
        let registry = create_test_registry();
        let provider = registry.get_provider("mock-openai").unwrap();

        let response = provider.complete("Hello, world!").await;
        assert!(response.is_ok());
        assert_eq!(response.unwrap(), "Mock completion response");
    }

    #[tokio::test]
    async fn test_provider_health_check() {
        let registry = create_test_registry();

        // Healthy provider
        let healthy_provider = registry.get_provider("mock-openai").unwrap();
        let health = healthy_provider.health_check().await;
        assert!(health.is_ok());
        assert!(health.unwrap());

        // Failing provider
        let failing_provider = registry.get_provider("mock-failing").unwrap();
        let failing_health = failing_provider.health_check().await;
        assert!(failing_health.is_ok());
        assert!(!failing_health.unwrap());
    }
}
