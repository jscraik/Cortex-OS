use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),

    #[error("Provider error: {0}")]
    Provider(#[from] ProviderError),

    #[error("TUI error: {0}")]
    Tui(String),

    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("Memory error: {0}")]
    Memory(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("TOML error: {0}")]
    Toml(#[from] toml::de::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Join error: {0}")]
    Join(#[from] tokio::task::JoinError),

    #[error("Other error: {0}")]
    Other(#[from] anyhow::Error),

    #[error("URL parse error: {0}")]
    UrlParse(#[from] url::ParseError),
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Config file not found: {0}")]
    NotFound(String),

    #[error("Invalid TOML: {0}")]
    InvalidToml(#[from] toml::de::Error),

    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Invalid value for {field}: {value}")]
    InvalidValue { field: String, value: String },
}

#[derive(Error, Debug)]
pub enum ProviderError {
    #[error("Unknown provider: {0}")]
    UnknownProvider(String),

    #[error("Provider not configured: {0}")]
    NotConfigured(String),

    #[error("API error: {0}")]
    Api(String),

    #[error("Rate limited")]
    RateLimited,

    #[error("Authentication failed")]
    AuthFailed,

    #[error("Model not available: {0}")]
    ModelNotAvailable(String),
}
