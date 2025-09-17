use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tracing::{debug, error, info, warn};

/// A2A Envelope following CloudEvents 1.0 specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2AEnvelope {
    pub id: String,
    pub source: String,
    pub specversion: String,
    pub r#type: String,
    pub datacontenttype: String,
    pub subject: Option<String>,
    pub time: String,
    pub data: serde_json::Value,
    #[serde(default)]
    pub cortex_meta: HashMap<String, serde_json::Value>,
}

impl A2AEnvelope {
    pub fn new(message_type: String, data: serde_json::Value, source: Option<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            source: source.unwrap_or_else(|| "urn:cortex:code:rust".to_string()),
            specversion: "1.0".to_string(),
            r#type: message_type,
            datacontenttype: "application/json".to_string(),
            subject: None,
            time: chrono::Utc::now().to_rfc3339(),
            data,
            cortex_meta: HashMap::new(),
        }
    }
}

/// A2A Bridge for Rust <-> TypeScript A2A core communication via stdio
pub struct A2ABridge {
    source: String,
    child_process: Option<Child>,
}

impl A2ABridge {
    pub fn new(source: Option<String>) -> Self {
        Self {
            source: source.unwrap_or_else(|| "urn:cortex:code:rust".to_string()),
            child_process: None,
        }
    }

    /// Start the A2A bridge by spawning the TypeScript A2A core with stdio transport
    pub async fn start(&mut self) -> Result<()> {
        info!("Starting A2A bridge for Rust cortex-code");

        // Spawn the TypeScript A2A core bridge process
        let mut child = Command::new("node")
            .arg("-e")
            .arg(
                r#"
                const { createBus } = require('@cortex-os/a2a-core');
                const { stdio } = require('@cortex-os/a2a-transport');
                
                // Create stdio transport that communicates with Rust process
                const transport = stdio(
                    'codex', // This Rust process
                    [], // No additional args needed since we're already running
                    { CORTEX_A2A_MODE: 'stdio' }
                );
                
                // Create A2A bus with the stdio transport
                const bus = createBus(transport, undefined, undefined, undefined, {
                    enableTracing: true,
                    strictValidation: true,
                });
                
                // Handle incoming messages and forward to stdio
                bus.subscribe(['*'], (envelope) => {
                    console.log(JSON.stringify(envelope));
                });
                
                // Keep the process alive
                process.stdin.on('data', (data) => {
                    try {
                        const envelope = JSON.parse(data.toString().trim());
                        bus.publish(envelope);
                    } catch (error) {
                        console.error('Failed to parse A2A message:', error);
                    }
                });
            "#,
            )
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;

        self.child_process = Some(child);
        info!("A2A bridge started successfully");
        Ok(())
    }

    /// Publish an A2A message via the TypeScript bridge
    pub async fn publish(&mut self, envelope: A2AEnvelope) -> Result<()> {
        let child = self
            .child_process
            .as_mut()
            .ok_or_else(|| anyhow!("A2A bridge not started"))?;

        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| anyhow!("Failed to get stdin handle"))?;

        let message = serde_json::to_string(&envelope)?;
        stdin.write_all(format!("{}\n", message).as_bytes()).await?;
        stdin.flush().await?;

        debug!("Published A2A message: {}", envelope.r#type);
        Ok(())
    }

    /// Create and publish a simple A2A message
    pub async fn send_message(
        &mut self,
        message_type: String,
        data: serde_json::Value,
    ) -> Result<()> {
        let envelope = A2AEnvelope::new(message_type, data, Some(self.source.clone()));
        self.publish(envelope).await
    }

    /// Listen for messages from the TypeScript A2A core
    pub async fn listen(&mut self) -> Result<()> {
        let child = self
            .child_process
            .as_mut()
            .ok_or_else(|| anyhow!("A2A bridge not started"))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("Failed to get stdout handle"))?;

        let mut reader = BufReader::new(stdout);
        let mut line = String::new();

        info!("Started listening for A2A messages");

        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => {
                    info!("A2A bridge stdout closed");
                    break;
                }
                Ok(_) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    match serde_json::from_str::<A2AEnvelope>(trimmed) {
                        Ok(envelope) => {
                            debug!("Received A2A message: {}", envelope.r#type);
                            // Handle the received message
                            self.handle_message(envelope).await;
                        }
                        Err(e) => {
                            error!("Failed to parse A2A message: {}", e);
                        }
                    }
                }
                Err(e) => {
                    error!("Error reading from A2A bridge: {}", e);
                    break;
                }
            }
        }

        Ok(())
    }

    /// Handle received A2A messages
    async fn handle_message(&self, envelope: A2AEnvelope) {
        debug!(
            "Handling A2A message: {} from {}",
            envelope.r#type, envelope.source
        );

        // Basic message handling - extend as needed
        match envelope.r#type.as_str() {
            "cortex.ping" => {
                info!("Received ping from {}", envelope.source);
            }
            "cortex.health.check" => {
                info!("Received health check from {}", envelope.source);
            }
            _ => {
                debug!("Received unknown message type: {}", envelope.r#type);
            }
        }
    }

    /// Stop the A2A bridge
    pub async fn stop(&mut self) -> Result<()> {
        if let Some(mut child) = self.child_process.take() {
            child.kill().await?;
            let status = child.wait().await?;
            info!("A2A bridge stopped with status: {:?}", status);
        }
        Ok(())
    }
}

impl Drop for A2ABridge {
    fn drop(&mut self) {
        if let Some(mut child) = self.child_process.take() {
            let _ = child.start_kill();
        }
    }
}

/// Helper functions for A2A operations
pub mod helpers {
    use super::*;

    /// Create a health status message
    pub fn create_health_message() -> serde_json::Value {
        serde_json::json!({
            "ok": true,
            "service": "a2a",
            "version": "1",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "source": "urn:cortex:code:rust"
        })
    }

    /// Create a simple status message
    pub fn create_status_message(
        status: &str,
        details: Option<serde_json::Value>,
    ) -> serde_json::Value {
        let mut message = serde_json::json!({
            "status": status,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "source": "urn:cortex:code:rust"
        });

        if let Some(details) = details {
            message["details"] = details;
        }

        message
    }

    /// Create a list response message
    pub fn create_list_message(items: Vec<serde_json::Value>) -> serde_json::Value {
        serde_json::json!({
            "items": items,
            "count": items.len(),
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "source": "urn:cortex:code:rust"
        })
    }
}
