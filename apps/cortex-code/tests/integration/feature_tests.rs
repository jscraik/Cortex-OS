//! Integration tests for feature toggle system
//!
//! These tests verify the feature flag implementation including
//! user overrides, environment handling, and rollout percentages.

use cortex_code::features::*;
use std::collections::HashMap;

#[tokio::test]
async fn test_feature_manager_basic_operations() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Test default features
    assert!(manager.is_enabled("chat_interface").await);
    assert!(!manager.is_enabled("cloudflare_tunnel").await);
    assert!(manager.is_enabled("streaming_responses").await);
}

#[tokio::test]
async fn test_user_feature_overrides() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Enable a disabled feature
    manager.enable_feature_for_user("cloudflare_tunnel").await.unwrap();
    assert!(manager.is_enabled("cloudflare_tunnel").await);

    // Disable an enabled feature
    manager.disable_feature_for_user("chat_interface").await.unwrap();
    assert!(!manager.is_enabled("chat_interface").await);
}

#[tokio::test]
async fn test_beta_and_deprecated_features() {
    let mut config = FeatureConfig::default();
    config.features.insert("beta_feature".to_string(), FeatureState::Beta);
    config.features.insert("deprecated_feature".to_string(), FeatureState::Deprecated);

    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Beta features should be enabled
    assert!(manager.is_enabled("beta_feature").await);

    // Deprecated features should be enabled but with warnings
    assert!(manager.is_enabled("deprecated_feature").await);
}

#[tokio::test]
async fn test_rollout_percentage() {
    let mut config = FeatureConfig::default();
    config.features.insert("rollout_feature".to_string(), FeatureState::Rollout(50));

    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Test that rollout is consistent for the same user
    let result1 = manager.is_enabled("rollout_feature").await;
    let result2 = manager.is_enabled("rollout_feature").await;
    assert_eq!(result1, result2);

    // Test with different user IDs to verify distribution
    let manager2 = FeatureManager::new(
        FeatureConfig::default(),
        "test".to_string(),
        Some("user456".to_string())
    );

    // Results may differ between users (that's the point of rollout)
    let _result3 = manager2.is_enabled("rollout_feature").await;
}

#[tokio::test]
async fn test_environment_overrides() {
    let mut config = FeatureConfig::default();

    // Set up environment override
    let mut env_overrides = HashMap::new();
    env_overrides.insert("test_feature".to_string(), FeatureState::Enabled);
    config.environment_overrides.insert("production".to_string(), env_overrides);

    let manager = FeatureManager::new(config, "production".to_string(), Some("user123".to_string()));

    // Environment override should take precedence
    assert!(manager.is_enabled("test_feature").await);
}

#[tokio::test]
async fn test_user_overrides_priority() {
    let mut config = FeatureConfig::default();

    // Set environment override
    let mut env_overrides = HashMap::new();
    env_overrides.insert("priority_test".to_string(), FeatureState::Disabled);
    config.environment_overrides.insert("test".to_string(), env_overrides);

    // Set user override (should take precedence)
    let mut user_overrides = HashMap::new();
    user_overrides.insert("priority_test".to_string(), FeatureState::Enabled);
    config.user_overrides.insert("user123".to_string(), user_overrides);

    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // User override should take precedence over environment
    assert!(manager.is_enabled("priority_test").await);
}

#[tokio::test]
async fn test_feature_stats() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), None);

    let stats = manager.get_feature_stats().await;

    assert!(stats.total_features > 0);
    assert!(stats.enabled_features > 0);
    assert_eq!(stats.environment, "test");
}

#[tokio::test]
async fn test_all_features_list() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), None);

    let features = manager.get_all_features().await;

    assert!(!features.is_empty());
    assert!(features.contains_key("chat_interface"));
    assert!(features.contains_key("streaming_responses"));
}

#[tokio::test]
async fn test_feature_config_updates() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), None);

    // Create new config with different features
    let mut new_config = FeatureConfig::default();
    new_config.features.insert("new_feature".to_string(), FeatureState::Enabled);

    manager.update_config(new_config).await;

    // New feature should now be available
    assert!(manager.is_enabled("new_feature").await);
}

#[tokio::test]
async fn test_no_user_id_scenarios() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), None);

    // Should work with no user ID for general features
    assert!(manager.is_enabled("chat_interface").await);

    // Should fail when trying to set user-specific overrides
    let result = manager.enable_feature_for_user("test_feature").await;
    assert!(result.is_err());

    match result.unwrap_err() {
        FeatureError::NoUserId => {}, // Expected
        _ => panic!("Expected NoUserId error"),
    }
}

#[tokio::test]
async fn test_feature_macro_usage() {
    let config = FeatureConfig::default();
    let manager = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Test feature_enabled macro
    let is_enabled = feature_enabled!(manager, "chat_interface");
    assert!(is_enabled);

    // Test if_feature macro
    let mut executed = false;
    if_feature!(manager, "chat_interface", {
        executed = true;
    });
    assert!(executed);

    // Test if_feature with else clause
    let mut result = "disabled";
    if_feature!(manager, "nonexistent_feature", {
        result = "enabled";
    }, {
        result = "disabled";
    });
    assert_eq!(result, "disabled");
}

#[tokio::test]
async fn test_feature_hash_consistency() {
    let config = FeatureConfig::default();
    let manager1 = FeatureManager::new(config.clone(), "test".to_string(), Some("user123".to_string()));
    let manager2 = FeatureManager::new(config, "test".to_string(), Some("user123".to_string()));

    // Same user should get same rollout results
    let feature = "test_rollout";
    let result1 = manager1.is_in_rollout(feature, 50);
    let result2 = manager2.is_in_rollout(feature, 50);

    assert_eq!(result1, result2);
}

#[tokio::test]
async fn test_feature_config_serialization() {
    let config = FeatureConfig::default();

    // Serialize to JSON
    let json = serde_json::to_string(&config).unwrap();

    // Deserialize back
    let deserialized: FeatureConfig = serde_json::from_str(&json).unwrap();

    // Should be equivalent
    assert_eq!(config.features.len(), deserialized.features.len());
}
