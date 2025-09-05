//! Provider registry for managing multiple AI model providers
//!
//! The registry allows for dynamic registration and lookup of providers,
//! enabling runtime provider switching and configuration.

use super::traits::ModelProvider;
use crate::error::{CodexErr, Result};
use std::collections::HashMap;
use std::sync::Arc;

/// Registry for managing multiple model providers
pub struct ProviderRegistry {
    providers: HashMap<String, Box<dyn ModelProvider>>, // legacy boxed storage
    default_provider: Option<String>,
    // Future: parallel Arc storage (migration path for shared references)
    arc_providers: HashMap<String, Arc<dyn ModelProvider>>, // optional new path
}

impl ProviderRegistry {
    /// Create a new empty provider registry
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
            default_provider: None,
            arc_providers: HashMap::new(),
        }
    }

    /// Register a provider with the registry (boxed ownership)
    pub fn register(&mut self, name: String, provider: Box<dyn ModelProvider>) {
        self.providers.insert(name, provider);
    }

    /// Register a provider by Arc (new path) without consuming ownership of underlying instance.
    pub fn register_arc(&mut self, provider: Arc<dyn ModelProvider>) {
        let id = provider.name().to_string();
        self.arc_providers.insert(id, provider);
    }

    /// Get a provider by name (prefers Arc storage, falls back to boxed).
    pub fn get(&self, name: &str) -> Option<&dyn ModelProvider> {
        if let Some(p) = self.arc_providers.get(name) { return Some(p.as_ref()); }
        self.providers.get(name).map(|p| p.as_ref())
    }

    /// Get an Arc provider clone if available (for streaming lifetimes)
    pub fn get_arc(&self, name: &str) -> Option<Arc<dyn ModelProvider>> {
        self.arc_providers.get(name).cloned()
    }

    /// List all registered provider names
    pub fn list_providers(&self) -> Vec<String> {
        let mut keys: Vec<_> = self.providers.keys().cloned().collect();
        keys.extend(self.arc_providers.keys().cloned());
        keys.sort();
        keys.dedup();
        keys
    }

    /// Compatibility alias
    pub fn list_ids(&self) -> Vec<String> { self.list_providers() }

    /// Set the default provider
    pub fn set_default(&mut self, name: String) -> Result<()> {
        if self.has_provider(&name) {
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
        self.arc_providers.contains_key(name) || self.providers.contains_key(name)
    }

    /// Remove a provider and update default if needed
    pub fn remove(&mut self, name: &str) -> Option<Box<dyn ModelProvider>> {
        if self.default_provider.as_ref().map(|s| s.as_str()) == Some(name) {
            self.default_provider = None;
        }
        self.arc_providers.remove(name); // ignore result (Arc removal)
        self.providers.remove(name)
    }

    /// Get the number of registered providers (unique IDs)
    pub fn len(&self) -> usize { self.list_providers().len() }

    /// Check if the registry is empty
    pub fn is_empty(&self) -> bool { self.len() == 0 }
}

impl Default for ProviderRegistry {
    fn default() -> Self { Self::new() }
}
