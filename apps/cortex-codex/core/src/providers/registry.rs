//! Provider registry for managing multiple AI model providers
//!
//! The registry allows for dynamic registration and lookup of providers,
//! enabling runtime provider switching and configuration.

use super::traits::ModelProvider;
use crate::error::{CodexErr, Result};
use std::collections::HashMap;

/// Registry for managing multiple model providers
pub struct ProviderRegistry {
    providers: HashMap<String, Box<dyn ModelProvider>>,
    default_provider: Option<String>,
}

impl ProviderRegistry {
    /// Create a new empty provider registry
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
            default_provider: None,
        }
    }

    /// Register a provider with the registry
    pub fn register(&mut self, name: String, provider: Box<dyn ModelProvider>) {
        self.providers.insert(name, provider);
    }

    /// Get a provider by name
    pub fn get(&self, name: &str) -> Option<&dyn ModelProvider> {
        self.providers.get(name).map(|p| p.as_ref())
    }

    /// List all registered provider names
    pub fn list_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    /// Set the default provider
    pub fn set_default(&mut self, name: String) -> Result<()> {
        if self.providers.contains_key(&name) {
            self.default_provider = Some(name);
            Ok(())
        } else {
            Err(CodexErr::ConfigurationError(format!("Provider '{}' not registered", name)))
        }
    }

    /// Get the default provider
    pub fn get_default(&self) -> Option<&dyn ModelProvider> {
        self.default_provider.as_ref().and_then(|name| self.get(name))
    }

    /// Check if a provider is registered
    pub fn has_provider(&self, name: &str) -> bool {
        self.providers.contains_key(name)
    }

    /// Remove a provider and update default if needed
    pub fn remove(&mut self, name: &str) -> Option<Box<dyn ModelProvider>> {
        if self.default_provider.as_ref().map(|s| s.as_str()) == Some(name) {
            self.default_provider = None;
        }
        self.providers.remove(name)
    }

    /// Get the number of registered providers
    pub fn len(&self) -> usize {
        self.providers.len()
    }

    /// Check if the registry is empty
    pub fn is_empty(&self) -> bool {
        self.providers.is_empty()
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
