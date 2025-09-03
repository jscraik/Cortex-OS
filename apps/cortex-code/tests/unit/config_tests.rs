use cortex_code::config::Config;
use cortex_code::Error;
use tempfile::TempDir;
use std::fs;

// RED - These tests will fail initially
#[test]
fn test_config_loads_from_json() {
    // Given
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("cortex.json");

    let config_content = serde_json::json!({
        "providers": {
            "default": "github",
            "fallback": ["openai", "mlx"],
            "config": {
                "github": {
                    "base_url": "https://models.inference.ai.azure.com",
                    "models": ["gpt-4o-mini"]
                },
                "openai": {"base_url": "https://api.openai.com/v1", "models": ["gpt-4"]},
                "mlx": {"models": ["mlx-community/Llama-3.1-8B-Instruct"], "provider_type": "local"}
            }
        },
        "features": {
            "tui": {"enabled": true, "framework": "ratatui", "version": "0.29.0", "accessibility": "wcag-2.2-aa"},
            "daemon": {"enabled": true, "port": 8080, "bind_address": "127.0.0.1"},
            "mcp": {"enabled": false, "servers": []},
            "memory": {"enabled": true, "backend": "agents_md", "retention_days": 30, "audit_enabled": false},
            "metrics": {"enabled": false, "prometheus_endpoint": "/metrics", "health_endpoint": "/health"},
            "streaming": {"enabled": true, "chunk_size": 1024, "timeout_ms": 10000}
        },
        "security": {
            "network": {"bind_localhost_only": true, "tls_enabled": false, "cors_enabled": true, "allowed_origins": ["http://localhost:*"]},
            "execution": {"sandbox_enabled": true, "command_injection_protection": true, "input_validation": true},
            "data": {"encryption_at_rest": false, "pii_detection": false, "audit_logging": false}
        },
        "ui": {
            "theme": "dark", "keybindings": "default", "vim_mode": false,
            "components": {
                "chat_widget": {"enabled": true},
                "command_palette": {"enabled": true},
                "file_tree": {"enabled": false},
                "diff_viewer": {"enabled": true},
                "status_bar": {"enabled": true}
            }
        }
    });

    fs::write(&config_path, serde_json::to_string_pretty(&config_content).unwrap()).unwrap();

    // When
    let config = Config::from_file(config_path.to_str().unwrap()).unwrap();

    // Then
    assert_eq!(config.providers.default, "github");
    assert_eq!(config.providers.fallback, vec!["openai", "mlx"]);
    assert!(config.get_provider_config("github").is_some());
}

#[test]
fn test_config_handles_missing_file() {
    // Given
    let nonexistent_path = "/does/not/exist/cortex.json";

    // When
    let result = Config::from_file(nonexistent_path);

    // Then
    assert!(result.is_err());
    match result.unwrap_err() {
        Error::Config(cortex_code::error::ConfigError::NotFound(path)) => {
            assert_eq!(path, nonexistent_path);
        }
        _ => panic!("Expected ConfigError::NotFound"),
    }
}

#[test]
fn test_config_validates_required_fields() {
    // Given
    let temp_dir = TempDir::new().unwrap();
    let config_path = temp_dir.path().join("cortex.json");

    // Invalid config - missing providers.default
    let config_content = serde_json::json!({
        "providers": {
            "fallback": [],
            "config": {}
        },
        "features": {
            "tui": {"enabled": true},
            "daemon": {"enabled": true, "port": 8080, "bind_address": "127.0.0.1"},
            "mcp": {"enabled": false, "servers": []},
            "memory": {"enabled": true, "backend": "agents_md", "retention_days": 30, "audit_enabled": false},
            "metrics": {"enabled": false, "prometheus_endpoint": "/metrics", "health_endpoint": "/health"},
            "streaming": {"enabled": true, "chunk_size": 1024, "timeout_ms": 10000}
        },
        "security": {"network": {"bind_localhost_only": true, "tls_enabled": false, "cors_enabled": true, "allowed_origins": []},
            "execution": {"sandbox_enabled": true, "command_injection_protection": true, "input_validation": true},
            "data": {"encryption_at_rest": false, "pii_detection": false, "audit_logging": false}},
        "ui": {"theme": "dark", "keybindings": "default", "vim_mode": false,
            "components": {"chat_widget": {"enabled": true}, "command_palette": {"enabled": true}, "file_tree": {"enabled": false}, "diff_viewer": {"enabled": true}, "status_bar": {"enabled": true}}}
    });

    fs::write(&config_path, serde_json::to_string_pretty(&config_content).unwrap()).unwrap();

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
        assert!(!config.providers.default.is_empty());
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
    config.providers.default = "github".to_string();

    // When
    let provider = config.create_provider();

    // Then
    assert!(provider.is_ok());
}

#[test]
fn test_config_unknown_provider_fails() {
    // Given
    let mut config = Config::default();
    config.providers.default = "unknown-provider".to_string();

    // When
    let result = config.create_provider();

    // Then
    assert!(result.is_err());
}
