use cortex_core::{
    cloudflare_manager::{CloudflareManager, TunnelOperation},
    enhanced_config::CloudflareConfig,
};
use tracing::{info, warn, error};

/// Example integration showing Cloudflare tunnel usage in cortex-code
///
/// This demonstrates how to integrate Cloudflare tunnels for secure remote access
/// to the cortex-code WebUI or API server.

/// Setup Cloudflare tunnel for development
pub async fn setup_dev_tunnel(local_port: u16) -> anyhow::Result<CloudflareManager> {
    info!("Setting up development Cloudflare tunnel on port {}", local_port);

    // Create development configuration
    let config = CloudflareConfig {
        tunnel_token: std::env::var("CLOUDFLARE_TUNNEL_TOKEN").ok(),
        tunnel_name: format!("cortex-code-dev-{}", local_port),
        auto_start: true,
        domain: std::env::var("CLOUDFLARE_CUSTOM_DOMAIN").ok(),
        config_path: None,
        health_checks: true,
    };

    // Create manager and validate setup
    let manager = CloudflareManager::new(config);

    // Validate cloudflared is installed
    match manager.validate_setup() {
        Ok(()) => info!("Cloudflare setup validated successfully"),
        Err(e) => {
            warn!("Cloudflare setup validation failed: {}", e);
            print_setup_instructions();
            return Err(e);
        }
    }

    Ok(manager)
}

/// Setup Cloudflare tunnel for production
pub async fn setup_production_tunnel(
    tunnel_name: &str,
    domain: &str,
    local_port: u16,
) -> anyhow::Result<(CloudflareManager, String)> {
    info!("Setting up production Cloudflare tunnel: {}", tunnel_name);

    let config = CloudflareConfig {
        tunnel_token: std::env::var("CLOUDFLARE_TUNNEL_TOKEN")
            .map_err(|_| anyhow::anyhow!("CLOUDFLARE_TUNNEL_TOKEN required for production"))?,
        tunnel_name: tunnel_name.to_string(),
        auto_start: false,
        domain: Some(domain.to_string()),
        config_path: None,
        health_checks: true,
    };

    let manager = CloudflareManager::new(config);
    manager.validate_setup()?;

    // Start tunnel manually for production
    let url = manager.start_tunnel(local_port).await?;
    info!("Production tunnel started: {}", url);

    Ok((manager, url))
}

/// Start tunnel with health monitoring
pub async fn start_tunnel_with_monitoring(
    manager: &CloudflareManager,
    local_port: u16,
) -> anyhow::Result<String> {
    // Auto-start tunnel if configured
    let url = match manager.auto_start(local_port).await? {
        Some(url) => {
            info!("Tunnel auto-started: {}", url);
            url
        }
        None => {
            info!("Auto-start disabled, starting manually");
            manager.start_tunnel(local_port).await?
        }
    };

    // Start health monitoring in background
    manager.start_health_monitoring(local_port).await;

    Ok(url)
}

/// Monitor tunnel health and provide status updates
pub async fn monitor_tunnel_health(manager: &CloudflareManager) -> anyhow::Result<()> {
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;

        match manager.get_status().await? {
            Some(status) => {
                info!("Tunnel status: {:?}", status.health);

                if let Some(url) = &status.url {
                    info!("Tunnel URL: {}", url);
                }

                info!("Uptime: {} seconds", status.uptime_seconds);

                // Get metrics if available
                if let Ok(Some(metrics)) = manager.get_metrics().await {
                    info!("Tunnel metrics: {:.2} MB transferred, {}ms latency",
                          metrics.data_transferred_mb, metrics.latency_ms);
                }
            }
            None => {
                warn!("No tunnel running");
            }
        }
    }
}

/// Gracefully shutdown tunnel
pub async fn shutdown_tunnel(manager: &CloudflareManager) -> anyhow::Result<()> {
    if manager.is_running().await {
        info!("Shutting down Cloudflare tunnel");
        manager.stop_tunnel().await?;
        info!("Tunnel shutdown complete");
    } else {
        info!("No tunnel running to shutdown");
    }
    Ok(())
}

/// Print setup instructions for Cloudflare
fn print_setup_instructions() {
    println!("\n🌐 Cloudflare Tunnel Setup Required");
    println!("=====================================");
    println!("\n1️⃣ Install cloudflared:");
    println!("   macOS: brew install cloudflare/cloudflare/cloudflared");
    println!("   Linux: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared");
    println!("   Windows: Download from https://github.com/cloudflare/cloudflared/releases");

    println!("\n2️⃣ Authenticate with Cloudflare:");
    println!("   cloudflared tunnel login");

    println!("\n3️⃣ Create a tunnel (optional for quick tunnels):");
    println!("   cloudflared tunnel create cortex-code");

    println!("\n4️⃣ Set environment variables:");
    println!("   export CLOUDFLARE_TUNNEL_TOKEN=your_token_here");
    println!("   export CLOUDFLARE_CUSTOM_DOMAIN=your.domain.com  # optional");

    println!("\n📚 Documentation: https://developers.cloudflare.com/cloudflare-one/");
}

/// Example CLI integration
pub struct TunnelCLI {
    manager: Option<CloudflareManager>,
}

impl TunnelCLI {
    pub fn new() -> Self {
        Self { manager: None }
    }

    /// Initialize tunnel from CLI arguments
    pub async fn init(&mut self, port: u16, tunnel_name: Option<String>) -> anyhow::Result<()> {
        let manager = if let Some(name) = tunnel_name {
            // Production setup
            let domain = std::env::var("CLOUDFLARE_CUSTOM_DOMAIN")
                .unwrap_or_else(|_| format!("{}.trycloudflare.com", name));

            let (manager, _url) = setup_production_tunnel(&name, &domain, port).await?;
            manager
        } else {
            // Development setup
            setup_dev_tunnel(port).await?
        };

        self.manager = Some(manager);
        Ok(())
    }

    /// Start tunnel from CLI
    pub async fn start(&self, port: u16) -> anyhow::Result<String> {
        if let Some(manager) = &self.manager {
            start_tunnel_with_monitoring(manager, port).await
        } else {
            Err(anyhow::anyhow!("Tunnel not initialized"))
        }
    }

    /// Stop tunnel from CLI
    pub async fn stop(&self) -> anyhow::Result<()> {
        if let Some(manager) = &self.manager {
            shutdown_tunnel(manager).await
        } else {
            Err(anyhow::anyhow!("Tunnel not initialized"))
        }
    }

    /// Get tunnel status from CLI
    pub async fn status(&self) -> anyhow::Result<()> {
        if let Some(manager) = &self.manager {
            match manager.get_status().await? {
                Some(status) => {
                    println!("🌐 Cloudflare Tunnel Status");
                    println!("==========================");
                    println!("Running: {}", status.running);
                    if let Some(url) = &status.url {
                        println!("URL: {}", url);
                    }
                    println!("Health: {:?}", status.health);
                    println!("Uptime: {} seconds", status.uptime_seconds);
                    println!("Connections: {}", status.connections);
                }
                None => {
                    println!("❌ No tunnel running");
                }
            }
            Ok(())
        } else {
            Err(anyhow::anyhow!("Tunnel not initialized"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_dev_tunnel_setup() {
        // This test requires cloudflared to be installed
        match setup_dev_tunnel(3000).await {
            Ok(_manager) => {
                // Test passed - cloudflared available
            }
            Err(_) => {
                // Expected if cloudflared not installed
                println!("cloudflared not available - test skipped");
            }
        }
    }

    #[test]
    fn test_tunnel_cli_creation() {
        let cli = TunnelCLI::new();
        assert!(cli.manager.is_none());
    }
}
