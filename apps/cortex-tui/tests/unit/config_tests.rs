use cortex_tui::config::{Config, ProviderConfig};
use cortex_tui::Error;
use tempfile::TempDir;
use std::fs;

// RED - These tests will fail initially
#[test]
fn test_config_loads_from_toml() {
    // Given
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("config.toml");
    
    let config_content = r#"
[provider]
default = "github-models"
fallback = ["openai", "local-mlx"]

[github-models]
model = "openai/gpt-4o-mini"
endpoint = "https://models.github.ai"

[privacy]
zdr = true
telemetry = false
"#;
    
    fs::write(&config_path, config_content).unwrap();
    
    // When
    let config = Config::from_file(config_path.to_str().unwrap()).unwrap();
    
    // Then
    assert_eq!(config.provider.default, "github-models");
    assert_eq!(config.provider.fallback, vec!["openai", "local-mlx"]);
    assert_eq!(config.github_models.model, "openai/gpt-4o-mini");
    assert!(config.privacy.zdr);
    assert!(!config.privacy.telemetry);
}

#[test]
fn test_config_handles_missing_file() {
    // Given
    let nonexistent_path = "/does/not/exist/config.toml";
    
    // When
    let result = Config::from_file(nonexistent_path);
    
    // Then
    assert!(result.is_err());
    match result.unwrap_err() {
        Error::Config(cortex_tui::error::ConfigError::NotFound(path)) => {
            assert_eq!(path, nonexistent_path);
        }
        _ => panic!("Expected ConfigError::NotFound"),
    }
}

#[test]
fn test_config_validates_required_fields() {
    // Given
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("config.toml");
    
    // Invalid config - missing provider.default
    let config_content = r#"
[github-models]
model = "openai/gpt-4o-mini"
"#;
    
    fs::write(&config_path, config_content).unwrap();
    
    // When
    let result = Config::from_file(config_path.to_str().unwrap());
    
    // Then
    assert!(result.is_err());
}

#[test]
fn test_config_from_default_locations() {
    // Given/When
    let result = Config::from_default_locations();
    
    // Then - should either load config or create default
    match result {
        Ok(config) => {
            // Should have sensible defaults
            assert!(!config.provider.default.is_empty());
        }
        Err(_) => {
            // This is also acceptable if no config exists
        }
    }
}

#[test]
fn test_config_provider_factory() {
    // Given
    let mut config = Config::default();
    config.provider.default = "github-models".to_string();
    
    // When
    let provider = config.create_provider();
    
    // Then
    assert!(provider.is_ok());
}

#[test]
fn test_config_unknown_provider_fails() {
    // Given
    let mut config = Config::default();
    config.provider.default = "unknown-provider".to_string();
    
    // When
    let result = config.create_provider();
    
    // Then
    assert!(result.is_err());
}