use crate::mcp::{McpServerInfo, McpClient};
use crate::mcp::server::default_mcp_servers;
use crate::Result;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug)]
pub struct McpRegistry {
    servers: Arc<RwLock<HashMap<String, McpServerInfo>>>,
    clients: Arc<RwLock<HashMap<String, McpClient>>>,
}

impl McpRegistry {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(RwLock::new(HashMap::new())),
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn initialize_default_servers(&self) -> Result<()> {
        let default_servers = default_mcp_servers();
        let mut servers = self.servers.write().await;
        
        for server in default_servers {
            servers.insert(server.id.clone(), server);
        }
        
        Ok(())
    }
    
    pub async fn register_server(&self, server: McpServerInfo) -> Result<()> {
        let mut servers = self.servers.write().await;
        servers.insert(server.id.clone(), server);
        Ok(())
    }
    
    pub async fn unregister_server(&self, server_id: &str) -> Result<()> {
        // Stop client if running
        self.stop_server(server_id).await?;
        
        // Remove from registry
        let mut servers = self.servers.write().await;
        servers.remove(server_id);
        
        Ok(())
    }
    
    pub async fn list_servers(&self) -> Vec<McpServerInfo> {
        let servers = self.servers.read().await;
        servers.values().cloned().collect()
    }
    
    pub async fn get_server(&self, server_id: &str) -> Option<McpServerInfo> {
        let servers = self.servers.read().await;
        servers.get(server_id).cloned()
    }
    
    pub async fn start_server(&self, server_id: &str) -> Result<()> {
        let server_info = {
            let servers = self.servers.read().await;
            servers.get(server_id).cloned()
                .ok_or_else(|| crate::error::ProviderError::Api(
                    format!("Server {} not found", server_id)
                ))?
        };
        
        let mut client = McpClient::new(server_info);
        client.start().await?;
        
        let mut clients = self.clients.write().await;
        clients.insert(server_id.to_string(), client);
        
        // Update server status
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(server_id) {
            server.set_status(crate::mcp::server::McpServerStatus::Running);
        }
        
        Ok(())
    }
    
    pub async fn stop_server(&self, server_id: &str) -> Result<()> {
        let mut clients = self.clients.write().await;
        if let Some(mut client) = clients.remove(server_id) {
            client.stop().await?;
        }
        
        // Update server status
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(server_id) {
            server.set_status(crate::mcp::server::McpServerStatus::Stopped);
        }
        
        Ok(())
    }
    
    pub async fn get_client(&self, server_id: &str) -> Option<McpClient> {
        let clients = self.clients.read().await;
        clients.get(server_id).cloned()
    }
    
    pub async fn restart_server(&self, server_id: &str) -> Result<()> {
        self.stop_server(server_id).await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.start_server(server_id).await?;
        Ok(())
    }
    
    pub async fn start_all_servers(&self) -> Result<Vec<String>> {
        let server_ids: Vec<String> = {
            let servers = self.servers.read().await;
            servers.keys().cloned().collect()
        };
        
        let mut started = Vec::new();
        let mut errors = Vec::new();
        
        for server_id in server_ids {
            match self.start_server(&server_id).await {
                Ok(()) => started.push(server_id),
                Err(e) => errors.push(format!("{}: {}", server_id, e)),
            }
        }
        
        if !errors.is_empty() {
            return Err(crate::error::ProviderError::Api(
                format!("Failed to start some servers: {}", errors.join(", "))
            ).into());
        }
        
        Ok(started)
    }
    
    pub async fn stop_all_servers(&self) -> Result<()> {
        let server_ids: Vec<String> = {
            let servers = self.servers.read().await;
            servers.keys().cloned().collect()
        };
        
        for server_id in server_ids {
            let _ = self.stop_server(&server_id).await; // Continue even if one fails
        }
        
        Ok(())
    }
    
    pub async fn health_check(&self) -> HashMap<String, bool> {
        let clients = self.clients.read().await;
        let mut health_status = HashMap::new();
        
        for (server_id, client) in clients.iter() {
            let is_healthy = client.is_running().await;
            health_status.insert(server_id.clone(), is_healthy);
        }
        
        health_status
    }
    
    pub async fn get_server_stats(&self) -> HashMap<String, ServerStats> {
        let servers = self.servers.read().await;
        let clients = self.clients.read().await;
        let mut stats = HashMap::new();
        
        for (server_id, server_info) in servers.iter() {
            let is_running = clients.contains_key(server_id);
            let tools_count = if let Some(client) = clients.get(server_id) {
                client.tools().len()
            } else {
                0
            };
            
            stats.insert(server_id.clone(), ServerStats {
                name: server_info.name.clone(),
                status: server_info.status.clone(),
                is_running,
                tools_count,
                capabilities: server_info.capabilities.clone(),
            });
        }
        
        stats
    }
}

impl Default for McpRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct ServerStats {
    pub name: String,
    pub status: crate::mcp::server::McpServerStatus,
    pub is_running: bool,
    pub tools_count: usize,
    pub capabilities: Vec<crate::mcp::server::McpCapability>,
}

impl Clone for McpClient {
    fn clone(&self) -> Self {
        // Note: This is a simplified clone that doesn't duplicate the process
        // In production, might want to implement proper sharing or reference counting
        Self::new(self.server_info().clone())
    }
}