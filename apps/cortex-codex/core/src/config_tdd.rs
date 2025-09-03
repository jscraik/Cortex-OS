use crate::config_types_new::SimpleConfig;
use crate::error::ConfigError;
use std::env;
use std::fs;
use std::path::Path;

impl SimpleConfig {
    /// Load configuration from TOML file, returning default if file doesn't exist
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, ConfigError> {
        match fs::read_to_string(path) {
            Ok(content) => {
                let config: SimpleConfig = toml::from_str(&content)
                    .map_err(|e| ConfigError::InvalidToml(e))?;

                // Validate the configuration
                config.validate()?;

                Ok(config)
            }
            Err(_) => {
                // File doesn't exist, return default configuration
                Ok(Self::default())
            }
        }
    }

    /// Load configuration from file with a specific profile
    pub fn load_with_profile<P: AsRef<Path>>(path: P, profile: &str) -> Result<Self, ConfigError> {
        let content = fs::read_to_string(path)
            .map_err(|e| ConfigError::Io(e))?;

        // Parse the TOML to extract profiles
        let parsed: toml::Value = toml::from_str(&content)
            .map_err(|e| ConfigError::InvalidToml(e))?;

        // Look for the profiles section
        if let Some(profiles) = parsed.get("profiles") {
            if let Some(profile_config) = profiles.get(profile) {
                // Convert the profile TOML value to our config struct
                let config = toml::Value::Table(profile_config.as_table()
                    .ok_or_else(|| ConfigError::Validation(format!("Profile '{}' is not a table", profile)))?
                    .clone())
                    .try_into::<SimpleConfig>()
                    .map_err(|e| ConfigError::InvalidToml(e))?;

                // Validate the configuration
                config.validate()?;

                return Ok(config);
            }
        }

        Err(ConfigError::Validation(format!("Profile '{}' not found", profile)))
    }

    /// Create configuration with override strings
    pub fn with_overrides(overrides: Vec<String>) -> Result<Self, ConfigError> {
        let mut config = Self::default();

        for override_str in overrides {
            Self::apply_override(&mut config, &override_str)?;
        }

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }

    /// Apply a single override to the configuration
    fn apply_override(config: &mut SimpleConfig, override_str: &str) -> Result<(), ConfigError> {
        let parts: Vec<&str> = override_str.split('=').collect();
        if parts.len() != 2 {
            return Err(ConfigError::MalformedOverride(format!("Invalid override format: {}", override_str)));
        }

        let key = parts[0].trim();
        let value = parts[1].trim();

        match key {
            "model.provider" => {
                config.model.provider = match value {
                    "openai" => crate::config_types_new::ModelProvider::OpenAI,
                    "anthropic" => crate::config_types_new::ModelProvider::Anthropic,
                    "local" => crate::config_types_new::ModelProvider::Local,
                    "azure" => crate::config_types_new::ModelProvider::Azure,
                    _ => crate::config_types_new::ModelProvider::Custom(value.to_string()),
                };
            }
            "model.name" => {
                config.model.name = value.to_string();
            }
            "model.temperature" => {
                config.model.temperature = value.parse()
                    .map_err(|_| ConfigError::MalformedOverride(format!("Invalid temperature: {}", value)))?;
            }
            "api.timeout_seconds" => {
                let parsed_value: i64 = value.parse()
                    .map_err(|_| ConfigError::MalformedOverride(format!("Invalid timeout: {}", value)))?;
                if parsed_value <= 0 {
                    return Err(ConfigError::Validation("API timeout must be positive".to_string()));
                }
                config.api.timeout_seconds = parsed_value as u64;
            }
            "api.rate_limit.requests_per_minute" => {
                config.api.rate_limit.requests_per_minute = value.parse()
                    .map_err(|_| ConfigError::MalformedOverride(format!("Invalid rate limit: {}", value)))?;
            }
            "logging.level" => {
                config.logging.level = value.to_string();
            }
            "logging.output" => {
                config.logging.output = value.to_string();
            }
            _ => {
                return Err(ConfigError::MalformedOverride(format!("Unknown config key: {}", key)));
            }
        }

        Ok(())
    }

    /// Load configuration with environment variable support
    pub fn load_with_env() -> Result<Self, ConfigError> {
        let mut config = Self::default();

        // Apply environment variable overrides
        if let Ok(provider) = env::var("CODEX_MODEL_PROVIDER") {
            config.model.provider = match provider.as_str() {
                "openai" => crate::config_types_new::ModelProvider::OpenAI,
                "anthropic" => crate::config_types_new::ModelProvider::Anthropic,
                "local" => crate::config_types_new::ModelProvider::Local,
                "azure" => crate::config_types_new::ModelProvider::Azure,
                _ => crate::config_types_new::ModelProvider::Custom(provider),
            };
        }

        if let Ok(timeout) = env::var("CODEX_API_TIMEOUT_SECONDS") {
            config.api.timeout_seconds = timeout.parse().map_err(|_| {
                ConfigError::Validation(format!("Invalid CODEX_API_TIMEOUT_SECONDS: {}", timeout))
            })?;
        }

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), ConfigError> {
        // Validate API timeout is reasonable and positive
        if self.api.timeout_seconds <= 0 || self.api.timeout_seconds > 300 {
            return Err(ConfigError::Validation("API timeout must be between 1 and 300 seconds".to_string()));
        }

        // Validate model temperature is in valid range (exclusive of 2.0)
        if self.model.temperature < 0.0 || self.model.temperature >= 2.0 {
            return Err(ConfigError::Validation("Model temperature must be between 0.0 and 2.0 (exclusive)".to_string()));
        }

        // Validate model name is not empty for non-custom providers
        if self.model.name.trim().is_empty() {
            return Err(ConfigError::Validation("Model name cannot be empty".to_string()));
        }

        Ok(())
    }

    /// Serialize configuration to TOML string
    pub fn to_toml_string(&self) -> Result<String, ConfigError> {
        toml::to_string(self)
            .map_err(|e| ConfigError::Serialization(e))
    }

    /// Deserialize configuration from TOML string
    pub fn from_toml_string(content: &str) -> Result<Self, ConfigError> {
        let config: SimpleConfig = toml::from_str(content)
            .map_err(|e| ConfigError::InvalidToml(e))?;

        // Validate the configuration
        config.validate()?;

        Ok(config)
    }
}
