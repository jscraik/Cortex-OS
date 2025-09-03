//! Feature toggles for provider functionality

use serde::{Deserialize, Serialize};

/// Feature flags for provider functionality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderFeatures {
    pub enable_advanced_reasoning: bool,
    pub enable_multimodal: bool,
    pub enable_code_execution: bool,
    pub enable_function_calling: bool,
    pub enable_streaming: bool,
    pub enable_safety_filtering: bool,
}

impl Default for ProviderFeatures {
    fn default() -> Self {
        Self {
            enable_advanced_reasoning: false,
            enable_multimodal: false,
            enable_code_execution: false,
            enable_function_calling: false,
            enable_streaming: true,
            enable_safety_filtering: true,
        }
    }
}
