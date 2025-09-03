use crate::config::Config;
use crate::features::{FeatureManager, FeatureConfig};
use crate::memory::{MemoryStorage, storage::MemoryConfig};
use crate::mcp::McpService;
use crate::mcp::service::McpServerConfig;
use serde::{Serialize, Deserialize};
use crate::providers::ModelProvider;
use crate::server::DaemonServer;
use crate::Result;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct CortexApp {
    config: Config,
    provider: Arc<Mutex<Box<dyn ModelProvider>>>,
    memory: Option<MemoryStorage>,
    mcp_service: Arc<McpService>,
    state: AppState,
    feature_manager: Arc<FeatureManager>,
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub current_conversation: Vec<Message>,
    pub is_running: bool,
}

#[derive(Debug, Clone)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
    pub timestamp: std::time::SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug)]
pub struct McpServerInfo {
    pub name: String,
    pub status: String,
}

impl CortexApp {
    pub async fn new(config: Config) -> Result<Self> {
        let provider = config.create_provider()?;

        // Initialize feature manager
        let feature_config = FeatureConfig::default();
        let environment = std::env::var("CORTEX_ENV").unwrap_or_else(|_| "development".to_string());
        let user_id = std::env::var("CORTEX_USER_ID").ok();
        let feature_manager = Arc::new(FeatureManager::new(feature_config, environment, user_id));

        // Initialize memory storage if enabled
        let memory = if config.enable_memory().unwrap_or(true) {
            let memory_config = MemoryConfig::default()
                .with_path(config.get_agents_md_path())
                .with_retention_days(config.memory_retention_days().unwrap_or(30))
                .with_audit_enabled(config.enable_audit().unwrap_or(true));

            Some(MemoryStorage::new(memory_config).await?)
        } else {
            None
        };

        // Initialize MCP service
        let mcp_service = Arc::new(McpService::new().await?);

        Ok(Self {
            config,
            provider: Arc::new(Mutex::new(provider)),
            memory,
            mcp_service,
            state: AppState {
                current_conversation: Vec::new(),
                is_running: true,
            },
            feature_manager,
        })
    }

    pub async fn run_tui(&mut self) -> Result<()> {
        // This is now handled by main.rs with the actual TUI loop
        println!("TUI mode - this should not be called directly");
        Ok(())
    }

    pub async fn run_ci(&mut self, prompt: &str, output_format: &str) -> Result<()> {
        let provider = self.provider.lock().await;
        let response = provider.complete(prompt).await?;

        match output_format {
            "json" => {
                let output = serde_json::json!({
                    "message": response,
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    "provider": provider.provider_name()
                });
                println!("{}", serde_json::to_string_pretty(&output)?);
            }
            "text" | _ => {
                println!("{}", response);
            }
        }

        Ok(())
    }

    pub async fn run_single(&mut self, prompt: &str) -> Result<()> {
        let provider = self.provider.lock().await;
        let response = provider.complete(prompt).await?;
        println!("{}", response);
        Ok(())
    }

    pub async fn run_daemon(&mut self, port: u16) -> Result<()> {
        let daemon = DaemonServer::new(self.clone(), port);
        daemon.start().await
    }

    pub async fn get_ai_response(&mut self, prompt: &str) -> Result<String> {
        let provider = self.provider.lock().await;
        provider.complete(prompt).await
    }

    pub async fn list_mcp_servers(&self) -> Result<Vec<McpServerInfo>> {
        let servers = self.mcp_service.list_servers().await?
            .into_iter()
            .map(|server| McpServerInfo {
                name: server.name,
                status: server.status,
            })
            .collect();
        Ok(servers)
    }

    pub async fn add_mcp_server(&mut self, name: &str, config_str: &str) -> Result<()> {
        // Parse the config string as JSON
        let config: McpServerConfig = serde_json::from_str(config_str)
            .map_err(|e| crate::error::Error::Config(
                crate::error::ConfigError::InvalidValue {
                    field: "mcp_server_config".to_string(),
                    value: format!("Invalid MCP server config: {}", e)
                }
            ))?;

        self.mcp_service.add_server(name, config).await?;
        Ok(())
    }

    pub async fn remove_mcp_server(&mut self, name: &str) -> Result<()> {
        self.mcp_service.remove_server(name).await?;
        Ok(())
    }

    // Memory management methods for daemon API
    pub fn get_memory_storage(&self) -> Result<&MemoryStorage> {
        self.memory.as_ref().ok_or_else(||
            crate::error::Error::Config(crate::error::ConfigError::MissingField("Memory storage not enabled".to_string()))
        )
    }

    // Provider management methods for daemon API
    pub async fn get_available_providers(&self) -> Vec<String> {
        vec!["github".to_string(), "openai".to_string(), "anthropic".to_string(), "mlx".to_string()]
    }

    pub async fn get_provider_models(&self, provider: &str) -> Vec<String> {
        match provider {
            "github" => vec!["gpt-4o-mini".to_string(), "gpt-4o".to_string(), "gpt-3.5-turbo".to_string()],
            "openai" => vec!["gpt-4".to_string(), "gpt-4-turbo".to_string(), "gpt-3.5-turbo".to_string()],
            "anthropic" => vec!["claude-3-sonnet".to_string(), "claude-3-haiku".to_string(), "claude-3-opus".to_string()],
            "mlx" => vec!["local-model".to_string()],
            _ => vec![],
        }
    }

    // Add this new method to get current provider information
    pub async fn get_current_provider_info(&self) -> (String, Vec<String>) {
        let provider = self.provider.lock().await;
        let provider_name = provider.provider_name().to_string();
        let models = provider.supported_models();
        (provider_name, models)
    }

    // Add this new method to switch providers
    pub async fn switch_provider(&mut self, provider_name: &str) -> Result<()> {
        // Update the config with the new provider
        self.config.providers.default = provider_name.to_string();

        // Create the new provider
        let new_provider = self.config.create_provider()?;

        // Replace the current provider
        {
            let mut provider = self.provider.lock().await;
            *provider = new_provider;
        }

        Ok(())
    }

    // Feature management methods
    pub async fn is_feature_enabled(&self, feature: &str) -> bool {
        self.feature_manager.is_enabled(feature).await
    }

    pub async fn enable_feature(&self, feature: &str) -> Result<()> {
        self.feature_manager.enable_feature_for_user(feature).await
            .map_err(|e| crate::error::Error::Other(anyhow::anyhow!(e.to_string())))
    }

    pub async fn disable_feature(&self, feature: &str) -> Result<()> {
        self.feature_manager.disable_feature_for_user(feature).await
            .map_err(|e| crate::error::Error::Other(anyhow::anyhow!(e.to_string())))
    }

    pub async fn get_feature_stats(&self) -> Result<serde_json::Value> {
        let stats = self.feature_manager.get_feature_stats().await;
        Ok(serde_json::to_value(stats)?)
    }

    pub fn get_feature_manager(&self) -> Arc<FeatureManager> {
        Arc::clone(&self.feature_manager)
    }
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::User,
            content: content.into(),
            timestamp: std::time::SystemTime::now(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::Assistant,
            content: content.into(),
            timestamp: std::time::SystemTime::now(),
        }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::System,
            content: content.into(),
            timestamp: std::time::SystemTime::now(),
        }
    }
}
