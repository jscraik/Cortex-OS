use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use directories::ProjectDirs;
use anyhow::Result;

/// Enhanced configuration system for cortex-code
///
/// Provides comprehensive configuration management with environment overrides,
/// provider settings, MCP server configurations, and development options.
/// Follows September 2025 standards with functional programming patterns.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedConfig {
    /// Core application settings
    pub app: AppConfig,
    /// AI provider configurations
    pub providers: ProviderConfigs,
    /// MCP server configurations
    pub mcp_servers: Vec<McpServerConfig>,
    /// WebUI settings
    pub webui: WebUIConfig,
    /// Client-server architecture settings
    pub server: ServerConfig,
    /// Development and debugging settings
    pub dev: DevConfig,
}

/// Core application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Application theme (default, dark, light)
    pub theme: String,
    /// Logging level (trace, debug, info, warn, error)
    pub log_level: String,
    /// Auto-save interval in seconds
    pub auto_save_interval: u64,
    /// Enable telemetry collection
    pub enable_telemetry: bool,
    /// Maximum context window size
    pub max_context_size: usize,
}

/// Provider configuration container
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfigs {
    /// Default provider identifier
    pub default: String,
    /// OpenAI configuration
    pub openai: Option<OpenAIConfig>,
    /// Anthropic configuration
    pub anthropic: Option<AnthropicConfig>,
    /// GitHub Copilot configuration
    pub github: Option<GitHubConfig>,
    /// Local MLX configuration
    pub local: Option<LocalConfig>,
    /// Additional provider configurations
    pub providers: Vec<ProviderConfig>,
}

/// MCP server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    /// Server name identifier
    pub name: String,
    /// Command to execute
    pub command: Vec<String>,
    /// Command arguments
    pub args: Vec<String>,
    /// Environment variables
    pub env: Option<std::collections::HashMap<String, String>>,
    /// Auto-start on application launch
    pub auto_start: bool,
    /// Path to MCP package directory
    pub package_path: Option<PathBuf>,
    /// Remote MCP server URL
    pub remote_url: Option<String>,
    /// Connection timeout in seconds
    pub timeout: Option<u64>,
    /// Restart policy
    pub restart_policy: RestartPolicy,
}

/// WebUI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebUIConfig {
    /// Enable WebUI server
    pub enabled: bool,
    /// WebUI port
    pub port: u16,
    /// WebUI host
    pub host: String,
    /// Enable CORS
    pub cors_enabled: bool,
    /// Authentication settings
    pub auth: Option<AuthConfig>,
    /// Static assets path
    pub assets_path: Option<PathBuf>,
}

/// Server configuration for daemon mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Enable daemon mode
    pub daemon_mode: bool,
    /// Server port for daemon mode
    pub port: u16,
    /// Unix socket path for local communication
    pub socket_path: Option<PathBuf>,
    /// Enable hot reload for development
    pub hot_reload: bool,
    /// Cloudflare tunnel configuration
    pub cloudflare: Option<CloudflareConfig>,
    /// SSL/TLS configuration
    pub tls: Option<TlsConfig>,
}

/// Development configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevConfig {
    /// Enable development mode
    pub enabled: bool,
    /// Enable file watching
    pub file_watching: bool,
    /// Enable performance monitoring
    pub performance_monitoring: bool,
    /// Enable debug endpoints
    pub debug_endpoints: bool,
    /// Mock external services
    pub mock_services: bool,
    /// Test data directory
    pub test_data_dir: Option<PathBuf>,
}

/// Authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    /// Authentication method
    pub method: AuthMethod,
    /// Secret key for signing
    pub secret_key: Option<String>,
    /// Session timeout in minutes
    pub session_timeout: u32,
}

/// Authentication methods
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthMethod {
    /// No authentication
    None,
    /// API key authentication
    ApiKey,
    /// OAuth authentication
    OAuth,
    /// JWT token authentication
    Jwt,
}

/// Restart policy for MCP servers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RestartPolicy {
    /// Never restart
    Never,
    /// Always restart on failure
    Always,
    /// Restart on failure with backoff
    OnFailure,
}

/// OpenAI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    /// API key
    pub api_key: Option<String>,
    /// Base URL override
    pub base_url: Option<String>,
    /// Default model
    pub model: String,
    /// Temperature setting
    pub temperature: f32,
    /// Maximum tokens
    pub max_tokens: Option<u32>,
}

/// Anthropic provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    /// API key
    pub api_key: Option<String>,
    /// Default model
    pub model: String,
    /// Maximum tokens
    pub max_tokens: u32,
    /// Temperature setting
    pub temperature: Option<f32>,
}

/// GitHub Copilot configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubConfig {
    /// GitHub token
    pub token: Option<String>,
    /// Available models
    pub models: Vec<String>,
    /// Enterprise URL
    pub enterprise_url: Option<String>,
}

/// Local MLX configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalConfig {
    /// MLX installation path
    pub mlx_path: Option<PathBuf>,
    /// Model directory path
    pub model_path: Option<PathBuf>,
    /// Maximum memory usage in GB
    pub max_memory_gb: u32,
    /// Enable GPU acceleration
    pub use_gpu: bool,
}

/// Generic provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// Provider name
    pub name: String,
    /// Provider type
    pub provider_type: String,
    /// Configuration parameters
    pub config: serde_json::Value,
    /// Enable state
    pub enabled: bool,
}

/// Cloudflare tunnel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudflareConfig {
    /// Tunnel token
    pub tunnel_token: Option<String>,
    /// Tunnel name/ID
    pub tunnel_name: String,
    /// Auto-start tunnel
    pub auto_start: bool,
    /// Custom domain
    pub domain: Option<String>,
    /// Configuration file path
    pub config_path: Option<PathBuf>,
    /// Enable health checks
    pub health_checks: bool,
}

/// TLS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlsConfig {
    /// Certificate file path
    pub cert_path: PathBuf,
    /// Private key file path
    pub key_path: PathBuf,
    /// CA certificate path
    pub ca_path: Option<PathBuf>,
}

impl Default for EnhancedConfig {
    fn default() -> Self {
        Self {
            app: AppConfig::default(),
            providers: ProviderConfigs::default(),
            mcp_servers: create_default_mcp_servers(),
            webui: WebUIConfig::default(),
            server: ServerConfig::default(),
            dev: DevConfig::default(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "default".to_string(),
            log_level: "info".to_string(),
            auto_save_interval: 30,
            enable_telemetry: false,
            max_context_size: 128_000,
        }
    }
}

impl Default for ProviderConfigs {
    fn default() -> Self {
        Self {
            default: "openai".to_string(),
            openai: Some(OpenAIConfig::default()),
            anthropic: None,
            github: None,
            local: None,
            providers: Vec::new(),
        }
    }
}

impl Default for OpenAIConfig {
    fn default() -> Self {
        Self {
            api_key: None,
            base_url: None,
            model: "gpt-4".to_string(),
            temperature: 0.7,
            max_tokens: None,
        }
    }
}

impl Default for WebUIConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            port: 3000,
            host: "127.0.0.1".to_string(),
            cors_enabled: true,
            auth: None,
            assets_path: None,
        }
    }
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            daemon_mode: false,
            port: 8080,
            socket_path: None,
            hot_reload: false,
            cloudflare: None,
            tls: None,
        }
    }
}

impl Default for DevConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            file_watching: false,
            performance_monitoring: false,
            debug_endpoints: false,
            mock_services: false,
            test_data_dir: None,
        }
    }
}

/// Create default MCP server configurations
fn create_default_mcp_servers() -> Vec<McpServerConfig> {
    vec![
        McpServerConfig {
            name: "brainwav-mcp".to_string(),
            command: vec!["npx".to_string(), "tsx".to_string()],
            args: vec!["src/index.ts".to_string()],
            env: None,
            auto_start: true,
            package_path: Some(PathBuf::from("/Users/jamiecraik/.Cortex-OS/packages/mcp")),
            remote_url: Some("http://localhost:3000".to_string()),
            timeout: Some(30),
            restart_policy: RestartPolicy::OnFailure,
        },
    ]
}

impl EnhancedConfig {
    /// Load configuration with environment variable overrides
    ///
    /// Priority order:
    /// 1. Environment variables
    /// 2. ~/.cortex/config.toml
    /// 3. Project-local .cortex.toml
    /// 4. Default configuration
    pub fn load() -> Result<Self> {
        let project_dirs = Self::get_project_dirs()?;
        let config_paths = Self::get_config_paths(&project_dirs)?;

        // Try loading from config files
        for path in config_paths {
            if let Ok(config) = Self::load_from_file(&path) {
                return Ok(Self::apply_env_overrides(config));
            }
        }

        // Fallback to default with environment overrides
        Ok(Self::apply_env_overrides(Self::default()))
    }

    /// Save configuration to file
    pub fn save(&self) -> Result<()> {
        let project_dirs = Self::get_project_dirs()?;
        let config_dir = project_dirs.config_dir();
        std::fs::create_dir_all(config_dir)?;

        let config_path = config_dir.join("config.toml");
        let content = toml::to_string_pretty(self)?;
        std::fs::write(config_path, content)?;

        Ok(())
    }

    /// Get project directories
    fn get_project_dirs() -> Result<ProjectDirs> {
        ProjectDirs::from("org", "cortex-os", "cortex-code")
            .ok_or_else(|| anyhow::anyhow!("Failed to get project directories"))
    }

    /// Get configuration file paths in priority order
    fn get_config_paths(project_dirs: &ProjectDirs) -> Result<Vec<PathBuf>> {
        Ok(vec![
            std::env::current_dir()?.join(".cortex.toml"),
            project_dirs.config_dir().join("config.toml"),
        ])
    }

    /// Load configuration from file
    fn load_from_file(path: &PathBuf) -> Result<Self> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Config file does not exist: {:?}", path));
        }

        let content = std::fs::read_to_string(path)?;
        let config: EnhancedConfig = toml::from_str(&content)?;
        Ok(config)
    }

    /// Apply environment variable overrides
    fn apply_env_overrides(mut config: Self) -> Self {
        // Apply environment overrides
        if let Ok(theme) = std::env::var("CORTEX_THEME") {
            config.app.theme = theme;
        }

        if let Ok(log_level) = std::env::var("CORTEX_LOG_LEVEL") {
            config.app.log_level = log_level;
        }

        if let Ok(default_provider) = std::env::var("CORTEX_DEFAULT_PROVIDER") {
            config.providers.default = default_provider;
        }

        if let Ok(openai_key) = std::env::var("OPENAI_API_KEY") {
            if let Some(ref mut openai) = config.providers.openai {
                openai.api_key = Some(openai_key);
            }
        }

        if let Ok(anthropic_key) = std::env::var("ANTHROPIC_API_KEY") {
            if let Some(ref mut anthropic) = config.providers.anthropic {
                anthropic.api_key = Some(anthropic_key);
            }
        }

        config
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<()> {
        // Validate provider configuration
        if self.providers.openai.is_none() &&
           self.providers.anthropic.is_none() &&
           self.providers.github.is_none() &&
           self.providers.local.is_none() {
            return Err(anyhow::anyhow!("At least one provider must be configured"));
        }

        // Validate server configuration
        if self.server.port == 0 || self.server.port > 65535 {
            return Err(anyhow::anyhow!("Invalid server port: {}", self.server.port));
        }

        // Validate WebUI configuration
        if self.webui.enabled && (self.webui.port == 0 || self.webui.port > 65535) {
            return Err(anyhow::anyhow!("Invalid WebUI port: {}", self.webui.port));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_default_config() {
        let config = EnhancedConfig::default();
        assert_eq!(config.app.theme, "default");
        assert_eq!(config.providers.default, "openai");
        assert!(config.providers.openai.is_some());
        assert!(!config.mcp_servers.is_empty());
    }

    #[test]
    fn test_config_validation() {
        let config = EnhancedConfig::default();
        assert!(config.validate().is_ok());

        let mut invalid_config = config.clone();
        invalid_config.server.port = 0;
        assert!(invalid_config.validate().is_err());
    }

    #[test]
    fn test_env_overrides() {
        std::env::set_var("CORTEX_THEME", "dark");
        std::env::set_var("CORTEX_LOG_LEVEL", "debug");

        let config = EnhancedConfig::apply_env_overrides(EnhancedConfig::default());
        assert_eq!(config.app.theme, "dark");
        assert_eq!(config.app.log_level, "debug");

        std::env::remove_var("CORTEX_THEME");
        std::env::remove_var("CORTEX_LOG_LEVEL");
    }

    #[test]
    fn test_mcp_server_config() {
        let servers = create_default_mcp_servers();
        assert!(!servers.is_empty());

        let server = &servers[0];
        assert_eq!(server.name, "brainwav-mcp");
        assert!(server.auto_start);
        assert!(matches!(server.restart_policy, RestartPolicy::OnFailure));
    }

    #[test]
    fn test_provider_configs() {
        let providers = ProviderConfigs::default();
        assert_eq!(providers.default, "openai");
        assert!(providers.openai.is_some());

        let openai = providers.openai.unwrap();
        assert_eq!(openai.model, "gpt-4");
        assert_eq!(openai.temperature, 0.7);
    }

    #[test]
    fn test_config_serialization() {
        let config = EnhancedConfig::default();
        let serialized = toml::to_string(&config).expect("Failed to serialize config");
        let deserialized: EnhancedConfig = toml::from_str(&serialized)
            .expect("Failed to deserialize config");

        assert_eq!(config.app.theme, deserialized.app.theme);
        assert_eq!(config.providers.default, deserialized.providers.default);
    }
}
