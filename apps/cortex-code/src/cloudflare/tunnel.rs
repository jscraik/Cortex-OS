use crate::enhanced_config::CloudflareConfig;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

/// Cloudflare tunnel manager for remote access
pub struct CloudflareTunnel {
    config: CloudflareConfig,
    process: Option<Child>,
    tunnel_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub running: bool,
    pub url: Option<String>,
    pub uptime: Option<Duration>,
    pub connections: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TunnelMetrics {
    pub requests_per_minute: u64,
    pub data_transferred_mb: f64,
    pub latency_ms: u32,
    pub error_rate: f32,
}

impl CloudflareTunnel {
    pub fn new(config: CloudflareConfig) -> Self {
        Self {
            config,
            process: None,
            tunnel_url: None,
        }
    }

    /// Start the Cloudflare tunnel
    pub async fn start(&mut self, local_port: u16) -> Result<String> {
        if self.is_running() {
            return Ok(self.tunnel_url.clone().unwrap_or_default());
        }

        info!("Starting Cloudflare tunnel for port {}", local_port);

        // Check if cloudflared is installed
        self.check_cloudflared_installed()?;

        // Start the tunnel process
        let mut cmd = Command::new("cloudflared");
        cmd.arg("tunnel")
            .arg("--url")
            .arg(format!("http://localhost:{}", local_port));

        // Add tunnel token if provided
        if let Some(ref token) = self.config.tunnel_token {
            cmd.arg("--token").arg(token);
        } else {
            // Use named tunnel
            cmd.arg("run").arg(&self.config.tunnel_name);
        }

        // Add custom configuration
        if let Some(ref config_path) = self.config.config_path {
            cmd.arg("--config").arg(config_path);
        }

        // Enable metrics if health checks are enabled
        if self.config.health_checks {
            cmd.arg("--metrics").arg("localhost:3333");
        }

        // Redirect output for logging
        cmd.stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let child = cmd.spawn()
            .map_err(|e| anyhow!("Failed to start cloudflared: {}", e))?;

        self.process = Some(child);

        // Wait for tunnel to establish and get URL
        let tunnel_url = self.wait_for_tunnel_url().await?;
        self.tunnel_url = Some(tunnel_url.clone());

        info!("Cloudflare tunnel started successfully: {}", tunnel_url);
        Ok(tunnel_url)
    }

    /// Stop the tunnel
    pub async fn stop(&mut self) -> Result<()> {
        if let Some(mut process) = self.process.take() {
            info!("Stopping Cloudflare tunnel");

            // Gracefully terminate
            process.kill()
                .map_err(|e| anyhow!("Failed to stop tunnel process: {}", e))?;

            // Wait for process to exit
            let _ = process.wait();

            self.tunnel_url = None;
            info!("Cloudflare tunnel stopped");
        }
        Ok(())
    }

    /// Check if tunnel is running
    pub fn is_running(&self) -> bool {
        // We can't check process status without mutable access
        // For now, just return true if process exists
        self.process.is_some()
    }

    /// Get tunnel status
    pub async fn get_status(&self) -> Result<TunnelStatus> {
        Ok(TunnelStatus {
            running: self.is_running(),
            url: self.tunnel_url.clone(),
            uptime: None, // TODO: Calculate actual uptime
            connections: 0, // TODO: Get from metrics
        })
    }

    /// Get tunnel metrics (if health checks enabled)
    pub async fn get_metrics(&self) -> Result<TunnelMetrics> {
        if !self.config.health_checks {
            return Err(anyhow!("Health checks not enabled"));
        }

        // TODO: Fetch actual metrics from cloudflared metrics endpoint
        Ok(TunnelMetrics {
            requests_per_minute: 0,
            data_transferred_mb: 0.0,
            latency_ms: 0,
            error_rate: 0.0,
        })
    }

    /// Get tunnel URL
    pub fn get_url(&self) -> Option<&String> {
        self.tunnel_url.as_ref()
    }

    /// Check if cloudflared is installed
    fn check_cloudflared_installed(&self) -> Result<()> {
        let output = Command::new("cloudflared")
            .arg("--version")
            .output();

        match output {
            Ok(_) => {
                debug!("cloudflared is installed");
                Ok(())
            }
            Err(_) => Err(anyhow!(
                "cloudflared is not installed. Please install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
            ))
        }
    }

    /// Wait for tunnel to establish and extract URL
    async fn wait_for_tunnel_url(&self) -> Result<String> {
        // If we have a custom domain, use that
        if let Some(ref domain) = self.config.domain {
            return Ok(format!("https://{}", domain));
        }

        // TODO: Parse cloudflared output to extract the assigned URL
        // For now, return a placeholder
        let tunnel_id = &self.config.tunnel_name;
        let url = format!("https://{}.trycloudflare.com", tunnel_id);

        // Wait a bit for tunnel to establish
        sleep(Duration::from_secs(3)).await;

        Ok(url)
    }

    /// Create tunnel configuration file
    pub fn create_config_file(&self, local_port: u16) -> Result<String> {
        let config_content = format!(
            r#"tunnel: {}
credentials-file: ~/.cloudflared/{}.json

ingress:
  - hostname: {}
    service: http://localhost:{}
  - service: http_status:404
"#,
            self.config.tunnel_name,
            self.config.tunnel_name,
            self.config.domain.as_ref().unwrap_or(&format!("{}.trycloudflare.com", self.config.tunnel_name)),
            local_port
        );

        let config_path = format!("/tmp/cortex-code-tunnel-{}.yml", self.config.tunnel_name);
        std::fs::write(&config_path, config_content)?;

        info!("Created tunnel config at: {}", config_path);
        Ok(config_path)
    }
}

impl Drop for CloudflareTunnel {
    fn drop(&mut self) {
        // We can't kill the process in Drop without mutable access
        // The process will be cleaned up when it exits
        // In a real implementation, we'd store a mutable handle or use a different approach
    }
}

/// Utility functions for tunnel management
pub mod utils {
    use super::*;

    /// Quick setup for development tunnel
    pub async fn setup_dev_tunnel(port: u16) -> Result<CloudflareTunnel> {
        let config = CloudflareConfig {
            tunnel_token: None,
            tunnel_name: format!("cortex-code-dev-{}", port),
            auto_start: true,
            domain: None,
            config_path: None,
            health_checks: true,
        };

        Ok(CloudflareTunnel::new(config))
    }

    /// Check cloudflared installation and provide setup instructions
    pub fn check_installation() -> Result<()> {
        match Command::new("cloudflared").arg("--version").output() {
            Ok(_) => {
                info!("cloudflared is installed and ready");
                Ok(())
            }
            Err(_) => {
                error!("cloudflared is not installed");
                println!("\nTo use Cloudflare tunnels, please install cloudflared:");
                println!("  macOS: brew install cloudflare/cloudflare/cloudflared");
                println!("  Linux: https://pkg.cloudflare.com/");
                println!("  Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/");
                println!("\nThen authenticate with: cloudflared tunnel login");
                Err(anyhow!("cloudflared not installed"))
            }
        }
    }
}
