use crate::error::{ConfigError, Result};
use crate::providers::{create_provider, ModelProvider};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub provider: ProviderConfig,
    #[serde(rename = "github-models")]
    pub github_models: GitHubModelsConfig,
    pub openai: Option<OpenAIConfig>,
    pub anthropic: Option<AnthropicConfig>,
    pub mcp: McpConfig,
    pub memory: MemoryConfig,
    pub privacy: PrivacyConfig,
    pub tui: TuiConfig,
}

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
        Self {
            provider: ProviderConfig {
                default: "github-models".to_string(),
                fallback: vec!["openai".to_string(), "local-mlx".to_string()],
            },
            github_models: GitHubModelsConfig {
                model: "openai/gpt-4o-mini".to_string(),
                endpoint: "https://models.github.ai".to_string(),
                token: None,
            },
            openai: None,
            anthropic: None,
            mcp: McpConfig {
                servers: vec!["cortex.fs".to_string(), "cortex.git".to_string()],
            },
            memory: MemoryConfig {
                path: "~/.cortex/agents.md".to_string(),
                retention_days: 30,
                audit: true,
            },
            privacy: PrivacyConfig {
                zdr: true,
                telemetry: false,
                redact_secrets: true,
            },
            tui: TuiConfig {
                theme: "dark".to_string(),
                scrollback: 1000,
                highlight_syntax: true,
            },
        }
    }
}

impl Config {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .map_err(|_| ConfigError::NotFound(path.display().to_string()))?;
        
        let config: Config = toml::from_str(&content)?;
        config.validate()?;
        Ok(config)
    }
    
    pub fn from_default_locations() -> Result<Self> {
        let project_dirs = ProjectDirs::from("ai", "cortex-os", "cortex")
            .ok_or_else(|| ConfigError::NotFound("Could not determine config directory".to_string()))?;
        
        let config_dir = project_dirs.config_dir();
        let config_paths = vec![
            config_dir.join("config.toml"),
            PathBuf::from(dirs::home_dir().unwrap_or_default()).join(".cortex").join("config.toml"),
        ];
        
        for path in config_paths {
            if path.exists() {
                return Self::from_file(&path);
            }
        }
        
        // Return default config if none found
        Ok(Self::default())
    }
    
    pub fn create_provider(&self) -> Result<Box<dyn ModelProvider>> {
        create_provider(self)
    }
    
    // Memory configuration helpers
    pub fn get_agents_md_path(&self) -> PathBuf {
        let path = if self.memory.path.starts_with('~') {
            let home = dirs::home_dir().unwrap_or_default();
            PathBuf::from(self.memory.path.replace("~", &home.display().to_string()))
        } else {
            PathBuf::from(&self.memory.path)
        };
        path
    }
    
    pub fn enable_memory(&self) -> Option<bool> {
        Some(!self.privacy.zdr)
    }
    
    pub fn memory_retention_days(&self) -> Option<u32> {
        Some(self.memory.retention_days)
    }
    
    pub fn enable_audit(&self) -> Option<bool> {
        Some(self.memory.audit)
    }
    
    fn validate(&self) -> Result<()> {
        if self.provider.default.is_empty() {
            return Err(ConfigError::MissingField("provider.default".to_string()).into());
        }
        
        // Validate provider-specific configs
        match self.provider.default.as_str() {
            "github-models" => {
                if self.github_models.model.is_empty() {
                    return Err(ConfigError::MissingField("github-models.model".to_string()).into());
                }
            }
            "openai" => {
                if self.openai.is_none() {
                    return Err(ConfigError::MissingField("openai".to_string()).into());
                }
            }
            "anthropic" => {
                if self.anthropic.is_none() {
                    return Err(ConfigError::MissingField("anthropic".to_string()).into());
                }
            }
            "local-mlx" => {
                // Local MLX has no required config
            }
            _ => {
                return Err(ConfigError::InvalidValue {
                    field: "provider.default".to_string(),
                    value: self.provider.default.clone(),
                }.into());
            }
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