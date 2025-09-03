use crate::{
    enhanced_config::EnhancedConfig,
    mcp::BrainwavMcpClient,
    cloudflare::CloudflareManager,
    Result,
};
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// Integration manager for Brainwav MCP server with Cloudflare tunnel
pub struct BrainwavIntegration {
    config: EnhancedConfig,
    mcp_client: Arc<RwLock<Option<BrainwavMcpClient>>>,
    cloudflare: Option<Arc<CloudflareManager>>,
    tunnel_url: Arc<RwLock<Option<String>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegrationStatus {
    pub mcp_connected: bool,
    pub tunnel_active: bool,
    pub tunnel_url: Option<String>,
    pub local_url: String,
    pub package_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BrainwavSession {
    pub session_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub mcp_tools: Vec<String>,
    pub tunnel_url: Option<String>,
}

impl BrainwavIntegration {
    pub fn new(config: EnhancedConfig) -> Result<Self> {
        let cloudflare = if let Some(cf_config) = &config.server.cloudflare {
            Some(Arc::new(CloudflareManager::new(cf_config.clone())))
        } else {
            None
        };

        Ok(Self {
            config,
            mcp_client: Arc::new(RwLock::new(None)),
            cloudflare,
            tunnel_url: Arc::new(RwLock::new(None)),
        })
    }

    /// Initialize the complete integration
    pub async fn initialize(&self) -> Result<BrainwavSession> {
        info!("Initializing Brainwav integration");

        let session_id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now();

        // 1. Connect to MCP server
        let mcp_tools = self.connect_mcp().await?;

        // 2. Start tunnel if configured
        let tunnel_url = self.setup_tunnel().await?;

        // 3. Update tunnel URL storage
        if let Some(url) = &tunnel_url {
            *self.tunnel_url.write().await = Some(url.clone());
        }

        let session = BrainwavSession {
            session_id,
            created_at,
            mcp_tools,
            tunnel_url,
        };

        info!("Brainwav integration initialized successfully");
        Ok(session)
    }

    /// Connect to the MCP server
    async fn connect_mcp(&self) -> Result<Vec<String>> {
        // Find the Brainwav MCP server configuration
        let mcp_config = self.config.mcp_servers
            .iter()
            .find(|server| server.name.contains("brainwav") || server.name.contains("mcp"))
            .ok_or_else(|| anyhow!("No Brainwav MCP server configuration found"))?;

        info!("Connecting to MCP server: {}", mcp_config.name);

        let mut client = BrainwavMcpClient::new(mcp_config.clone())?;
        client.connect().await?;

        // Get available tools
        let tools = client.list_tools().await?;
        let tool_names: Vec<String> = tools.iter().map(|t| t.name.clone()).collect();

        info!("Connected to MCP server with {} tools: {:?}", tool_names.len(), tool_names);

        // Store the connected client
        *self.mcp_client.write().await = Some(client);

        Ok(tool_names)
    }

    /// Setup Cloudflare tunnel
    async fn setup_tunnel(&self) -> Result<Option<String>> {
        if let Some(ref cloudflare) = self.cloudflare {
            info!("Setting up Cloudflare tunnel");

            // Use port 3000 to match your existing setup
            let local_port = 3000;

            if let Ok(url) = cloudflare.start_tunnel(local_port).await {
                info!("Cloudflare tunnel active: {}", url);
                return Ok(Some(url));
            } else {
                warn!("Could not start new tunnel, using existing domain");
                // Use the configured domain if tunnel start fails
                if let Some(domain) = &self.config.server.cloudflare.as_ref().unwrap().domain {
                    return Ok(Some(format!("https://{}", domain)));
                }
            }
        }

        Ok(None)
    }

    /// Get current integration status
    pub async fn get_status(&self) -> Result<IntegrationStatus> {
        let mcp_guard = self.mcp_client.read().await;
        let mcp_connected = mcp_guard.as_ref().map(|c| c.is_connected()).unwrap_or(false);

        let package_path = mcp_guard.as_ref()
            .and_then(|c| c.get_package_path())
            .map(|p| p.to_string_lossy().to_string());

        let tunnel_url = self.tunnel_url.read().await.clone();
        let tunnel_active = tunnel_url.is_some();

        Ok(IntegrationStatus {
            mcp_connected,
            tunnel_active,
            tunnel_url,
            local_url: "http://localhost:3000".to_string(),
            package_path,
        })
    }

    /// Execute an MCP tool through the integration
    pub async fn execute_tool(&self, tool_name: &str, arguments: serde_json::Value) -> Result<serde_json::Value> {
        let mcp_guard = self.mcp_client.read().await;
        let client = mcp_guard.as_ref()
            .ok_or_else(|| anyhow!("MCP client not connected"))?;

        info!("Executing MCP tool: {} with args: {}", tool_name, arguments);

        let result = client.call_tool(tool_name, arguments).await?;

        debug!("Tool execution result: {}", result);
        Ok(result)
    }

    /// List available MCP tools
    pub async fn list_tools(&self) -> Result<Vec<String>> {
        let mcp_guard = self.mcp_client.read().await;
        let client = mcp_guard.as_ref()
            .ok_or_else(|| anyhow!("MCP client not connected"))?;

        let tools = client.list_tools().await?;
        Ok(tools.iter().map(|t| t.name.clone()).collect())
    }

    /// Get MCP resources
    pub async fn list_resources(&self) -> Result<Vec<serde_json::Value>> {
        let mcp_guard = self.mcp_client.read().await;
        let client = mcp_guard.as_ref()
            .ok_or_else(|| anyhow!("MCP client not connected"))?;

        let resources = client.list_resources().await?;
        Ok(resources.iter().map(|r| serde_json::to_value(r).unwrap()).collect())
    }

    /// Get the tunnel URL for external access
    pub async fn get_tunnel_url(&self) -> Option<String> {
        self.tunnel_url.read().await.clone()
    }

    /// Get the local connection URL
    pub fn get_local_url(&self) -> String {
        format!("http://localhost:{}", self.config.webui.port)
    }

    /// Check if everything is properly connected
    pub async fn health_check(&self) -> Result<bool> {
        // Check MCP connection
        let mcp_guard = self.mcp_client.read().await;
        let mcp_ok = mcp_guard.as_ref().map(|c| c.is_connected()).unwrap_or(false);

        if !mcp_ok {
            warn!("MCP health check failed");
            return Ok(false);
        }

        // Check tunnel if configured
        if let Some(ref cloudflare) = self.cloudflare {
            if let Ok(Some(status)) = cloudflare.get_status().await {
                if !status.running {
                    warn!("Tunnel health check failed");
                    return Ok(false);
                }
            }
        }

        info!("Brainwav integration health check passed");
        Ok(true)
    }

    /// Reconnect if needed
    pub async fn ensure_connected(&self) -> Result<()> {
        if !self.health_check().await? {
            warn!("Health check failed, attempting to reconnect");
            self.connect_mcp().await?;
        }
        Ok(())
    }
}

/// Utility functions for Brainwav integration
pub mod utils {
    use super::*;

    /// Create a quick Brainwav integration setup
    pub async fn quick_setup() -> Result<BrainwavIntegration> {
        let mut config = EnhancedConfig::load()?;

        // Override with Brainwav-specific settings
        config.webui.enabled = true;
        config.webui.port = 3000;

        if let Some(ref mut cloudflare) = config.server.cloudflare {
            cloudflare.domain = Some("mcp.brainwav.io".to_string());
            cloudflare.auto_start = true;
        }

        BrainwavIntegration::new(config)
    }

    /// Test the connection to your existing setup
    pub async fn test_connection() -> Result<()> {
        info!("Testing connection to Brainwav MCP setup");

        // Test HTTP connection to localhost:3000
        let client = reqwest::Client::new();
        match client.get("http://localhost:3000/health").send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ Local MCP server is responsive");
                } else {
                    warn!("⚠️ Local MCP server returned status: {}", response.status());
                }
            }
            Err(e) => {
                error!("❌ Could not connect to local MCP server: {}", e);
            }
        }

        // Test Cloudflare tunnel
        match client.get("https://mcp.brainwav.io/health").send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("✅ Cloudflare tunnel is accessible");
                } else {
                    warn!("⚠️ Cloudflare tunnel returned status: {}", response.status());
                }
            }
            Err(e) => {
                error!("❌ Could not access Cloudflare tunnel: {}", e);
            }
        }

        Ok(())
    }
}
