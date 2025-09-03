use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use directories::ProjectDirs;
use anyhow::Result;

/// Enhanced configuration inspired by OpenAI Codex and SST OpenCode patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedConfig {
    /// Core application settings
    pub app: AppConfig,

    /// AI provider configurations
    pub providers: ProviderConfigs,

    /// MCP server configurations
    pub mcp_servers: Vec<McpServerConfig>,

    /// WebUI settings (for future implementation)
    pub webui: WebUIConfig,

    /// Client-server architecture settings
    pub server: ServerConfig,

    /// Development and debugging settings
    pub dev: DevConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Application theme
    pub theme: String,

    /// Logging level
    pub log_level: String,

    /// Auto-save interval in seconds
    pub auto_save_interval: u64,

    /// Enable telemetry
    pub enable_telemetry: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfigs {
    /// Default provider
    pub default: String,

    /// Provider-specific configurations
    pub openai: Option<OpenAIConfig>,
    pub anthropic: Option<AnthropicConfig>,
    pub github: Option<GitHubConfig>,
    pub local: Option<LocalConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub name: String,
    pub command: Vec<String>,
    pub args: Vec<String>,
    pub env: Option<std::collections::HashMap<String, String>>,
    pub auto_start: bool,
    /// Path to MCP package directory
    pub package_path: Option<PathBuf>,
    /// Remote MCP server URL (for existing servers)
    pub remote_url: Option<String>,
    /// Connection timeout in seconds
    pub timeout: Option<u64>,
}

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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    /// Enable daemon mode
    pub daemon_mode: bool,

    /// Server port for daemon mode
    pub port: u16,

    /// Unix socket path (for local communication)
    pub socket_path: Option<PathBuf>,

    /// Enable hot reload for development
    pub hot_reload: bool,

    /// Cloudflare tunnel configuration
    pub cloudflare: Option<CloudflareConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudflareConfig {
    /// Cloudflare tunnel token
    pub tunnel_token: Option<String>,

    /// Tunnel name/ID
    pub tunnel_name: String,

    /// Enable tunnel on startup
    pub auto_start: bool,

    /// Custom domain for the tunnel
    pub domain: Option<String>,

    /// Tunnel configuration file path
    pub config_path: Option<PathBuf>,

    /// Enable tunnel health checks
    pub health_checks: bool,
}

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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub method: AuthMethod,
    pub secret_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthMethod {
    None,
    ApiKey,
    OAuth,
}

// Provider-specific configs...
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: String,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    pub api_key: Option<String>,
    pub model: String,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubConfig {
    pub token: Option<String>,
    pub models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalConfig {
    pub mlx_path: Option<PathBuf>,
    pub model_path: Option<PathBuf>,
    pub max_memory_gb: u32,
}

impl Default for EnhancedConfig {
    fn default() -> Self {
        Self {
            app: AppConfig {
                theme: "default".to_string(),
                log_level: "info".to_string(),
                auto_save_interval: 30,
                enable_telemetry: false,
            },
            providers: ProviderConfigs {
                default: "openai".to_string(),
                openai: Some(OpenAIConfig {
                    api_key: None,
                    base_url: None,
                    model: "gpt-4".to_string(),
                    temperature: 0.7,
                }),
                anthropic: None,
                github: None,
                local: None,
            },
            mcp_servers: vec![
                McpServerConfig {
                    name: "brainwav-mcp".to_string(),
                    command: vec![],
                    args: vec![],
                    env: None,
                    auto_start: true,
                    package_path: Some(PathBuf::from("/Users/jamiecraik/.Cortex-OS/packages/mcp")),
                    remote_url: Some("http://localhost:3000".to_string()),
                    timeout: Some(30),
                },
            ],
            webui: WebUIConfig {
                enabled: true,
                port: 3000,
                host: "127.0.0.1".to_string(),
                cors_enabled: true,
                auth: None,
            },
            server: ServerConfig {
                daemon_mode: false,
                port: 8080,
                socket_path: None,
                hot_reload: false,
                cloudflare: Some(CloudflareConfig {
                    tunnel_token: None,
                    tunnel_name: "mcp-brainwav".to_string(),
                    auto_start: false,
                    domain: Some("mcp.brainwav.io".to_string()),
                    config_path: None,
                    health_checks: true,
                }),
            },
            dev: DevConfig {
                enabled: false,
                file_watching: false,
                performance_monitoring: false,
                debug_endpoints: false,
            },
        }
    }
}

impl EnhancedConfig {
    /// Load configuration with fallback strategy inspired by SST OpenCode
    pub fn load() -> Result<Self> {
        // Priority order:
        // 1. Environment variables
        // 2. ~/.cortex/config.toml
        // 3. Project-local .cortex.toml
        // 4. Default configuration

        let project_dirs = ProjectDirs::from("org", "cortex-os", "cortex-code")
            .ok_or_else(|| anyhow::anyhow!("Failed to get project directories"))?;

        let config_paths = vec![
            std::env::current_dir()?.join(".cortex.toml"),
            project_dirs.config_dir().join("config.toml"),
        ];

        for path in config_paths {
            if path.exists() {
                let content = std::fs::read_to_string(&path)?;
                let config: EnhancedConfig = toml::from_str(&content)?;
                return Ok(config);
            }
        }

        Ok(Self::default())
    }

    /// Save configuration
    pub fn save(&self) -> Result<()> {
        let project_dirs = ProjectDirs::from("org", "cortex-os", "cortex-code")
            .ok_or_else(|| anyhow::anyhow!("Failed to get project directories"))?;

        let config_dir = project_dirs.config_dir();
        std::fs::create_dir_all(config_dir)?;

        let config_path = config_dir.join("config.toml");
        let content = toml::to_string_pretty(self)?;
        std::fs::write(config_path, content)?;

        Ok(())
    }
}
