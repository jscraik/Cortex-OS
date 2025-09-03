//! Provider factory for creating and managing AI model providers

use crate::ModelProviderInfo;
use anyhow::Result;
use std::collections::HashMap;

/// Factory for creating provider instances
pub struct ProviderFactory {
    providers: HashMap<String, ModelProviderInfo>,
}

impl ProviderFactory {
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
        }
    }

    pub fn register_provider(&mut self, name: String, provider: ModelProviderInfo) {
        self.providers.insert(name, provider);
    }

    pub fn get_provider(&self, name: &str) -> Option<&ModelProviderInfo> {
        self.providers.get(name)
    }

    pub fn list_providers(&self) -> Vec<&String> {
        self.providers.keys().collect()
    }
}

impl Default for ProviderFactory {
    fn default() -> Self {
        Self::new()
    }
}
