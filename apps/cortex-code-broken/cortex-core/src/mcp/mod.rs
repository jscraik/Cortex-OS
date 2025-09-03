use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::SystemTime;
use uuid::Uuid;

// Re-export MCP components
pub mod client;
pub mod registry;
pub mod server;
pub mod service;
pub mod transport;
pub mod brainwav_client;

pub use client::McpClient;
pub use registry::McpRegistry;
pub use server::{McpServerInfo, McpTool, McpResource, McpPrompt, McpServerStatus, default_mcp_servers};
pub use service::{McpService, McpToolExecution, McpServerStats, McpServerConfig};
pub use transport::{McpTransport, McpMessage, McpRequest, McpResponse, McpError};
pub use brainwav_client::BrainwavMcpClient;

/// MCP protocol version
pub const MCP_PROTOCOL_VERSION: &str = "2024-11-05";

/// Configuration for MCP integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    /// Enable MCP integration
    pub enabled: bool,
    /// Default server timeout in seconds
    pub default_timeout_seconds: u64,
    /// Maximum concurrent servers
    pub max_concurrent_servers: usize,
    /// Node.js MCP core path
    pub node_mcp_path: Option<String>,
    /// Custom server configurations
    pub custom_servers: HashMap<String, McpServerConfig>,
    /// Enable metrics collection
    pub metrics_enabled: bool,
    /// Retry configuration
    pub retry_config: RetryConfig,
}

impl Default for McpConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_timeout_seconds: 30,
            max_concurrent_servers: 10,
            node_mcp_path: None,
            custom_servers: HashMap::new(),
            metrics_enabled: true,
            retry_config: RetryConfig::default(),
        }
    }
}

/// Retry configuration for MCP operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum retry attempts
    pub max_attempts: u32,
    /// Initial retry delay in milliseconds
    pub initial_delay_ms: u64,
    /// Maximum retry delay in milliseconds
    pub max_delay_ms: u64,
    /// Backoff multiplier
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_ms: 1000,
            max_delay_ms: 10000,
            backoff_multiplier: 2.0,
        }
    }
}

/// MCP operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResult<T> {
    /// Operation result
    pub result: Option<T>,
    /// Error if operation failed
    pub error: Option<String>,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
    /// Server that handled the operation
    pub server_name: String,
    /// Timestamp
    pub timestamp: SystemTime,
}

impl<T> McpResult<T> {
    /// Create a successful result
    pub fn success(result: T, server_name: String, execution_time_ms: u64) -> Self {
        Self {
            result: Some(result),
            error: None,
            execution_time_ms,
            server_name,
            timestamp: SystemTime::now(),
        }
    }

    /// Create an error result
    pub fn error(error: String, server_name: String, execution_time_ms: u64) -> Self {
        Self {
            result: None,
            error: Some(error),
            execution_time_ms,
            server_name,
            timestamp: SystemTime::now(),
        }
    }

    /// Check if result is successful
    pub fn is_success(&self) -> bool {
        self.error.is_none() && self.result.is_some()
    }

    /// Check if result is an error
    pub fn is_error(&self) -> bool {
        self.error.is_some()
    }

    /// Get the result or return an error
    pub fn into_result(self) -> Result<T> {
        match self.result {
            Some(result) => Ok(result),
            None => Err(anyhow::anyhow!(
                self.error.unwrap_or_else(|| "Unknown MCP error".to_string())
            )),
        }
    }
}

/// MCP health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpHealthCheck {
    /// Server name
    pub server_name: String,
    /// Health status
    pub healthy: bool,
    /// Response time in milliseconds
    pub response_time_ms: u64,
    /// Error message if unhealthy
    pub error: Option<String>,
    /// Check timestamp
    pub timestamp: SystemTime,
    /// Server uptime in seconds
    pub uptime_seconds: Option<u64>,
    /// Available tools count
    pub tools_count: usize,
    /// Available resources count
    pub resources_count: usize,
}

/// MCP tool capability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpCapability {
    /// Capability name
    pub name: String,
    /// Capability description
    pub description: String,
    /// Whether capability is available
    pub available: bool,
    /// Version if applicable
    pub version: Option<String>,
    /// Additional metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// MCP manager for coordinating multiple services
#[derive(Debug)]
pub struct McpManager {
    /// MCP service instance
    service: McpService,
    /// Configuration
    config: McpConfig,
    /// Health check interval
    health_check_interval: std::time::Duration,
}

impl McpManager {
    /// Create a new MCP manager
    pub async fn new(config: McpConfig) -> Result<Self> {
        let service = McpService::new().await?;

        Ok(Self {
            service,
            config,
            health_check_interval: std::time::Duration::from_secs(60),
        })
    }

    /// Create with default configuration
    pub async fn default() -> Result<Self> {
        Self::new(McpConfig::default()).await
    }

    /// Get the MCP service
    pub fn service(&self) -> &McpService {
        &self.service
    }

    /// Get configuration
    pub fn config(&self) -> &McpConfig {
        &self.config
    }

    /// Execute a tool with retry logic
    pub async fn execute_tool_with_retry(
        &self,
        server_name: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value> {
        let mut attempt = 0;
        let mut delay = self.config.retry_config.initial_delay_ms;

        loop {
            attempt += 1;

            match self.service.execute_tool(server_name, tool_name, arguments.clone()).await {
                Ok(result) => return Ok(result.result.unwrap_or_default()),
                Err(e) => {
                    if attempt >= self.config.retry_config.max_attempts {
                        return Err(e);
                    }

                    tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
                    delay = (delay as f64 * self.config.retry_config.backoff_multiplier) as u64;
                    delay = delay.min(self.config.retry_config.max_delay_ms);
                }
            }
        }
    }

    /// Perform health check on all servers
    pub async fn health_check_all(&self) -> Vec<McpHealthCheck> {
        let servers = self.service.list_servers().await;
        let mut results = Vec::new();

        for server in servers {
            let start_time = std::time::Instant::now();
            let result = self.service.health_check(&server.name).await;
            let response_time_ms = start_time.elapsed().as_millis() as u64;

            let health_check = match result {
                Ok(stats) => McpHealthCheck {
                    server_name: server.name.clone(),
                    healthy: true,
                    response_time_ms,
                    error: None,
                    timestamp: SystemTime::now(),
                    uptime_seconds: Some(stats.uptime_seconds),
                    tools_count: stats.tools_count,
                    resources_count: stats.resources_count,
                },
                Err(e) => McpHealthCheck {
                    server_name: server.name.clone(),
                    healthy: false,
                    response_time_ms,
                    error: Some(e.to_string()),
                    timestamp: SystemTime::now(),
                    uptime_seconds: None,
                    tools_count: 0,
                    resources_count: 0,
                },
            };

            results.push(health_check);
        }

        results
    }

    /// Get available capabilities across all servers
    pub async fn get_capabilities(&self) -> Vec<McpCapability> {
        let servers = self.service.list_servers().await;
        let mut capabilities = Vec::new();

        for server in servers {
            if let Ok(tools) = self.service.list_tools(&server.name).await {
                for tool in tools {
                    capabilities.push(McpCapability {
                        name: format!("{}:{}", server.name, tool.name),
                        description: tool.description.unwrap_or_default(),
                        available: true,
                        version: None,
                        metadata: HashMap::new(),
                    });
                }
            }
        }

        capabilities
    }

    /// Start health monitoring
    pub async fn start_health_monitoring(&self) {
        let service = self.service.clone();
        let interval = self.health_check_interval;

        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);

            loop {
                interval_timer.tick().await;

                let servers = service.list_servers().await;
                for server in servers {
                    if let Err(e) = service.health_check(&server.name).await {
                        tracing::warn!("Health check failed for server {}: {}", server.name, e);
                    }
                }
            }
        });
    }

    /// Update configuration
    pub fn update_config(&mut self, config: McpConfig) {
        self.config = config;
    }

    /// Set health check interval
    pub fn set_health_check_interval(&mut self, interval: std::time::Duration) {
        self.health_check_interval = interval;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_config_default() {
        let config = McpConfig::default();
        assert!(config.enabled);
        assert_eq!(config.default_timeout_seconds, 30);
        assert_eq!(config.max_concurrent_servers, 10);
    }

    #[test]
    fn test_retry_config_default() {
        let config = RetryConfig::default();
        assert_eq!(config.max_attempts, 3);
        assert_eq!(config.initial_delay_ms, 1000);
        assert_eq!(config.backoff_multiplier, 2.0);
    }

    #[test]
    fn test_mcp_result_success() {
        let result = McpResult::success("test".to_string(), "server1".to_string(), 100);
        assert!(result.is_success());
        assert!(!result.is_error());
        assert_eq!(result.server_name, "server1");
        assert_eq!(result.execution_time_ms, 100);
    }

    #[test]
    fn test_mcp_result_error() {
        let result = McpResult::<String>::error("test error".to_string(), "server1".to_string(), 50);
        assert!(!result.is_success());
        assert!(result.is_error());
        assert_eq!(result.error, Some("test error".to_string()));
    }

    #[test]
    fn test_mcp_result_into_result() {
        let success_result = McpResult::success("test".to_string(), "server1".to_string(), 100);
        assert!(success_result.into_result().is_ok());

        let error_result = McpResult::<String>::error("test error".to_string(), "server1".to_string(), 50);
        assert!(error_result.into_result().is_err());
    }

    #[test]
    fn test_mcp_health_check() {
        let health_check = McpHealthCheck {
            server_name: "test_server".to_string(),
            healthy: true,
            response_time_ms: 100,
            error: None,
            timestamp: SystemTime::now(),
            uptime_seconds: Some(3600),
            tools_count: 5,
            resources_count: 2,
        };

        assert!(health_check.healthy);
        assert_eq!(health_check.server_name, "test_server");
        assert_eq!(health_check.tools_count, 5);
    }

    #[test]
    fn test_mcp_capability() {
        let mut metadata = HashMap::new();
        metadata.insert("version".to_string(), serde_json::Value::String("1.0".to_string()));

        let capability = McpCapability {
            name: "test_tool".to_string(),
            description: "A test tool".to_string(),
            available: true,
            version: Some("1.0".to_string()),
            metadata,
        };

        assert!(capability.available);
        assert_eq!(capability.name, "test_tool");
        assert_eq!(capability.version, Some("1.0".to_string()));
    }
}
