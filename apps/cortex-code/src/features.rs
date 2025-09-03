//! Feature toggle system for optional functionality
//!
//! This module provides a flexible feature flag system that allows
//! runtime and compile-time control over optional features.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Core feature toggle configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureConfig {
    /// Global feature toggle settings
    pub features: HashMap<String, FeatureState>,
    /// Environment-specific overrides
    pub environment_overrides: HashMap<String, HashMap<String, FeatureState>>,
    /// User-specific feature flags
    pub user_overrides: HashMap<String, HashMap<String, FeatureState>>,
}

/// State of a feature flag
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum FeatureState {
    /// Feature is fully enabled
    Enabled,
    /// Feature is disabled
    Disabled,
    /// Feature is in beta (enabled with warnings)
    Beta,
    /// Feature is deprecated (enabled with warnings)
    Deprecated,
    /// Feature rollout percentage (0-100)
    Rollout(u8),
}

impl Default for FeatureState {
    fn default() -> Self {
        FeatureState::Disabled
    }
}

/// Feature toggle manager
#[derive(Debug)]
pub struct FeatureManager {
    config: Arc<RwLock<FeatureConfig>>,
    environment: String,
    user_id: Option<String>,
}

impl FeatureManager {
    /// Create a new feature manager
    pub fn new(config: FeatureConfig, environment: String, user_id: Option<String>) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            environment,
            user_id,
        }
    }

    /// Check if a feature is enabled
    pub async fn is_enabled(&self, feature_name: &str) -> bool {
        let config = self.config.read().await;
        let state = self.get_feature_state(&config, feature_name).await;

        match state {
            FeatureState::Enabled => true,
            FeatureState::Beta => {
                warn!("Feature '{}' is in beta - use with caution", feature_name);
                true
            }
            FeatureState::Deprecated => {
                warn!("Feature '{}' is deprecated and will be removed in future versions", feature_name);
                true
            }
            FeatureState::Rollout(percentage) => {
                // Simple hash-based rollout
                self.is_in_rollout(feature_name, percentage)
            }
            FeatureState::Disabled => false,
        }
    }

    /// Get feature state with environment and user overrides
    async fn get_feature_state(&self, config: &FeatureConfig, feature_name: &str) -> FeatureState {
        // Check user-specific overrides first
        if let Some(ref user_id) = self.user_id {
            if let Some(user_features) = config.user_overrides.get(user_id) {
                if let Some(state) = user_features.get(feature_name) {
                    debug!("Using user override for feature '{}': {:?}", feature_name, state);
                    return state.clone();
                }
            }
        }

        // Check environment-specific overrides
        if let Some(env_features) = config.environment_overrides.get(&self.environment) {
            if let Some(state) = env_features.get(feature_name) {
                debug!("Using environment override for feature '{}': {:?}", feature_name, state);
                return state.clone();
            }
        }

        // Use default feature state
        config.features.get(feature_name).cloned().unwrap_or_default()
    }

    /// Check if user is in rollout percentage
    fn is_in_rollout(&self, feature_name: &str, percentage: u8) -> bool {
        if percentage >= 100 {
            return true;
        }
        if percentage == 0 {
            return false;
        }

        // Use feature name + user ID for consistent hashing
        let hash_input = format!("{}{}", feature_name, self.user_id.as_deref().unwrap_or("anonymous"));
        let hash = self.simple_hash(&hash_input);
        (hash % 100) < percentage as u32
    }

    /// Simple hash function for rollout distribution
    fn simple_hash(&self, input: &str) -> u32 {
        input.bytes().fold(0u32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u32))
    }

    /// Update feature configuration
    pub async fn update_config(&self, new_config: FeatureConfig) {
        *self.config.write().await = new_config;
        info!("Feature configuration updated");
    }

    /// Enable a feature for current user
    pub async fn enable_feature_for_user(&self, feature_name: &str) -> Result<(), FeatureError> {
        let user_id = self.user_id.as_ref().ok_or(FeatureError::NoUserId)?;

        let mut config = self.config.write().await;
        config.user_overrides
            .entry(user_id.clone())
            .or_insert_with(HashMap::new)
            .insert(feature_name.to_string(), FeatureState::Enabled);

        info!("Enabled feature '{}' for user '{}'", feature_name, user_id);
        Ok(())
    }

    /// Disable a feature for current user
    pub async fn disable_feature_for_user(&self, feature_name: &str) -> Result<(), FeatureError> {
        let user_id = self.user_id.as_ref().ok_or(FeatureError::NoUserId)?;

        let mut config = self.config.write().await;
        config.user_overrides
            .entry(user_id.clone())
            .or_insert_with(HashMap::new)
            .insert(feature_name.to_string(), FeatureState::Disabled);

        info!("Disabled feature '{}' for user '{}'", feature_name, user_id);
        Ok(())
    }

    /// Get all available features and their states
    pub async fn get_all_features(&self) -> HashMap<String, FeatureState> {
        let config = self.config.read().await;
        let mut result = HashMap::new();

        for (feature_name, _) in &config.features {
            let state = self.get_feature_state(&config, feature_name).await;
            result.insert(feature_name.clone(), state);
        }

        result
    }

    /// Get feature usage statistics
    pub async fn get_feature_stats(&self) -> FeatureStats {
        let config = self.config.read().await;
        let total_features = config.features.len();
        let enabled_features = config.features.values()
            .filter(|state| matches!(state, FeatureState::Enabled | FeatureState::Beta))
            .count();
        let beta_features = config.features.values()
            .filter(|state| matches!(state, FeatureState::Beta))
            .count();
        let deprecated_features = config.features.values()
            .filter(|state| matches!(state, FeatureState::Deprecated))
            .count();

        FeatureStats {
            total_features,
            enabled_features,
            beta_features,
            deprecated_features,
            environment: self.environment.clone(),
        }
    }
}

/// Feature statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureStats {
    pub total_features: usize,
    pub enabled_features: usize,
    pub beta_features: usize,
    pub deprecated_features: usize,
    pub environment: String,
}

/// Feature toggle errors
#[derive(Debug, thiserror::Error)]
pub enum FeatureError {
    #[error("No user ID provided for user-specific feature toggle")]
    NoUserId,
    #[error("Feature '{0}' not found")]
    FeatureNotFound(String),
    #[error("Invalid feature state: {0}")]
    InvalidState(String),
}

/// Default feature configuration for Cortex Code
impl Default for FeatureConfig {
    fn default() -> Self {
        let mut features = HashMap::new();

        // Core features (always enabled)
        features.insert("chat_interface".to_string(), FeatureState::Enabled);
        features.insert("github_integration".to_string(), FeatureState::Enabled);
        features.insert("mcp_support".to_string(), FeatureState::Enabled);

        // Optional features (configurable)
        features.insert("streaming_responses".to_string(), FeatureState::Enabled);
        features.insert("cloudflare_tunnel".to_string(), FeatureState::Disabled);
        features.insert("brainwav_integration".to_string(), FeatureState::Beta);
        features.insert("diagnostic_monitoring".to_string(), FeatureState::Enabled);
        features.insert("cloud_deployment".to_string(), FeatureState::Beta);
        features.insert("webui_server".to_string(), FeatureState::Disabled);
        features.insert("a2a_streaming".to_string(), FeatureState::Enabled);
        features.insert("command_palette".to_string(), FeatureState::Enabled);
        features.insert("mouse_support".to_string(), FeatureState::Enabled);
        features.insert("vim_keybindings".to_string(), FeatureState::Disabled);
        features.insert("dark_mode".to_string(), FeatureState::Enabled);
        features.insert("memory_persistence".to_string(), FeatureState::Enabled);
        features.insert("metrics_collection".to_string(), FeatureState::Enabled);
        features.insert("error_reporting".to_string(), FeatureState::Enabled);

        // Experimental features
        features.insert("voice_input".to_string(), FeatureState::Disabled);
        features.insert("collaborative_editing".to_string(), FeatureState::Disabled);
        features.insert("plugin_system".to_string(), FeatureState::Disabled);

        Self {
            features,
            environment_overrides: HashMap::new(),
            user_overrides: HashMap::new(),
        }
    }
}

/// Convenience macro for feature checking
#[macro_export]
macro_rules! feature_enabled {
    ($manager:expr, $feature:literal) => {
        $manager.is_enabled($feature).await
    };
}

/// Convenience macro for conditional compilation based on features
#[macro_export]
macro_rules! if_feature {
    ($manager:expr, $feature:literal, $then:block) => {
        if $manager.is_enabled($feature).await {
            $then
        }
    };
    ($manager:expr, $feature:literal, $then:block, $else:block) => {
        if $manager.is_enabled($feature).await {
            $then
        } else {
            $else
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_feature_manager_creation() {
        let config = FeatureConfig::default();
        let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

        // Test that chat interface is enabled by default
        assert!(manager.is_enabled("chat_interface").await);

        // Test that cloudflare tunnel is disabled by default
        assert!(!manager.is_enabled("cloudflare_tunnel").await);
    }

    #[tokio::test]
    async fn test_user_overrides() {
        let config = FeatureConfig::default();
        let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

        // Enable a disabled feature for user
        manager.enable_feature_for_user("cloudflare_tunnel").await.unwrap();
        assert!(manager.is_enabled("cloudflare_tunnel").await);

        // Disable an enabled feature for user
        manager.disable_feature_for_user("chat_interface").await.unwrap();
        assert!(!manager.is_enabled("chat_interface").await);
    }

    #[tokio::test]
    async fn test_rollout_percentage() {
        let mut config = FeatureConfig::default();
        config.features.insert("test_feature".to_string(), FeatureState::Rollout(50));

        let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

        // The result should be consistent for the same user
        let result1 = manager.is_enabled("test_feature").await;
        let result2 = manager.is_enabled("test_feature").await;
        assert_eq!(result1, result2);
    }

    #[tokio::test]
    async fn test_beta_features() {
        let mut config = FeatureConfig::default();
        config.features.insert("beta_feature".to_string(), FeatureState::Beta);

        let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

        // Beta features should be enabled but with warnings
        assert!(manager.is_enabled("beta_feature").await);
    }

    #[tokio::test]
    async fn test_feature_stats() {
        let config = FeatureConfig::default();
        let manager = FeatureManager::new(config, "test".to_string(), None);

        let stats = manager.get_feature_stats().await;
        assert!(stats.total_features > 0);
        assert_eq!(stats.environment, "test");
    }
}
