use super::*;
use crate::ModelProviderInfo;
use std::collections::HashMap;

/// Comprehensive registry of all supported AI providers
/// Extends the base provider system with enhanced configurations
pub struct ProviderRegistry {
    providers: HashMap<String, EnhancedProviderConfig>,
    feature_flags: GlobalFeatureFlags,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalFeatureFlags {
    pub enable_all_providers: bool,
    pub enable_experimental: bool,
    pub enable_local_inference: bool,
    pub enable_cost_optimization: bool,
    pub enable_fallback_chains: bool,
    pub default_provider: String,
}

impl Default for GlobalFeatureFlags {
    fn default() -> Self {
        Self {
            enable_all_providers: true,
            enable_experimental: false,
            enable_local_inference: true,
            enable_cost_optimization: true,
            enable_fallback_chains: true,
            default_provider: "openai".to_string(),
        }
    }
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            providers: HashMap::new(),
            feature_flags: GlobalFeatureFlags::default(),
        };

        registry.register_built_in_providers();
        registry
    }

    pub fn with_feature_flags(mut self, flags: GlobalFeatureFlags) -> Self {
        self.feature_flags = flags;
        self
    }

    /// Register all built-in provider configurations
    fn register_built_in_providers(&mut self) {
        // OpenAI - Most comprehensive provider
        self.providers.insert("openai".to_string(), self.create_openai_config());

        // Anthropic - Strong reasoning capabilities
        self.providers.insert("anthropic".to_string(), self.create_anthropic_config());

        // Google - Gemini models with multimodal capabilities
        self.providers.insert("google".to_string(), self.create_google_config());

        // Cohere - Enterprise-focused with strong embeddings
        self.providers.insert("cohere".to_string(), self.create_cohere_config());

        // Mistral - European alternative with strong coding
        self.providers.insert("mistral".to_string(), self.create_mistral_config());

        // GitHub Models - Free tier with model variety
        self.providers.insert("github".to_string(), self.create_github_config());

        // Ollama - Local open source models
        self.providers.insert("ollama".to_string(), self.create_ollama_config());

        // Local MLX - Apple Silicon optimized
        self.providers.insert("mlx".to_string(), self.create_mlx_config());
    }

    fn create_openai_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "OpenAI".to_string(),
                base_url: std::env::var("OPENAI_BASE_URL")
                    .ok()
                    .filter(|v| !v.trim().is_empty()),
                env_key: Some("OPENAI_API_KEY".to_string()),
                env_key_instructions: Some("Get your API key from https://platform.openai.com/api-keys".to_string()),
                wire_api: crate::model_provider_info::WireApi::Responses,
                query_params: None,
                http_headers: Some([
                    ("version".to_string(), env!("CARGO_PKG_VERSION").to_string()),
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: Some([
                    ("OpenAI-Organization".to_string(), "OPENAI_ORGANIZATION".to_string()),
                    ("OpenAI-Project".to_string(), "OPENAI_PROJECT".to_string()),
                ].into_iter().collect()),
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: true,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: true,
                supports_code_generation: true,
                supports_reasoning: true,
                max_context_length: 128000,
                max_output_tokens: 4096,
                supported_languages: vec![
                    "rust".to_string(), "python".to_string(), "javascript".to_string(),
                    "typescript".to_string(), "go".to_string(), "java".to_string(),
                    "cpp".to_string(), "c".to_string(), "csharp".to_string(),
                    "ruby".to_string(), "php".to_string(), "swift".to_string(),
                    "kotlin".to_string(), "scala".to_string(), "haskell".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "gpt-4o".to_string()),
                    ("reasoning".to_string(), "o1-preview".to_string()),
                    ("vision".to_string(), "gpt-4o".to_string()),
                    ("fast".to_string(), "gpt-4o-mini".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures {
                enable_background_processing: true,
                enable_context_caching: true,
                enable_response_validation: true,
                enable_cost_tracking: true,
                enable_quality_metrics: true,
                enable_fallback_provider: true,
                fallback_provider_id: Some("anthropic".to_string()),
            },
            safety_config: SafetyConfig::default(),
            rate_limits: RateLimitConfig {
                requests_per_minute: 500,
                tokens_per_minute: 200000,
                concurrent_requests: 10,
                burst_allowance: 20,
                backoff_strategy: BackoffStrategy::Exponential { base_ms: 1000, multiplier: 2.0 },
            },
            model_mappings: [
                ("gpt-4o".to_string(), ModelConfig {
                    model_id: "gpt-4o".to_string(),
                    display_name: "GPT-4o".to_string(),
                    context_length: 128000,
                    output_tokens: 4096,
                    cost_per_token: Some(0.00005),
                    specialized_for: vec!["code".to_string(), "vision".to_string(), "general".to_string()],
                    parameters: [("temperature".to_string(), serde_json::json!(0.1))].into_iter().collect(),
                }),
                ("o1-preview".to_string(), ModelConfig {
                    model_id: "o1-preview".to_string(),
                    display_name: "o1 Preview".to_string(),
                    context_length: 128000,
                    output_tokens: 32768,
                    cost_per_token: Some(0.00015),
                    specialized_for: vec!["reasoning".to_string(), "complex_problems".to_string()],
                    parameters: HashMap::new(),
                }),
                ("gpt-4o-mini".to_string(), ModelConfig {
                    model_id: "gpt-4o-mini".to_string(),
                    display_name: "GPT-4o Mini".to_string(),
                    context_length: 128000,
                    output_tokens: 16384,
                    cost_per_token: Some(0.000001),
                    specialized_for: vec!["fast".to_string(), "simple_tasks".to_string()],
                    parameters: [("temperature".to_string(), serde_json::json!(0.2))].into_iter().collect(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_anthropic_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "Anthropic".to_string(),
                base_url: Some("https://api.anthropic.com/v1".to_string()),
                env_key: Some("ANTHROPIC_API_KEY".to_string()),
                env_key_instructions: Some("Get your API key from https://console.anthropic.com/".to_string()),
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("anthropic-version".to_string(), "2023-06-01".to_string()),
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: true,
                supports_code_generation: true,
                supports_reasoning: true,
                max_context_length: 200000,
                max_output_tokens: 8192,
                supported_languages: vec![
                    "rust".to_string(), "python".to_string(), "javascript".to_string(),
                    "typescript".to_string(), "go".to_string(), "java".to_string(),
                    "cpp".to_string(), "c".to_string(), "csharp".to_string(),
                ],
                specialized_models: [
                    ("reasoning".to_string(), "claude-3-5-sonnet-20241022".to_string()),
                    ("code".to_string(), "claude-3-5-sonnet-20241022".to_string()),
                    ("vision".to_string(), "claude-3-5-sonnet-20241022".to_string()),
                    ("fast".to_string(), "claude-3-5-haiku-20241022".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures {
                enable_fallback_provider: true,
                fallback_provider_id: Some("openai".to_string()),
                ..Default::default()
            },
            safety_config: SafetyConfig {
                enable_content_filtering: true,
                safety_threshold: 0.9, // Anthropic has strong safety
                ..Default::default()
            },
            rate_limits: RateLimitConfig {
                requests_per_minute: 400,
                tokens_per_minute: 180000,
                concurrent_requests: 8,
                ..Default::default()
            },
            model_mappings: [
                ("claude-3-5-sonnet-20241022".to_string(), ModelConfig {
                    model_id: "claude-3-5-sonnet-20241022".to_string(),
                    display_name: "Claude 3.5 Sonnet".to_string(),
                    context_length: 200000,
                    output_tokens: 8192,
                    cost_per_token: Some(0.000003),
                    specialized_for: vec!["reasoning".to_string(), "code".to_string(), "analysis".to_string()],
                    parameters: HashMap::new(),
                }),
                ("claude-3-5-haiku-20241022".to_string(), ModelConfig {
                    model_id: "claude-3-5-haiku-20241022".to_string(),
                    display_name: "Claude 3.5 Haiku".to_string(),
                    context_length: 200000,
                    output_tokens: 8192,
                    cost_per_token: Some(0.000001),
                    specialized_for: vec!["fast".to_string(), "simple_tasks".to_string()],
                    parameters: HashMap::new(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_google_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "Google Gemini".to_string(),
                base_url: Some("https://generativelanguage.googleapis.com/v1beta".to_string()),
                env_key: Some("GOOGLE_API_KEY".to_string()),
                env_key_instructions: Some("Get your API key from https://makersuite.google.com/app/apikey".to_string()),
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: true,
                supports_code_generation: true,
                supports_reasoning: true,
                max_context_length: 1000000, // Gemini 1.5 Pro
                max_output_tokens: 8192,
                supported_languages: vec![
                    "rust".to_string(), "python".to_string(), "javascript".to_string(),
                    "typescript".to_string(), "go".to_string(), "java".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "gemini-1.5-pro".to_string()),
                    ("vision".to_string(), "gemini-1.5-pro".to_string()),
                    ("fast".to_string(), "gemini-1.5-flash".to_string()),
                    ("experimental".to_string(), "gemini-2.0-flash-exp".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures::default(),
            safety_config: SafetyConfig::default(),
            rate_limits: RateLimitConfig {
                requests_per_minute: 300,
                tokens_per_minute: 150000,
                concurrent_requests: 6,
                ..Default::default()
            },
            model_mappings: [
                ("gemini-1.5-pro".to_string(), ModelConfig {
                    model_id: "gemini-1.5-pro".to_string(),
                    display_name: "Gemini 1.5 Pro".to_string(),
                    context_length: 1000000,
                    output_tokens: 8192,
                    cost_per_token: Some(0.0000035),
                    specialized_for: vec!["code".to_string(), "vision".to_string(), "long_context".to_string()],
                    parameters: HashMap::new(),
                }),
                ("gemini-1.5-flash".to_string(), ModelConfig {
                    model_id: "gemini-1.5-flash".to_string(),
                    display_name: "Gemini 1.5 Flash".to_string(),
                    context_length: 1000000,
                    output_tokens: 8192,
                    cost_per_token: Some(0.00000075),
                    specialized_for: vec!["fast".to_string(), "cost_effective".to_string()],
                    parameters: HashMap::new(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_cohere_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "Cohere".to_string(),
                base_url: Some("https://api.cohere.ai/v1".to_string()),
                env_key: Some("COHERE_API_KEY".to_string()),
                env_key_instructions: Some("Get your API key from https://dashboard.cohere.ai/api-keys".to_string()),
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: false,
                supports_code_generation: true,
                supports_reasoning: true,
                max_context_length: 128000,
                max_output_tokens: 4096,
                supported_languages: vec![
                    "python".to_string(), "javascript".to_string(), "java".to_string(),
                    "go".to_string(), "rust".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "command-r-plus".to_string()),
                    ("fast".to_string(), "command-r".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures::default(),
            safety_config: SafetyConfig::default(),
            rate_limits: RateLimitConfig::default(),
            model_mappings: [
                ("command-r-plus".to_string(), ModelConfig {
                    model_id: "command-r-plus".to_string(),
                    display_name: "Command R+".to_string(),
                    context_length: 128000,
                    output_tokens: 4096,
                    cost_per_token: Some(0.000003),
                    specialized_for: vec!["code".to_string(), "reasoning".to_string()],
                    parameters: HashMap::new(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_mistral_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "Mistral AI".to_string(),
                base_url: Some("https://api.mistral.ai/v1".to_string()),
                env_key: Some("MISTRAL_API_KEY".to_string()),
                env_key_instructions: Some("Get your API key from https://console.mistral.ai/".to_string()),
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: true,
                supports_vision: false,
                supports_code_generation: true,
                supports_reasoning: true,
                max_context_length: 128000,
                max_output_tokens: 8192,
                supported_languages: vec![
                    "python".to_string(), "javascript".to_string(), "rust".to_string(),
                    "go".to_string(), "java".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "codestral-latest".to_string()),
                    ("reasoning".to_string(), "mistral-large-latest".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures::default(),
            safety_config: SafetyConfig::default(),
            rate_limits: RateLimitConfig::default(),
            model_mappings: [
                ("codestral-latest".to_string(), ModelConfig {
                    model_id: "codestral-latest".to_string(),
                    display_name: "Codestral".to_string(),
                    context_length: 32000,
                    output_tokens: 8192,
                    cost_per_token: Some(0.000001),
                    specialized_for: vec!["code".to_string(), "completion".to_string()],
                    parameters: HashMap::new(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_github_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "GitHub Models".to_string(),
                base_url: Some("https://models.inference.ai.azure.com".to_string()),
                env_key: Some("GITHUB_TOKEN".to_string()),
                env_key_instructions: Some("Use your GitHub Personal Access Token".to_string()),
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(3),
                stream_max_retries: Some(5),
                stream_idle_timeout_ms: Some(300000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: false,
                supports_vision: false,
                supports_code_generation: true,
                supports_reasoning: false,
                max_context_length: 128000,
                max_output_tokens: 4096,
                supported_languages: vec![
                    "python".to_string(), "javascript".to_string(), "rust".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "gpt-4o".to_string()),
                    ("small".to_string(), "gpt-4o-mini".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures::default(),
            safety_config: SafetyConfig::default(),
            rate_limits: RateLimitConfig {
                requests_per_minute: 15, // Free tier limitation
                tokens_per_minute: 50000,
                concurrent_requests: 2,
                ..Default::default()
            },
            model_mappings: HashMap::new(), // Inherit from base providers
        }
    }

    fn create_ollama_config(&self) -> EnhancedProviderConfig {
        let ollama_port = std::env::var("OLLAMA_PORT")
            .ok()
            .and_then(|p| p.parse::<u32>().ok())
            .unwrap_or(11434);

        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "Ollama".to_string(),
                base_url: Some(format!("http://localhost:{}/v1", ollama_port)),
                env_key: None,
                env_key_instructions: None,
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(2),
                stream_max_retries: Some(3),
                stream_idle_timeout_ms: Some(600000), // Longer timeout for local inference
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: false,
                supports_vision: true, // Some models support vision
                supports_code_generation: true,
                supports_reasoning: false,
                max_context_length: 8192, // Varies by model
                max_output_tokens: 4096,
                supported_languages: vec![
                    "python".to_string(), "javascript".to_string(), "rust".to_string(),
                    "go".to_string(), "java".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "codellama:13b".to_string()),
                    ("general".to_string(), "llama3.1:8b".to_string()),
                    ("small".to_string(), "llama3.1:3b".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures {
                enable_cost_tracking: false, // Local models are free
                ..Default::default()
            },
            safety_config: SafetyConfig {
                enable_content_filtering: false, // Local control
                ..Default::default()
            },
            rate_limits: RateLimitConfig {
                requests_per_minute: 1000, // No external limits
                tokens_per_minute: 1000000,
                concurrent_requests: 20,
                ..Default::default()
            },
            model_mappings: [
                ("codellama:13b".to_string(), ModelConfig {
                    model_id: "codellama:13b".to_string(),
                    display_name: "Code Llama 13B".to_string(),
                    context_length: 16384,
                    output_tokens: 4096,
                    cost_per_token: Some(0.0), // Free
                    specialized_for: vec!["code".to_string(), "completion".to_string()],
                    parameters: HashMap::new(),
                }),
            ].into_iter().collect(),
        }
    }

    fn create_mlx_config(&self) -> EnhancedProviderConfig {
        EnhancedProviderConfig {
            base_provider: ModelProviderInfo {
                name: "MLX Local".to_string(),
                base_url: Some("http://localhost:8080/v1".to_string()),
                env_key: None,
                env_key_instructions: None,
                wire_api: crate::model_provider_info::WireApi::Chat,
                query_params: None,
                http_headers: Some([
                    ("User-Agent".to_string(), format!("cortex-code/{}", env!("CARGO_PKG_VERSION"))),
                ].into_iter().collect()),
                env_http_headers: None,
                request_max_retries: Some(2),
                stream_max_retries: Some(3),
                stream_idle_timeout_ms: Some(600000),
                requires_openai_auth: false,
            },
            capabilities: ProviderCapabilities {
                supports_streaming: true,
                supports_function_calling: false,
                supports_vision: false,
                supports_code_generation: true,
                supports_reasoning: false,
                max_context_length: 8192,
                max_output_tokens: 4096,
                supported_languages: vec![
                    "python".to_string(), "swift".to_string(), "objective-c".to_string(),
                    "rust".to_string(), "javascript".to_string(),
                ],
                specialized_models: [
                    ("code".to_string(), "mlx-community/CodeLlama-7b-Instruct-hf-4bit-mlx".to_string()),
                    ("small".to_string(), "mlx-community/Llama-3.2-3B-Instruct-4bit".to_string()),
                ].into_iter().collect(),
            },
            feature_flags: ProviderFeatures {
                enable_cost_tracking: false, // Local inference
                enable_background_processing: true,
                ..Default::default()
            },
            safety_config: SafetyConfig {
                enable_content_filtering: false,
                ..Default::default()
            },
            rate_limits: RateLimitConfig {
                requests_per_minute: 1000,
                tokens_per_minute: 1000000,
                concurrent_requests: 10, // Apple Silicon memory limits
                ..Default::default()
            },
            model_mappings: HashMap::new(),
        }
    }

    // Public API methods
    pub fn get_provider(&self, provider_id: &str) -> Option<&EnhancedProviderConfig> {
        self.providers.get(provider_id)
    }

    pub fn list_providers(&self) -> Vec<&String> {
        self.providers.keys().collect()
    }

    pub fn list_available_providers(&self) -> Vec<&String> {
        if self.feature_flags.enable_all_providers {
            self.list_providers()
        } else {
            // Filter based on availability and feature flags
            self.providers
                .keys()
                .filter(|&id| self.is_provider_available(id))
                .collect()
        }
    }

    pub fn get_default_provider(&self) -> &str {
        &self.feature_flags.default_provider
    }

    pub fn add_custom_provider(&mut self, id: String, config: EnhancedProviderConfig) {
        self.providers.insert(id, config);
    }

    pub fn remove_provider(&mut self, provider_id: &str) -> Option<EnhancedProviderConfig> {
        self.providers.remove(provider_id)
    }

    pub fn update_feature_flags(&mut self, flags: GlobalFeatureFlags) {
        self.feature_flags = flags;
    }

    pub fn get_providers_by_category(&self, category: ProviderCategory) -> Vec<&String> {
        match category {
            ProviderCategory::Commercial => vec![&"openai".to_string(), &"anthropic".to_string(), &"google".to_string()],
            ProviderCategory::OpenSource => vec![&"ollama".to_string()],
            ProviderCategory::Local => vec![&"mlx".to_string(), &"ollama".to_string()],
            ProviderCategory::Specialized => vec![&"github".to_string()],
            ProviderCategory::Experimental => vec![], // None by default
        }
    }

    pub fn get_providers_for_task(&self, task: &str) -> Vec<&String> {
        self.providers
            .iter()
            .filter(|(_, config)| {
                config.capabilities.specialized_models.contains_key(task) ||
                match task {
                    "code" => config.capabilities.supports_code_generation,
                    "vision" => config.capabilities.supports_vision,
                    "reasoning" => config.capabilities.supports_reasoning,
                    "streaming" => config.capabilities.supports_streaming,
                    _ => true,
                }
            })
            .map(|(id, _)| id)
            .collect()
    }

    fn is_provider_available(&self, provider_id: &str) -> bool {
        match provider_id {
            "ollama" | "mlx" => self.feature_flags.enable_local_inference,
            _ => true, // Commercial providers generally available
        }
    }

    pub fn get_statistics(&self) -> RegistryStatistics {
        RegistryStatistics {
            total_providers: self.providers.len(),
            available_providers: self.list_available_providers().len(),
            commercial_providers: self.get_providers_by_category(ProviderCategory::Commercial).len(),
            local_providers: self.get_providers_by_category(ProviderCategory::Local).len(),
            experimental_enabled: self.feature_flags.enable_experimental,
            default_provider: self.feature_flags.default_provider.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryStatistics {
    pub total_providers: usize,
    pub available_providers: usize,
    pub commercial_providers: usize,
    pub local_providers: usize,
    pub experimental_enabled: bool,
    pub default_provider: String,
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
