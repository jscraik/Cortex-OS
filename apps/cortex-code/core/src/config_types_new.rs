use serde::{Deserialize, Serialize};

/// Model provider enumeration for simplified configuration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ModelProvider {
    OpenAI,
    Anthropic,
    Local,
    Azure,
    #[serde(rename = "custom")]
    Custom(String),
}

impl Default for ModelProvider {
    fn default() -> Self {
        ModelProvider::OpenAI
    }
}

/// Rate limiting configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RateLimit {
    pub requests_per_minute: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        RateLimit {
            requests_per_minute: 60,
        }
    }
}

/// API settings configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiSettings {
    pub timeout_seconds: u64,
    pub rate_limit: RateLimit,
}

impl Default for ApiSettings {
    fn default() -> Self {
        ApiSettings {
            timeout_seconds: 30,
            rate_limit: RateLimit::default(),
        }
    }
}

/// Model configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: ModelProvider,
    pub name: String,
    pub temperature: f64,
}

impl Default for ModelConfig {
    fn default() -> Self {
        ModelConfig {
            provider: ModelProvider::default(),
            name: "gpt-4".to_string(),
            temperature: 0.7,
        }
    }
}

/// Logging configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub output: String,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        LoggingConfig {
            level: "info".to_string(),
            output: "stdout".to_string(),
        }
    }
}

/// Simplified configuration struct for TDD testing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SimpleConfig {
    pub model: ModelConfig,
    pub api: ApiSettings,
    pub logging: LoggingConfig,
}

impl Default for SimpleConfig {
    fn default() -> Self {
        Self {
            model: ModelConfig::default(),
            api: ApiSettings::default(),
            logging: LoggingConfig::default(),
        }
    }
}
