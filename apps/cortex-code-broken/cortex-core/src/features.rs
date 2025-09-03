//! Feature toggle system for cortex-code
//!
//! Provides runtime and compile-time control over optional features following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - Named exports only

use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Feature toggle configuration with environment and user overrides
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureConfig {
    pub features: HashMap<String, FeatureState>,
    pub environment_overrides: HashMap<String, HashMap<String, FeatureState>>,
    pub user_overrides: HashMap<String, HashMap<String, FeatureState>>,
}

impl Default for FeatureConfig {
    fn default() -> Self {
        let mut features = HashMap::new();

        // Default feature states for cortex-code
        features.insert("enhanced_provider_support".to_string(), FeatureState::Enabled);
        features.insert("rag_integration".to_string(), FeatureState::Enabled);
        features.insert("a2a_pipeline_integration".to_string(), FeatureState::Enabled);
        features.insert("ast_grep_integration".to_string(), FeatureState::Enabled);
        features.insert("streaming_responses".to_string(), FeatureState::Enabled);
        features.insert("memory_persistence".to_string(), FeatureState::Enabled);
        features.insert("approval_workflows".to_string(), FeatureState::Enabled);
        features.insert("cli_enhancements".to_string(), FeatureState::Beta);
        features.insert("tui_improvements".to_string(), FeatureState::Beta);
        features.insert("performance_monitoring".to_string(), FeatureState::Disabled);

        Self {
            features,
            environment_overrides: HashMap::new(),
            user_overrides: HashMap::new(),
        }
    }
}

/// State of an individual feature flag
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum FeatureState {
    Enabled,
    Disabled,
    Beta,
    Deprecated,
    Rollout(u8), // Percentage rollout (0-100)
}

impl Default for FeatureState {
    fn default() -> Self {
        Self::Disabled
    }
}

/// Feature toggle manager with environment and user context
#[derive(Debug)]
pub struct FeatureManager {
    config: Arc<RwLock<FeatureConfig>>,
    environment: String,
    user_id: Option<String>,
}

/// Errors that can occur during feature management
#[derive(Debug, thiserror::Error)]
pub enum FeatureError {
    #[error("No user ID provided for user-specific feature operation")]
    NoUserId,
    #[error("Feature '{0}' not found")]
    FeatureNotFound(String),
    #[error("Invalid rollout percentage: {0}")]
    InvalidRolloutPercentage(u8),
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

impl FeatureManager {
    /// Create new feature manager with environment context
    pub fn new(config: FeatureConfig, environment: String, user_id: Option<String>) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            environment,
            user_id,
        }
    }

    /// Create feature manager with default configuration
    pub fn with_defaults(environment: String, user_id: Option<String>) -> Self {
        Self::new(FeatureConfig::default(), environment, user_id)
    }

    /// Check if feature is enabled with logging
    pub async fn is_enabled(&self, feature_name: &str) -> bool {
        let config = self.config.read().await;
        let state = self.resolve_feature_state(&config, feature_name).await;

        self.evaluate_feature_state(feature_name, &state)
    }

    /// Get current state of a feature
    pub async fn get_feature_state(&self, feature_name: &str) -> FeatureState {
        let config = self.config.read().await;
        self.resolve_feature_state(&config, feature_name).await
    }

    /// Resolve feature state with precedence: user > environment > default
    async fn resolve_feature_state(&self, config: &FeatureConfig, feature_name: &str) -> FeatureState {
        // User-specific override has highest precedence
        if let Some(user_state) = self.get_user_override(config, feature_name) {
            debug!("Using user override for feature '{}': {:?}", feature_name, user_state);
            return user_state;
        }

        // Environment-specific override
        if let Some(env_state) = self.get_environment_override(config, feature_name) {
            debug!("Using environment override for feature '{}': {:?}", feature_name, env_state);
            return env_state;
        }

        // Default feature state
        config.features.get(feature_name).cloned().unwrap_or_default()
    }

    /// Get user-specific feature override
    fn get_user_override(&self, config: &FeatureConfig, feature_name: &str) -> Option<FeatureState> {
        self.user_id.as_ref()
            .and_then(|user_id| config.user_overrides.get(user_id))
            .and_then(|user_features| user_features.get(feature_name))
            .cloned()
    }

    /// Get environment-specific feature override
    fn get_environment_override(&self, config: &FeatureConfig, feature_name: &str) -> Option<FeatureState> {
        config.environment_overrides.get(&self.environment)
            .and_then(|env_features| env_features.get(feature_name))
            .cloned()
    }

    /// Evaluate feature state to boolean with appropriate logging
    fn evaluate_feature_state(&self, feature_name: &str, state: &FeatureState) -> bool {
        match state {
            FeatureState::Enabled => true,
            FeatureState::Beta => {
                warn!("Feature '{}' is in beta - use with caution", feature_name);
                true
            }
            FeatureState::Deprecated => {
                warn!("Feature '{}' is deprecated and will be removed", feature_name);
                true
            }
            FeatureState::Rollout(percentage) => {
                self.evaluate_rollout(feature_name, *percentage)
            }
            FeatureState::Disabled => false,
        }
    }

    /// Evaluate rollout percentage using consistent hashing
    fn evaluate_rollout(&self, feature_name: &str, percentage: u8) -> bool {
        if percentage >= 100 { return true; }
        if percentage == 0 { return false; }

        let hash_input = format!("{}{}", feature_name,
            self.user_id.as_deref().unwrap_or("anonymous"));
        let hash = self.compute_hash(&hash_input);
        (hash % 100) < percentage as u32
    }

    /// Compute simple hash for rollout distribution
    fn compute_hash(&self, input: &str) -> u32 {
        input.bytes().fold(0u32, |acc, b|
            acc.wrapping_mul(31).wrapping_add(b as u32))
    }

    /// Update entire feature configuration
    pub async fn update_config(&self, new_config: FeatureConfig) -> Result<()> {
        *self.config.write().await = new_config;
        info!("Feature configuration updated successfully");
        Ok(())
    }

    /// Enable feature for current user
    pub async fn enable_feature_for_user(&self, feature_name: &str) -> Result<()> {
        let user_id = self.user_id.as_ref()
            .ok_or(FeatureError::NoUserId)?;

        self.set_user_feature(user_id, feature_name, FeatureState::Enabled).await?;
        info!("Enabled feature '{}' for user '{}'", feature_name, user_id);
        Ok(())
    }

    /// Disable feature for current user
    pub async fn disable_feature_for_user(&self, feature_name: &str) -> Result<()> {
        let user_id = self.user_id.as_ref()
            .ok_or(FeatureError::NoUserId)?;

        self.set_user_feature(user_id, feature_name, FeatureState::Disabled).await?;
        info!("Disabled feature '{}' for user '{}'", feature_name, user_id);
        Ok(())
    }

    /// Set feature state for specific user
    async fn set_user_feature(&self, user_id: &str, feature_name: &str, state: FeatureState) -> Result<()> {
        let mut config = self.config.write().await;
        config.user_overrides
            .entry(user_id.to_string())
            .or_insert_with(HashMap::new)
            .insert(feature_name.to_string(), state);
        Ok(())
    }

    /// Set feature rollout percentage
    pub async fn set_rollout(&self, feature_name: &str, percentage: u8) -> Result<()> {
        if percentage > 100 {
            return Err(FeatureError::InvalidRolloutPercentage(percentage).into());
        }

        let mut config = self.config.write().await;
        config.features.insert(feature_name.to_string(), FeatureState::Rollout(percentage));
        info!("Set rollout for feature '{}' to {}%", feature_name, percentage);
        Ok(())
    }

    /// List all available features with their current states
    pub async fn list_features(&self) -> HashMap<String, FeatureState> {
        let config = self.config.read().await;
        let mut result = HashMap::new();

        for feature_name in config.features.keys() {
            let state = self.resolve_feature_state(&config, feature_name).await;
            result.insert(feature_name.clone(), state);
        }

        result
    }

    /// Check if environment has any overrides
    pub async fn has_environment_overrides(&self) -> bool {
        let config = self.config.read().await;
        config.environment_overrides.contains_key(&self.environment)
    }

    /// Get current environment
    pub fn environment(&self) -> &str {
        &self.environment
    }

    /// Get current user ID
    pub fn user_id(&self) -> Option<&str> {
        self.user_id.as_deref()
    }

    /// Reset user overrides
    pub async fn reset_user_overrides(&self) -> Result<()> {
        let user_id = self.user_id.as_ref()
            .ok_or(FeatureError::NoUserId)?;

        let mut config = self.config.write().await;
        config.user_overrides.remove(user_id);
        info!("Reset all feature overrides for user '{}'", user_id);
        Ok(())
    }

    /// Export current configuration
    pub async fn export_config(&self) -> FeatureConfig {
        self.config.read().await.clone()
    }

    /// Validate feature configuration
    pub fn validate_config(config: &FeatureConfig) -> Result<()> {
        for (feature_name, state) in &config.features {
            if feature_name.is_empty() {
                return Err(FeatureError::ConfigError("Empty feature name".to_string()).into());
            }

            if let FeatureState::Rollout(percentage) = state {
                if *percentage > 100 {
                    return Err(FeatureError::InvalidRolloutPercentage(*percentage).into());
                }
            }
        }
        Ok(())
    }
}

/// Utility functions for feature management
pub mod utils {
    use super::*;

    /// Create development environment feature manager
    pub fn create_dev_manager(user_id: Option<String>) -> FeatureManager {
        let mut config = FeatureConfig::default();

        // Enable all beta features in development
        let mut dev_overrides = HashMap::new();
        dev_overrides.insert("cli_enhancements".to_string(), FeatureState::Enabled);
        dev_overrides.insert("tui_improvements".to_string(), FeatureState::Enabled);
        dev_overrides.insert("performance_monitoring".to_string(), FeatureState::Beta);

        config.environment_overrides.insert("development".to_string(), dev_overrides);

        FeatureManager::new(config, "development".to_string(), user_id)
    }

    /// Create production environment feature manager
    pub fn create_prod_manager(user_id: Option<String>) -> FeatureManager {
        let config = FeatureConfig::default(); // Conservative defaults for production
        FeatureManager::new(config, "production".to_string(), user_id)
    }

    /// Check if feature should be enabled for testing
    pub async fn is_test_feature_enabled(feature_name: &str) -> bool {
        std::env::var("CORTEX_TEST_MODE").is_ok() ||
        std::env::var(&format!("CORTEX_FEATURE_{}", feature_name.to_uppercase())).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test as tokio_test;

    #[tokio_test]
    async fn test_feature_manager_creation() {
        let manager = FeatureManager::with_defaults("test".to_string(), Some("user123".to_string()));
        assert_eq!(manager.environment(), "test");
        assert_eq!(manager.user_id(), Some("user123"));
    }

    #[tokio_test]
    async fn test_default_features_enabled() {
        let manager = FeatureManager::with_defaults("test".to_string(), None);
        assert!(manager.is_enabled("enhanced_provider_support").await);
        assert!(manager.is_enabled("rag_integration").await);
        assert!(!manager.is_enabled("performance_monitoring").await);
    }

    #[tokio_test]
    async fn test_user_override() -> Result<()> {
        let manager = FeatureManager::with_defaults("test".to_string(), Some("user123".to_string()));

        manager.enable_feature_for_user("performance_monitoring").await?;
        assert!(manager.is_enabled("performance_monitoring").await);

        manager.disable_feature_for_user("rag_integration").await?;
        assert!(!manager.is_enabled("rag_integration").await);

        Ok(())
    }

    #[tokio_test]
    async fn test_rollout_percentage() -> Result<()> {
        let manager = FeatureManager::with_defaults("test".to_string(), Some("user123".to_string()));

        manager.set_rollout("new_feature", 50).await?;

        // Test multiple times - should be consistent
        let result1 = manager.is_enabled("new_feature").await;
        let result2 = manager.is_enabled("new_feature").await;
        assert_eq!(result1, result2);

        Ok(())
    }

    #[tokio_test]
    async fn test_feature_listing() {
        let manager = FeatureManager::with_defaults("test".to_string(), None);
        let features = manager.list_features().await;

        assert!(features.contains_key("enhanced_provider_support"));
        assert!(features.contains_key("rag_integration"));
        assert_eq!(features["enhanced_provider_support"], FeatureState::Enabled);
    }
}
