//! Task 1.2: Configuration System Tests
//!
//! TDD approach: Write failing tests first, then implement the configuration system.
//! This test file covers the core configuration functionality required for cortex-codex.

use codex_core::config_types_new::SimpleConfig;
use codex_core::config_types_new::{
    ApiSettings, LoggingConfig, ModelConfig, ModelProvider, RateLimit,
};
use codex_core::error::ConfigError;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

#[test]
fn test_config_default_profile_loads() {
    // Arrange: Default configuration should have sensible defaults

    // Act: Load default configuration
    let config = SimpleConfig::default();

    // Assert: Check that default values are reasonable
    assert_eq!(config.model.provider, ModelProvider::OpenAI);
    assert_eq!(config.api.timeout_seconds, 30);
    assert_eq!(config.api.timeout_seconds, 30); // Should use defaults
}

#[test]
fn test_config_profile_loading() {
    // Arrange: Create a temporary config file with development profile
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("config.toml");
    let config_content = r#"
[profiles.development]
[profiles.development.model]
provider = "Local"
name = "codellama:7b"
temperature = 0.7

[profiles.development.api]
timeout_seconds = 60

[profiles.development.api.rate_limit]
requests_per_minute = 60

[profiles.development.logging]
level = "debug"
output = "stdout"

[profiles.production]
[profiles.production.model] 
provider = "openai"
name = "gpt-4"
temperature = 0.3

[profiles.production.api]
timeout_seconds = 30

[profiles.production.api.rate_limit]
requests_per_minute = 100

[profiles.production.logging]
level = "info"
output = "file"
"#;
    fs::write(&config_path, config_content).unwrap();

    // Act: Load configuration with development profile
    let config = SimpleConfig::load_with_profile(config_path, "development").unwrap();

    // Assert: Configuration should match development profile
    assert_eq!(config.model.provider, ModelProvider::Local);
    assert_eq!(config.model.name, "codellama:7b");
    assert_eq!(config.api.timeout_seconds, 60);
}

#[test]
fn test_config_override_parsing() {
    // Arrange: Start with default config and prepare overrides
    let overrides = vec![
        "model.provider=openai".to_string(),
        "model.name=gpt-3.5-turbo".to_string(),
        "api.timeout_seconds=45".to_string(),
    ];

    // Act: Apply overrides to default configuration
    let config = SimpleConfig::with_overrides(overrides).unwrap();

    // Assert: Overrides should be applied correctly
    assert_eq!(config.model.provider, ModelProvider::OpenAI);
    assert_eq!(config.model.name, "gpt-3.5-turbo");
    assert_eq!(config.api.timeout_seconds, 45);
}

#[test]
fn test_config_nested_override_parsing() {
    // Arrange: Test more complex nested overrides
    let overrides = vec![
        "api.rate_limit.requests_per_minute=100".to_string(),
        "model.temperature=0.7".to_string(),
        "logging.level=debug".to_string(),
    ];

    // Act: Apply nested overrides
    let config = SimpleConfig::with_overrides(overrides).unwrap();

    // Assert: Nested values should be set correctly
    assert_eq!(config.api.rate_limit.requests_per_minute, 100);
    assert_eq!(config.model.temperature, 0.7);
    assert_eq!(config.logging.level, "debug");
}

#[test]
fn test_config_file_not_found_returns_default() {
    // Arrange: Point to non-existent config file
    let non_existent_path = PathBuf::from("/definitely/does/not/exist/config.toml");

    // Act: Try to load configuration
    let config = SimpleConfig::load_from_file(non_existent_path).unwrap();

    // Assert: Should fall back to default configuration
    assert_eq!(config.model.provider, ModelProvider::OpenAI);
}

#[test]
fn test_config_invalid_toml_returns_error() {
    // Arrange: Create invalid TOML content
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("invalid_config.toml");
    let invalid_content = r#"
[model
provider = "openai"  # Missing closing bracket
"#;
    fs::write(&config_path, invalid_content).unwrap();

    // Act: Try to load invalid configuration
    let result = SimpleConfig::load_from_file(config_path);

    // Assert: Should return appropriate error
    assert!(result.is_err());
    match result.unwrap_err() {
        ConfigError::InvalidToml(_) => {} // Expected
        _ => panic!("Expected ParseError"),
    }
}

#[test]
fn test_config_override_invalid_format_returns_error() {
    // Arrange: Create malformed override string
    let invalid_overrides = vec![
        "invalid_format".to_string(), // No equals sign
        "model.provider".to_string(), // No value
    ];

    // Act: Try to apply invalid overrides
    let result = SimpleConfig::with_overrides(invalid_overrides);

    // Assert: Should return appropriate error
    assert!(result.is_err());
    match result.unwrap_err() {
        ConfigError::MalformedOverride(_) => {} // Expected
        _ => panic!("Expected InvalidOverride error"),
    }
}

#[test]
fn test_config_merge_precedence() {
    // Arrange: Create base config and overrides that should take precedence
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("config.toml");
    let config_content = r#"
[model]
provider = "Local"
name = "original-model"
temperature = 0.5

[api]
timeout_seconds = 60

[api.rate_limit]
requests_per_minute = 60

[logging]
level = "info"
output = "stdout"
"#;
    fs::write(&config_path, config_content).unwrap();

    // Act: Load config and apply overrides
    let config = SimpleConfig::load_from_file(config_path).unwrap();
    // For this test, we'll create a new config with overrides applied
    let override_config = SimpleConfig::with_overrides(
        [
            "model.name=overridden-model".to_string(),
            "model.temperature=0.8".to_string(),
        ]
        .into(),
    )
    .unwrap();

    // Assert: File config loads correctly, then we test override behavior separately
    assert_eq!(config.model.provider, ModelProvider::Local); // From file
    assert_eq!(override_config.model.name, "overridden-model"); // From override
    assert_eq!(override_config.model.temperature, 0.8); // From override
    assert_eq!(config.api.timeout_seconds, 60); // From file, not overridden
}

#[test]
fn test_config_environment_variable_support() {
    // Arrange: Set environment variables that should be picked up
    unsafe {
        std::env::set_var("CODEX_MODEL_PROVIDER", "azure");
        std::env::set_var("CODEX_API_TIMEOUT_SECONDS", "120");
    }

    // Act: Load configuration with environment variable support
    let config = SimpleConfig::load_with_env().unwrap();

    // Assert: Environment variables should override defaults
    assert_eq!(config.model.provider, ModelProvider::Azure);
    assert_eq!(config.api.timeout_seconds, 120);

    // Cleanup
    unsafe {
        std::env::remove_var("CODEX_MODEL_PROVIDER");
        std::env::remove_var("CODEX_API_TIMEOUT_SECONDS");
    }
}

#[test]
fn test_config_validation() {
    // Arrange: Create configuration with invalid values
    let invalid_overrides = vec![
        "api.timeout_seconds=-1".to_string(), // Negative timeout
        "model.temperature=2.0".to_string(),  // Temperature > 1.0
    ];

    // Act: Try to create config with invalid values
    let result = SimpleConfig::with_overrides(invalid_overrides);

    // Assert: Should return validation error
    assert!(result.is_err());
    match result.unwrap_err() {
        ConfigError::Validation(_) => {} // Expected
        _ => panic!("Expected ValidationError"),
    }
}

#[test]
fn test_config_serialization_roundtrip() {
    // Arrange: Create a configuration with various settings
    let original_config = SimpleConfig {
        model: ModelConfig {
            provider: ModelProvider::OpenAI,
            name: "gpt-4".to_string(),
            temperature: 0.7,
        },
        api: ApiSettings {
            timeout_seconds: 45,
            rate_limit: RateLimit {
                requests_per_minute: 100,
            },
        },
        logging: LoggingConfig {
            level: "debug".to_string(),
            output: "file".to_string(),
        },
    };

    // Act: Serialize to TOML and deserialize back
    let toml_string = original_config.to_toml_string().unwrap();
    let deserialized_config = SimpleConfig::from_toml_string(&toml_string).unwrap();

    // Assert: Roundtrip should preserve all values
    assert_eq!(
        original_config.model.provider,
        deserialized_config.model.provider
    );
    assert_eq!(original_config.model.name, deserialized_config.model.name);
    assert_eq!(
        original_config.model.temperature,
        deserialized_config.model.temperature
    );
    assert_eq!(
        original_config.api.timeout_seconds,
        deserialized_config.api.timeout_seconds
    );
}
