use crate::error::{ConfigError, Result};
use crate::providers::{create_provider, ModelProvider};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

pub mod env_integration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub description: String,

    pub providers: ProvidersConfig,
    pub features: FeaturesConfig,
    pub security: SecurityConfig,
    pub ui: UiConfig,

    // Legacy compatibility
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<ProviderConfig>,
    #[serde(rename = "github-models", skip_serializing_if = "Option::is_none")]
    pub github_models: Option<GitHubModelsConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub openai: Option<OpenAIConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anthropic: Option<AnthropicConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcp: Option<McpConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<MemoryConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub privacy: Option<PrivacyConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tui: Option<TuiConfig>,
}

// New cortex.json configuration structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvidersConfig {
    pub default: String,
    pub fallback: Vec<String>,
    pub config: std::collections::HashMap<String, ProviderConfigEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfigEntry {
    pub base_url: Option<String>,
    pub models: Option<Vec<String>>,
    pub free_tier: Option<bool>,
    pub requires_key: Option<bool>,
    pub requires_installation: Option<String>,
    pub rate_limits: Option<RateLimits>,
    #[serde(rename = "type")]
    pub provider_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimits {
    pub requests_per_minute: Option<u32>,
    pub tokens_per_minute: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturesConfig {
    pub tui: TuiFeatureConfig,
    pub daemon: DaemonFeatureConfig,
    pub mcp: McpFeatureConfig,
    pub memory: MemoryFeatureConfig,
    pub metrics: MetricsFeatureConfig,
    pub streaming: StreamingFeatureConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuiFeatureConfig {
    pub enabled: bool,
    pub framework: Option<String>,
    pub version: Option<String>,
    pub accessibility: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonFeatureConfig {
    pub enabled: bool,
    pub port: u16,
    pub bind_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpFeatureConfig {
    pub enabled: bool,
    pub servers: Vec<McpServerEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerEntry {
    pub name: String,
    pub command: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryFeatureConfig {
    pub enabled: bool,
    pub backend: String,
    pub retention_days: u32,
    pub audit_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsFeatureConfig {
    pub enabled: bool,
    pub prometheus_endpoint: String,
    pub health_endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingFeatureConfig {
    pub enabled: bool,
    pub chunk_size: u32,
    pub timeout_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub network: NetworkSecurityConfig,
    pub execution: ExecutionSecurityConfig,
    pub data: DataSecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSecurityConfig {
    pub bind_localhost_only: bool,
    pub tls_enabled: bool,
    pub cors_enabled: bool,
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionSecurityConfig {
    pub sandbox_enabled: bool,
    pub command_injection_protection: bool,
    pub input_validation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSecurityConfig {
    pub encryption_at_rest: bool,
    pub pii_detection: bool,
    pub audit_logging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: String,
    pub keybindings: String,
    pub vim_mode: bool,
    pub components: UiComponentsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiComponentsConfig {
    pub chat_widget: ComponentConfig,
    pub command_palette: ComponentConfig,
    pub file_tree: ComponentConfig,
    pub diff_viewer: ComponentConfig,
    pub status_bar: ComponentConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentConfig {
    pub enabled: bool,
    #[serde(flatten)]
    pub extra: Value,
}

// Legacy compatibility structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub default: String,
    pub fallback: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubModelsConfig {
    pub model: String,
    pub endpoint: String,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub api_key: String,
    pub model: String,
    pub endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicConfig {
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    pub servers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    pub path: String,
    pub retention_days: u32,
    pub audit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyConfig {
    pub zdr: bool,
    pub telemetry: bool,
    pub redact_secrets: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuiConfig {
    pub theme: String,
    pub scrollback: usize,
    pub highlight_syntax: bool,
}

impl Default for Config {
    fn default() -> Self {
        use std::collections::HashMap;

        let mut provider_configs = HashMap::new();
        provider_configs.insert("github".to_string(), ProviderConfigEntry {
            base_url: Some("https://models.inference.ai.azure.com".to_string()),
            models: Some(vec!["gpt-4o-mini".to_string(), "gpt-4o".to_string(), "gpt-3.5-turbo".to_string()]),
            free_tier: Some(true),
            requires_key: Some(false),
            requires_installation: None,
            rate_limits: Some(RateLimits {
                requests_per_minute: Some(60),
                tokens_per_minute: Some(150000),
            }),
            provider_type: None,
        });
        provider_configs.insert("openai".to_string(), ProviderConfigEntry {
            base_url: Some("https://api.openai.com/v1".to_string()),
            models: Some(vec!["gpt-4".to_string(), "gpt-4-turbo".to_string(), "gpt-3.5-turbo".to_string()]),
            free_tier: Some(false),
            requires_key: Some(true),
            requires_installation: None,
            rate_limits: None,
            provider_type: None,
        });
        provider_configs.insert("anthropic".to_string(), ProviderConfigEntry {
            base_url: Some("https://api.anthropic.com".to_string()),
            models: Some(vec!["claude-3-sonnet".to_string(), "claude-3-haiku".to_string(), "claude-3-opus".to_string()]),
            free_tier: Some(false),
            requires_key: Some(true),
            requires_installation: None,
            rate_limits: None,
            provider_type: None,
        });
        provider_configs.insert("mlx".to_string(), ProviderConfigEntry {
            base_url: None,
            models: Some(vec!["mlx-community/Llama-3.1-8B-Instruct".to_string()]),
            free_tier: Some(true),
            requires_key: Some(false),
            requires_installation: Some("pip install mlx-lm".to_string()),
            rate_limits: None,
            provider_type: Some("local".to_string()),
        });

        let mut components = std::collections::HashMap::new();
        components.insert("enabled".to_string(), serde_json::json!(true));

        Self {
            name: "Cortex Code".to_string(),
            version: "2.0.0".to_string(),
            description: "AI-powered terminal interface for Cortex-OS".to_string(),

            providers: ProvidersConfig {
                default: "github".to_string(),
                fallback: vec!["openai".to_string(), "anthropic".to_string(), "mlx".to_string()],
                config: provider_configs,
            },

            features: FeaturesConfig {
                tui: TuiFeatureConfig {
                    enabled: true,
                    framework: Some("ratatui".to_string()),
                    version: Some("0.29.0".to_string()),
                    accessibility: Some("wcag-2.2-aa".to_string()),
                },
                daemon: DaemonFeatureConfig {
                    enabled: true,
                    port: 8080,
                    bind_address: "127.0.0.1".to_string(),
                },
                mcp: McpFeatureConfig {
                    enabled: true,
                    servers: vec![
                        McpServerEntry {
                            name: "cortex-fs".to_string(),
                            command: "cortex-mcp-fs".to_string(),
                            description: Some("File system operations".to_string()),
                        },
                        McpServerEntry {
                            name: "cortex-git".to_string(),
                            command: "cortex-mcp-git".to_string(),
                            description: Some("Git operations".to_string()),
                        },
                    ],
                },
                memory: MemoryFeatureConfig {
                    enabled: true,
                    backend: "agents_md".to_string(),
                    retention_days: 30,
                    audit_enabled: true,
                },
                metrics: MetricsFeatureConfig {
                    enabled: true,
                    prometheus_endpoint: "/metrics".to_string(),
                    health_endpoint: "/health".to_string(),
                },
                streaming: StreamingFeatureConfig {
                    enabled: true,
                    chunk_size: 1024,
                    timeout_ms: 30000,
                },
            },

            security: SecurityConfig {
                network: NetworkSecurityConfig {
                    bind_localhost_only: true,
                    tls_enabled: false,
                    cors_enabled: true,
                    allowed_origins: vec!["http://localhost:*".to_string()],
                },
                execution: ExecutionSecurityConfig {
                    sandbox_enabled: true,
                    command_injection_protection: true,
                    input_validation: true,
                },
                data: DataSecurityConfig {
                    encryption_at_rest: false,
                    pii_detection: true,
                    audit_logging: true,
                },
            },

            ui: UiConfig {
                theme: "dark".to_string(),
                keybindings: "default".to_string(),
                vim_mode: false,
                components: UiComponentsConfig {
                    chat_widget: ComponentConfig {
                        enabled: true,
                        extra: serde_json::json!({
                            "streaming": true,
                            "history_size": 1000
                        }),
                    },
                    command_palette: ComponentConfig {
                        enabled: true,
                        extra: serde_json::json!({
                            "fuzzy_search": true,
                            "max_results": 10
                        }),
                    },
                    file_tree: ComponentConfig {
                        enabled: false,
                        extra: serde_json::json!({
                            "show_hidden": false,
                            "git_integration": true
                        }),
                    },
                    diff_viewer: ComponentConfig {
                        enabled: true,
                        extra: serde_json::json!({
                            "syntax_highlighting": true,
                            "side_by_side": true
                        }),
                    },
                    status_bar: ComponentConfig {
                        enabled: true,
                        extra: serde_json::json!({
                            "show_provider": true,
                            "show_model": true,
                            "show_tokens": true
                        }),
                    },
                },
            },

            // Legacy compatibility - all None
            provider: None,
            github_models: None,
            openai: None,
            anthropic: None,
            mcp: None,
            memory: None,
            privacy: None,
            tui: None,
        }
    }
}

impl Config {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .map_err(|_| ConfigError::NotFound(path.display().to_string()))?;

        let config: Config = if path.extension().and_then(|s| s.to_str()) == Some("json") {
            serde_json::from_str(&content)?
        } else {
            toml::from_str(&content)?
        };

        config.validate()?;
        Ok(config)
    }

    pub fn from_default_locations() -> Result<Self> {
        let project_dirs = ProjectDirs::from("ai", "cortex-os", "cortex")
            .ok_or_else(|| ConfigError::NotFound("Could not determine config directory".to_string()))?;

        let config_dir = project_dirs.config_dir();
        let current_dir = std::env::current_dir().unwrap_or_default();
        let home_dir = dirs::home_dir().unwrap_or_default();

        // Check for profile-specific config first
        let profile_manager = env_integration::ProfileManager::new();
        let profile_path = profile_manager.get_profile_config_path();
        if profile_path.exists() {
            let mut config = Self::from_file(&profile_path)?;
            return Ok(Self::apply_env_overrides(config));
        }

        let config_paths = vec![
            // Check for cortex.json first (new format)
            current_dir.join("cortex.json"),
            home_dir.join(".cortex").join("cortex.json"),
            config_dir.join("cortex.json"),

            // Fallback to legacy config.toml
            config_dir.join("config.toml"),
            home_dir.join(".cortex").join("config.toml"),
        ];

        for path in config_paths {
            if path.exists() {
                let mut config = Self::from_file(&path)?;
                return Ok(Self::apply_env_overrides(config));
            }
        }

        // Return default config with env overrides applied
        Ok(Self::apply_env_overrides(Self::default()))
    }

    /// Apply environment variable overrides to the configuration
    pub fn apply_env_overrides(mut config: Config) -> Config {
        let env_resolver = env_integration::EnvResolver::new();
        let credentials = env_integration::EnvResolver::get_provider_credentials();

        // Apply environment overrides to JSON representation
        let config_json = serde_json::to_value(&config).unwrap_or_default();
        let overridden_json = env_resolver.apply_env_overrides(config_json);

        // Parse back to Config struct
        if let Ok(overridden_config) = serde_json::from_value(overridden_json) {
            config = overridden_config;
        }

        // Apply provider credentials
        if let Some(default_provider) = credentials.default_provider {
            config.providers.default = default_provider;
        }

        // Override daemon settings
        if let Some(port) = credentials.daemon_port {
            config.features.daemon.port = port;
        }

        if let Some(bind_address) = credentials.bind_address {
            config.features.daemon.bind_address = bind_address;
        }

        // Override security settings
        if let Some(tls_enabled) = credentials.tls_enabled {
            config.security.network.tls_enabled = tls_enabled;
        }

        if let Some(cors_origins) = credentials.cors_origins {
            config.security.network.allowed_origins = cors_origins;
        }

        // Override privacy settings
        if credentials.memory_disabled {
            config.features.memory.enabled = false;
        }

        config
    }

    pub fn create_provider(&self) -> Result<Box<dyn ModelProvider>> {
        create_provider(self)
    }

    // Provider configuration helpers
    pub fn get_default_provider(&self) -> &str {
        if let Some(legacy) = &self.provider {
            &legacy.default
        } else {
            &self.providers.default
        }
    }

    pub fn get_fallback_providers(&self) -> &[String] {
        if let Some(legacy) = &self.provider {
            &legacy.fallback
        } else {
            &self.providers.fallback
        }
    }

    pub fn get_provider_config(&self, provider_name: &str) -> Option<&ProviderConfigEntry> {
        self.providers.config.get(provider_name)
    }

    // Memory configuration helpers
    pub fn get_agents_md_path(&self) -> PathBuf {
        let path = if let Some(legacy) = &self.memory {
            &legacy.path
        } else {
            "~/.cortex/agents.md"
        };

        if path.starts_with('~') {
            let home = dirs::home_dir().unwrap_or_default();
            PathBuf::from(path.replace("~", &home.display().to_string()))
        } else {
            PathBuf::from(path)
        }
    }

    pub fn enable_memory(&self) -> Option<bool> {
        if let Some(legacy_privacy) = &self.privacy {
            Some(!legacy_privacy.zdr)
        } else {
            Some(self.features.memory.enabled)
        }
    }

    pub fn memory_retention_days(&self) -> Option<u32> {
        if let Some(legacy) = &self.memory {
            Some(legacy.retention_days)
        } else {
            Some(self.features.memory.retention_days)
        }
    }

    pub fn enable_audit(&self) -> Option<bool> {
        if let Some(legacy) = &self.memory {
            Some(legacy.audit)
        } else {
            Some(self.features.memory.audit_enabled)
        }
    }

    // Feature configuration helpers
    pub fn is_daemon_enabled(&self) -> bool {
        self.features.daemon.enabled
    }

    pub fn get_daemon_port(&self) -> u16 {
        self.features.daemon.port
    }

    pub fn get_daemon_bind_address(&self) -> &str {
        &self.features.daemon.bind_address
    }

    pub fn is_mcp_enabled(&self) -> bool {
        self.features.mcp.enabled
    }

    pub fn get_mcp_servers(&self) -> &[McpServerEntry] {
        &self.features.mcp.servers
    }

    pub fn is_streaming_enabled(&self) -> bool {
        self.features.streaming.enabled
    }

    pub fn get_streaming_chunk_size(&self) -> u32 {
        self.features.streaming.chunk_size
    }

    fn validate(&self) -> Result<()> {
        let default_provider = self.get_default_provider();
        if default_provider.is_empty() {
            return Err(ConfigError::MissingField("providers.default".to_string()).into());
        }

        // Validate that default provider exists in config or is a known provider
        let known_providers = vec!["github", "openai", "anthropic", "mlx", "github-models", "local-mlx"];

        if !known_providers.contains(&default_provider) && !self.providers.config.contains_key(default_provider) {
            return Err(ConfigError::InvalidValue {
                field: "providers.default".to_string(),
                value: default_provider.to_string(),
            }.into());
        }

        // Validate daemon configuration
        if self.features.daemon.enabled {
            if self.features.daemon.port == 0 {
                return Err(ConfigError::InvalidValue {
                    field: "features.daemon.port".to_string(),
                    value: "0".to_string(),
                }.into());
            }
        }

        // Validate UI components
        if !vec!["dark", "light", "auto"].contains(&self.ui.theme.as_str()) {
            return Err(ConfigError::InvalidValue {
                field: "ui.theme".to_string(),
                value: self.ui.theme.clone(),
            }.into());
        }

        Ok(())
    }
}

// Helper to get home directory fallback
mod dirs {
    use std::path::PathBuf;

    pub fn home_dir() -> Option<PathBuf> {
        directories::UserDirs::new().map(|dirs| dirs.home_dir().to_path_buf())
    }
}
