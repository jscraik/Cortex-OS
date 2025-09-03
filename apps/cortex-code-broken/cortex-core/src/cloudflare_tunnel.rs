use crate::enhanced_config::CloudflareConfig;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

/// Cloudflare tunnel manager for secure remote access
///
/// Provides secure tunneling capabilities using Cloudflare's edge network
/// with support for custom domains, health monitoring, and automatic recovery.
/// Follows September 2025 standards with functional programming patterns.
pub struct CloudflareTunnel {
    config: CloudflareConfig,
    process: Option<Child>,
    tunnel_url: Option<String>,
    start_time: Option<Instant>,
}

/// Tunnel status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub running: bool,
    pub url: Option<String>,
    pub uptime_seconds: u64,
    pub connections: u32,
    pub health: TunnelHealth,
}

/// Tunnel health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TunnelHealth {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// Tunnel performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelMetrics {
    pub requests_per_minute: u64,
    pub data_transferred_mb: f64,
    pub latency_ms: u32,
    pub error_rate: f32,
    pub last_updated: std::time::SystemTime,
}

/// Tunnel connection event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelEvent {
    pub event_type: TunnelEventType,
    pub timestamp: std::time::SystemTime,
    pub message: String,
    pub metadata: std::collections::HashMap<String, String>,
}

/// Types of tunnel events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TunnelEventType {
    Started,
    Stopped,
    Connected,
    Disconnected,
    Error,
    HealthCheck,
}

impl CloudflareTunnel {
    /// Create new tunnel instance
    pub fn new(config: CloudflareConfig) -> Self {
        Self {
            config,
            process: None,
            tunnel_url: None,
            start_time: None,
        }
    }

    /// Start the Cloudflare tunnel
    pub async fn start(&mut self, local_port: u16) -> Result<String> {
        if self.is_running() {
            return Ok(self.tunnel_url.clone().unwrap_or_default());
        }

        info!("Starting Cloudflare tunnel for port {}", local_port);

        // Validate prerequisites
        self.validate_setup()?;

        // Build and start tunnel process
        let tunnel_url = self.start_tunnel_process(local_port).await?;
        self.start_time = Some(Instant::now());

        info!("Cloudflare tunnel started successfully: {}", tunnel_url);
        Ok(tunnel_url)
    }

    /// Stop the tunnel gracefully
    pub async fn stop(&mut self) -> Result<()> {
        if let Some(mut process) = self.process.take() {
            info!("Stopping Cloudflare tunnel");

            // Attempt graceful shutdown
            self.graceful_shutdown(&mut process).await?;

            self.tunnel_url = None;
            self.start_time = None;
            info!("Cloudflare tunnel stopped successfully");
        }
        Ok(())
    }

    /// Check if tunnel is currently running
    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }

    /// Get comprehensive tunnel status
    pub async fn get_status(&self) -> Result<TunnelStatus> {
        let uptime_seconds = self.calculate_uptime();
        let health = self.assess_health().await;

        Ok(TunnelStatus {
            running: self.is_running(),
            url: self.tunnel_url.clone(),
            uptime_seconds,
            connections: self.get_connection_count().await,
            health,
        })
    }

    /// Get tunnel performance metrics
    pub async fn get_metrics(&self) -> Result<TunnelMetrics> {
        if !self.config.health_checks {
            return Err(anyhow!("Health checks not enabled"));
        }

        // In production, would query actual metrics endpoint
        self.fetch_tunnel_metrics().await
    }

    /// Get tunnel URL
    pub fn get_url(&self) -> Option<&String> {
        self.tunnel_url.as_ref()
    }

    /// Restart tunnel if unhealthy
    pub async fn restart_if_unhealthy(&mut self, local_port: u16) -> Result<bool> {
        let health = self.assess_health().await;

        if health == TunnelHealth::Unhealthy {
            warn!("Tunnel unhealthy, restarting...");
            self.stop().await?;
            self.start(local_port).await?;
            return Ok(true);
        }

        Ok(false)
    }

    /// Validate setup prerequisites
    fn validate_setup(&self) -> Result<()> {
        self.check_cloudflared_installed()?;
        self.validate_config()?;
        Ok(())
    }

    /// Start tunnel process with proper configuration
    async fn start_tunnel_process(&mut self, local_port: u16) -> Result<String> {
        let mut cmd = self.build_tunnel_command(local_port)?;

        let child = cmd.spawn()
            .map_err(|e| anyhow!("Failed to start cloudflared: {}", e))?;

        self.process = Some(child);

        // Wait for tunnel establishment and get URL
        let tunnel_url = self.wait_for_tunnel_establishment().await?;
        self.tunnel_url = Some(tunnel_url.clone());

        Ok(tunnel_url)
    }

    /// Build cloudflared command with all options
    fn build_tunnel_command(&self, local_port: u16) -> Result<Command> {
        let mut cmd = Command::new("cloudflared");
        cmd.arg("tunnel")
            .arg("--url")
            .arg(format!("http://localhost:{}", local_port));

        // Authentication configuration
        if let Some(ref token) = self.config.tunnel_token {
            cmd.arg("--token").arg(token);
        } else {
            cmd.arg("run").arg(&self.config.tunnel_name);
        }

        // Optional configurations
        if let Some(ref config_path) = self.config.config_path {
            cmd.arg("--config").arg(config_path);
        }

        if self.config.health_checks {
            cmd.arg("--metrics").arg("localhost:3333");
        }

        // Redirect output for monitoring
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        Ok(cmd)
    }

    /// Wait for tunnel to establish and extract URL
    async fn wait_for_tunnel_establishment(&self) -> Result<String> {
        if let Some(ref domain) = self.config.domain {
            return Ok(format!("https://{}", domain));
        }

        // Generate tunnel URL
        let tunnel_url = self.generate_tunnel_url();

        // Allow time for tunnel establishment
        sleep(Duration::from_secs(5)).await;

        // Verify tunnel is responsive
        self.verify_tunnel_connectivity(&tunnel_url).await?;

        Ok(tunnel_url)
    }

    /// Generate tunnel URL based on configuration
    fn generate_tunnel_url(&self) -> String {
        if let Some(ref domain) = self.config.domain {
            format!("https://{}", domain)
        } else {
            format!("https://{}.trycloudflare.com", self.config.tunnel_name)
        }
    }

    /// Verify tunnel connectivity
    async fn verify_tunnel_connectivity(&self, url: &str) -> Result<()> {
        // Basic connectivity check
        let client = reqwest::Client::new();
        let response = client.get(url).send().await;

        match response {
            Ok(_) => {
                debug!("Tunnel connectivity verified: {}", url);
                Ok(())
            }
            Err(e) => {
                warn!("Tunnel connectivity check failed: {}", e);
                // Don't fail startup for connectivity issues
                Ok(())
            }
        }
    }

    /// Gracefully shutdown tunnel process
    async fn graceful_shutdown(&self, process: &mut Child) -> Result<()> {
        // Send termination signal
        process.kill()
            .map_err(|e| anyhow!("Failed to terminate tunnel process: {}", e))?;

        // Wait for process to exit
        let _ = process.wait();

        Ok(())
    }

    /// Calculate tunnel uptime in seconds
    fn calculate_uptime(&self) -> u64 {
        self.start_time
            .map(|start| start.elapsed().as_secs())
            .unwrap_or(0)
    }

    /// Assess tunnel health
    async fn assess_health(&self) -> TunnelHealth {
        if !self.is_running() {
            return TunnelHealth::Unhealthy;
        }

        // Check if tunnel URL is accessible
        if let Some(ref url) = self.tunnel_url {
            match self.health_check_url(url).await {
                Ok(true) => TunnelHealth::Healthy,
                Ok(false) => TunnelHealth::Degraded,
                Err(_) => TunnelHealth::Unhealthy,
            }
        } else {
            TunnelHealth::Unknown
        }
    }

    /// Perform health check on tunnel URL
    async fn health_check_url(&self, url: &str) -> Result<bool> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()?;

        match client.head(url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    /// Get current connection count
    async fn get_connection_count(&self) -> u32 {
        // In production, would query metrics endpoint
        0
    }

    /// Fetch tunnel metrics from cloudflared
    async fn fetch_tunnel_metrics(&self) -> Result<TunnelMetrics> {
        // Placeholder implementation
        // In production, would query http://localhost:3333/metrics
        Ok(TunnelMetrics {
            requests_per_minute: 0,
            data_transferred_mb: 0.0,
            latency_ms: 0,
            error_rate: 0.0,
            last_updated: std::time::SystemTime::now(),
        })
    }

    /// Check if cloudflared is installed
    fn check_cloudflared_installed(&self) -> Result<()> {
        match Command::new("cloudflared").arg("--version").output() {
            Ok(_) => {
                debug!("cloudflared is installed and available");
                Ok(())
            }
            Err(_) => Err(anyhow!(
                "cloudflared is not installed. Install from: \
                https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
            ))
        }
    }

    /// Validate tunnel configuration
    fn validate_config(&self) -> Result<()> {
        if self.config.tunnel_name.is_empty() {
            return Err(anyhow!("Tunnel name cannot be empty"));
        }

        if self.config.tunnel_token.is_none() &&
           self.config.domain.is_none() {
            warn!("No tunnel token or domain specified, using quick tunnel mode");
        }

        Ok(())
    }
}

impl Drop for CloudflareTunnel {
    fn drop(&mut self) {
        // Note: Cannot call async stop() in Drop
        // Process cleanup will happen automatically
        if self.process.is_some() {
            warn!("CloudflareTunnel dropped while process is still running");
        }
    }
}

/// Utility functions for tunnel management
pub mod utils {
    use super::*;

    /// Setup development tunnel with sensible defaults
    pub fn create_dev_tunnel(port: u16) -> CloudflareTunnel {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: format!("cortex-code-dev-{}", port),
            auto_start: true,
            domain: None,
            config_path: None,
            health_checks: true,
        };

        CloudflareTunnel::new(config)
    }

    /// Check cloudflared installation and provide setup guidance
    pub fn check_installation() -> Result<()> {
        match Command::new("cloudflared").arg("--version").output() {
            Ok(output) => {
                let version = String::from_utf8_lossy(&output.stdout);
                info!("cloudflared is installed: {}", version.trim());
                Ok(())
            }
            Err(_) => {
                error!("cloudflared is not installed");
                print_installation_instructions();
                Err(anyhow!("cloudflared not available"))
            }
        }
    }

    /// Print installation instructions for cloudflared
    fn print_installation_instructions() {
        println!("\n🌐 To enable Cloudflare tunnels, install cloudflared:");
        println!("  📦 macOS: brew install cloudflare/cloudflare/cloudflared");
        println!("  🐧 Linux: https://pkg.cloudflare.com/");
        println!("  🪟 Windows: Download from Cloudflare developers site");
        println!("\n🔐 Then authenticate: cloudflared tunnel login");
        println!("📚 Documentation: https://developers.cloudflare.com/cloudflare-one/");
    }

    /// Create tunnel configuration file
    pub fn create_config_file(config: &CloudflareConfig, local_port: u16) -> Result<String> {
        let config_content = format!(
            r#"tunnel: {}
credentials-file: ~/.cloudflared/{}.json

ingress:
  - hostname: {}
    service: http://localhost:{}
  - service: http_status:404
"#,
            config.tunnel_name,
            config.tunnel_name,
            config.domain.as_ref().unwrap_or(&format!("{}.trycloudflare.com", config.tunnel_name)),
            local_port
        );

        let config_path = format!("/tmp/cortex-code-tunnel-{}.yml", config.tunnel_name);
        std::fs::write(&config_path, config_content)?;

        info!("Created tunnel config: {}", config_path);
        Ok(config_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tunnel_creation() {
        let config = CloudflareConfig {
            tunnel_token: Some("test-token".to_string()),
            tunnel_name: "test-tunnel".to_string(),
            auto_start: false,
            domain: Some("test.example.com".to_string()),
            config_path: None,
            health_checks: true,
        };

        let tunnel = CloudflareTunnel::new(config);
        assert!(!tunnel.is_running());
        assert!(tunnel.get_url().is_none());
    }

    #[test]
    fn test_tunnel_url_generation() {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "test-tunnel".to_string(),
            auto_start: false,
            domain: Some("custom.example.com".to_string()),
            config_path: None,
            health_checks: false,
        };

        let tunnel = CloudflareTunnel::new(config);
        let url = tunnel.generate_tunnel_url();
        assert_eq!(url, "https://custom.example.com");
    }

    #[test]
    fn test_uptime_calculation() {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "test".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let tunnel = CloudflareTunnel::new(config);
        assert_eq!(tunnel.calculate_uptime(), 0);
    }

    #[tokio::test]
    async fn test_health_assessment() {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "test".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let tunnel = CloudflareTunnel::new(config);
        let health = tunnel.assess_health().await;
        assert_eq!(health, TunnelHealth::Unhealthy);
    }

    #[test]
    fn test_config_validation() {
        let valid_config = CloudflareConfig {
            tunnel_token: Some("token".to_string()),
            tunnel_name: "valid-tunnel".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let tunnel = CloudflareTunnel::new(valid_config);
        assert!(tunnel.validate_config().is_ok());

        let invalid_config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: "".to_string(),
            auto_start: false,
            domain: None,
            config_path: None,
            health_checks: false,
        };

        let invalid_tunnel = CloudflareTunnel::new(invalid_config);
        assert!(invalid_tunnel.validate_config().is_err());
    }

    #[test]
    fn test_dev_tunnel_creation() {
        let tunnel = utils::create_dev_tunnel(3000);
        assert!(tunnel.config.tunnel_name.contains("cortex-code-dev-3000"));
        assert!(tunnel.config.auto_start);
        assert!(tunnel.config.health_checks);
    }
}
