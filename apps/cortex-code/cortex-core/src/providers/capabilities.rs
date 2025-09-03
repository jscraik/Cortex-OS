//! Provider capabilities definitions

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

impl Default for ProviderCapabilities {
    fn default() -> Self {
        Self {
            supports_streaming: true,
            supports_function_calling: false,
            supports_vision: false,
            supports_code_generation: true,
            supports_reasoning: false,
            max_context_length: 4096,
            max_output_tokens: 1024,
            supported_languages: vec!["en".to_string()],
            specialized_models: HashMap::new(),
        }
    }
}
