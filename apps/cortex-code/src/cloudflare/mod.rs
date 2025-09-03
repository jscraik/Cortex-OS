pub mod tunnel;

pub use tunnel::{CloudflareTunnel, TunnelStatus, TunnelMetrics, utils};

use crate::enhanced_config::CloudflareConfig;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn};

/// Cloudflare integration manager
pub struct CloudflareManager {
    tunnel: Arc<RwLock<Option<CloudflareTunnel>>>,
    config: CloudflareConfig,
}

impl CloudflareManager {
    pub fn new(config: CloudflareConfig) -> Self {
        Self {
            tunnel: Arc::new(RwLock::new(None)),
            config,
        }
    }

    /// Start tunnel if auto_start is enabled
    pub async fn auto_start(&self, local_port: u16) -> Result<Option<String>> {
        if !self.config.auto_start {
            return Ok(None);
        }

        info!("Auto-starting Cloudflare tunnel");
        self.start_tunnel(local_port).await.map(Some)
    }

    /// Manually start tunnel
    pub async fn start_tunnel(&self, local_port: u16) -> Result<String> {
        let mut tunnel_guard = self.tunnel.write().await;

        if tunnel_guard.is_some() {
            warn!("Tunnel already exists, stopping existing tunnel");
            if let Some(mut existing_tunnel) = tunnel_guard.take() {
                let _ = existing_tunnel.stop().await;
            }
        }

        let mut new_tunnel = CloudflareTunnel::new(self.config.clone());
        let url = new_tunnel.start(local_port).await?;
        *tunnel_guard = Some(new_tunnel);

        Ok(url)
    }

    /// Stop tunnel
    pub async fn stop_tunnel(&self) -> Result<()> {
        let mut tunnel_guard = self.tunnel.write().await;

        if let Some(mut tunnel) = tunnel_guard.take() {
            tunnel.stop().await?;
        }

        Ok(())
    }

    /// Get tunnel status
    pub async fn get_status(&self) -> Result<Option<TunnelStatus>> {
        let tunnel_guard = self.tunnel.read().await;

        if let Some(tunnel) = tunnel_guard.as_ref() {
            Ok(Some(tunnel.get_status().await?))
        } else {
            Ok(None)
        }
    }

    /// Get tunnel URL
    pub async fn get_url(&self) -> Option<String> {
        let tunnel_guard = self.tunnel.read().await;
        tunnel_guard.as_ref().and_then(|t| t.get_url().cloned())
    }
}
