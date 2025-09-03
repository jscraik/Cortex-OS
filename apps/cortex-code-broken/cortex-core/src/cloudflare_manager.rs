use crate::{
    cloudflare_tunnel::{CloudflareTunnel, TunnelStatus, TunnelMetrics, TunnelHealth},
    enhanced_config::CloudflareConfig,
    Result,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};

/// Cloudflare integration manager
///
/// Provides high-level management of Cloudflare tunnels with automatic
/// lifecycle management, health monitoring, and recovery capabilities.
/// Follows September 2025 standards with functional programming patterns.
pub struct CloudflareManager {
    tunnel: Arc<RwLock<Option<CloudflareTunnel>>>,
    config: CloudflareConfig,
    health_monitor: Arc<TunnelHealthMonitor>,
}

/// Tunnel health monitoring system
pub struct TunnelHealthMonitor {
    check_interval_seconds: u64,
    failure_threshold: u32,
    recovery_attempts: u32,
}

/// Tunnel management operations result
#[derive(Debug)]
pub enum TunnelOperation {
    Started(String),
    Stopped,
    Restarted(String),
    HealthCheck(TunnelHealth),
    Error(String),
}

impl CloudflareManager {
    /// Create new Cloudflare manager
    pub fn new(config: CloudflareConfig) -> Self {
        let health_monitor = Arc::new(TunnelHealthMonitor::new());

        Self {
            tunnel: Arc::new(RwLock::new(None)),
            config,
            health_monitor,
        }
    }

    /// Auto-start tunnel if configured
    pub async fn auto_start(&self, local_port: u16) -> Result<Option<String>> {
        if !self.config.auto_start {
            info!("Auto-start disabled for tunnel: {}", self.config.tunnel_name);
            return Ok(None);
        }

        info!("Auto-starting Cloudflare tunnel: {}", self.config.tunnel_name);
        match self.start_tunnel(local_port).await {
            Ok(url) => Ok(Some(url)),
            Err(e) => {
                error!("Auto-start failed: {}", e);
                Err(e)
            }
        }
    }

    /// Manually start tunnel
    pub async fn start_tunnel(&self, local_port: u16) -> Result<String> {
        let mut tunnel_guard = self.tunnel.write().await;

        // Stop existing tunnel if running
        if let Some(mut existing_tunnel) = tunnel_guard.take() {
            warn!("Stopping existing tunnel before starting new one");
            if let Err(e) = existing_tunnel.stop().await {
                warn!("Error stopping existing tunnel: {}", e);
            }
        }

        // Create and start new tunnel
        let mut new_tunnel = CloudflareTunnel::new(self.config.clone());
        let url = new_tunnel.start(local_port).await?;
        *tunnel_guard = Some(new_tunnel);

        info!("Tunnel started successfully: {}", url);
        Ok(url)
    }

    /// Stop tunnel gracefully
    pub async fn stop_tunnel(&self) -> Result<()> {
        let mut tunnel_guard = self.tunnel.write().await;

        if let Some(mut tunnel) = tunnel_guard.take() {
            info!("Stopping Cloudflare tunnel: {}", self.config.tunnel_name);
            tunnel.stop().await?;
            info!("Tunnel stopped successfully");
        } else {
            warn!("No tunnel running to stop");
        }

        Ok(())
    }

    /// Restart tunnel
    pub async fn restart_tunnel(&self, local_port: u16) -> Result<String> {
        info!("Restarting Cloudflare tunnel");
        self.stop_tunnel().await?;
        self.start_tunnel(local_port).await
    }

    /// Get comprehensive tunnel status
    pub async fn get_status(&self) -> Result<Option<TunnelStatus>> {
        let tunnel_guard = self.tunnel.read().await;

        if let Some(tunnel) = tunnel_guard.as_ref() {
            let status = tunnel.get_status().await?;
            Ok(Some(status))
        } else {
            Ok(None)
        }
    }

    /// Get tunnel URL if available
    pub async fn get_url(&self) -> Option<String> {
        let tunnel_guard = self.tunnel.read().await;
        tunnel_guard.as_ref()
            .and_then(|tunnel| tunnel.get_url())
            .cloned()
    }

    /// Get tunnel metrics
    pub async fn get_metrics(&self) -> Result<Option<TunnelMetrics>> {
        let tunnel_guard = self.tunnel.read().await;

        if let Some(tunnel) = tunnel_guard.as_ref() {
            match tunnel.get_metrics().await {
                Ok(metrics) => Ok(Some(metrics)),
                Err(e) => {
                    warn!("Failed to get tunnel metrics: {}", e);
                    Ok(None)
                }
            }
        } else {
            Ok(None)
        }
    }

    /// Check tunnel health and restart if needed
    pub async fn health_check_and_recover(&self, local_port: u16) -> Result<TunnelOperation> {
        let status = self.get_status().await?;

        match status {
            Some(status) => {
                match status.health {
                    TunnelHealth::Healthy => {
                        Ok(TunnelOperation::HealthCheck(TunnelHealth::Healthy))
                    }
                    TunnelHealth::Degraded => {
                        warn!("Tunnel degraded, monitoring...");
                        Ok(TunnelOperation::HealthCheck(TunnelHealth::Degraded))
                    }
                    TunnelHealth::Unhealthy => {
                        warn!("Tunnel unhealthy, attempting restart");
                        match self.restart_tunnel(local_port).await {
                            Ok(url) => Ok(TunnelOperation::Restarted(url)),
                            Err(e) => Ok(TunnelOperation::Error(e.to_string())),
                        }
                    }
                    TunnelHealth::Unknown => {
                        Ok(TunnelOperation::HealthCheck(TunnelHealth::Unknown))
                    }
                }
            }
            None => {
                if self.config.auto_start {
                    info!("No tunnel running, auto-starting");
                    match self.start_tunnel(local_port).await {
                        Ok(url) => Ok(TunnelOperation::Started(url)),
                        Err(e) => Ok(TunnelOperation::Error(e.to_string())),
                    }
                } else {
                    Ok(TunnelOperation::HealthCheck(TunnelHealth::Unhealthy))
                }
            }
        }
    }

    /// Start health monitoring loop
    pub async fn start_health_monitoring(&self, local_port: u16) {
        if !self.config.health_checks {
            return;
        }

        let manager = self.clone();
        let check_interval = std::time::Duration::from_secs(
            self.health_monitor.check_interval_seconds
        );

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(check_interval);

            loop {
                interval.tick().await;

                match manager.health_check_and_recover(local_port).await {
                    Ok(operation) => {
                        match operation {
                            TunnelOperation::Error(e) => {
                                error!("Health check error: {}", e);
                            }
                            TunnelOperation::Restarted(url) => {
                                info!("Tunnel auto-restarted: {}", url);
                            }
                            _ => {
                                // Normal health check, no action needed
                            }
                        }
                    }
                    Err(e) => {
                        error!("Health monitoring error: {}", e);
                    }
                }
            }
        });

        info!("Started tunnel health monitoring");
    }

    /// Check if tunnel is currently running
    pub async fn is_running(&self) -> bool {
        let tunnel_guard = self.tunnel.read().await;
        tunnel_guard.as_ref()
            .map(|tunnel| tunnel.is_running())
            .unwrap_or(false)
    }

    /// Get tunnel configuration
    pub fn get_config(&self) -> &CloudflareConfig {
        &self.config
    }

    /// Update tunnel configuration
    pub fn update_config(&mut self, config: CloudflareConfig) {
        self.config = config;
    }

    /// Validate tunnel setup
    pub fn validate_setup(&self) -> Result<()> {
        // Check basic configuration
        if self.config.tunnel_name.is_empty() {
            return Err(anyhow::anyhow!("Tunnel name cannot be empty"));
        }

        // Check cloudflared installation
        crate::cloudflare_tunnel::utils::check_installation()?;

        Ok(())
    }
}

// Implement Clone for CloudflareManager to support health monitoring
impl Clone for CloudflareManager {
    fn clone(&self) -> Self {
        Self {
            tunnel: Arc::clone(&self.tunnel),
            config: self.config.clone(),
            health_monitor: Arc::clone(&self.health_monitor),
        }
    }
}

impl TunnelHealthMonitor {
    /// Create new health monitor with default settings
    fn new() -> Self {
        Self {
            check_interval_seconds: 30,
            failure_threshold: 3,
            recovery_attempts: 5,
        }
    }

    /// Create health monitor with custom settings
    pub fn with_settings(
        check_interval_seconds: u64,
        failure_threshold: u32,
        recovery_attempts: u32,
    ) -> Self {
        Self {
            check_interval_seconds,
            failure_threshold,
            recovery_attempts,
        }
    }
}

/// Utility functions for Cloudflare management
pub mod utils {
    use super::*;

    /// Create manager for development with sensible defaults
    pub fn create_dev_manager() -> CloudflareManager {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "cortex-code-dev".to_string(),
            auto_start: true,
            domain: None,
            config_path: None,
            health_checks: true,
        };

        CloudflareManager::new(config)
    }

    /// Create manager with production settings
    pub fn create_production_manager(
        tunnel_name: String,
        tunnel_token: Option<String>,
        domain: Option<String>,
    ) -> CloudflareManager {
        let config = CloudflareConfig {
            tunnel_token,
            tunnel_name,
            auto_start: false,
            domain,
            config_path: None,
            health_checks: true,
        };

        CloudflareManager::new(config)
    }

    /// Setup tunnel with authentication
    pub async fn setup_authenticated_tunnel(
        tunnel_name: &str,
        domain: &str,
    ) -> Result<CloudflareManager> {
        // In production, would handle authentication flow
        let config = CloudflareConfig {
            tunnel_token: None, // Would be set after auth
            tunnel_name: tunnel_name.to_string(),
            auto_start: false,
            domain: Some(domain.to_string()),
            config_path: None,
            health_checks: true,
        };

        let manager = CloudflareManager::new(config);
        manager.validate_setup()?;

        Ok(manager)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_manager_creation() {
        let config = CloudflareConfig {
            tunnel_token: Some("test-token".to_string()),
            tunnel_name: "test-tunnel".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let manager = CloudflareManager::new(config);
        assert!(!manager.is_running().await);
        assert!(manager.get_url().await.is_none());
    }

    #[tokio::test]
    async fn test_auto_start_disabled() {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "test".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let manager = CloudflareManager::new(config);
        let result = manager.auto_start(3000).await.unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_health_monitor_creation() {
        let monitor = TunnelHealthMonitor::new();
        assert_eq!(monitor.check_interval_seconds, 30);
        assert_eq!(monitor.failure_threshold, 3);
        assert_eq!(monitor.recovery_attempts, 5);
    }

    #[test]
    fn test_dev_manager_creation() {
        let manager = utils::create_dev_manager();
        assert_eq!(manager.config.tunnel_name, "cortex-code-dev");
        assert!(manager.config.auto_start);
        assert!(manager.config.health_checks);
    }

    #[test]
    fn test_production_manager_creation() {
        let manager = utils::create_production_manager(
            "prod-tunnel".to_string(),
            Some("token".to_string()),
            Some("example.com".to_string()),
        );

        assert_eq!(manager.config.tunnel_name, "prod-tunnel");
        assert!(!manager.config.auto_start);
        assert_eq!(manager.config.domain, Some("example.com".to_string()));
    }

    #[test]
    fn test_manager_cloning() {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "test".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let manager = CloudflareManager::new(config);
        let cloned = manager.clone();

        assert_eq!(manager.config.tunnel_name, cloned.config.tunnel_name);
    }
}
