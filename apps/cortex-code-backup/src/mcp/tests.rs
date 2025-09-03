#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::{McpClient, McpServerInfo, McpTool, McpRegistry};
    use std::collections::HashMap;
    use tokio_test;

    #[tokio::test]
    async fn test_mcp_registry_can_add_server() {
        // RED: This test will fail because we need proper MCP registry implementation
        let mut registry = McpRegistry::new();

        let server_config = McpServerInfo {
            name: "cortex-fs".to_string(),
            transport: "stdio".to_string(),
            command: Some("node".to_string()),
            args: Some(vec!["server.js".to_string()]),
            endpoint: None,
            env: Some(HashMap::new()),
        };

        let result = registry.add_server("cortex-fs", server_config).await;
        assert!(result.is_ok());

        let servers = registry.list_servers().await.unwrap();
        assert_eq!(servers.len(), 1);
        assert_eq!(servers[0].name, "cortex-fs");
    }

    #[tokio::test]
    async fn test_mcp_client_can_connect_and_list_tools() {
        // RED: This test will fail because we need proper MCP client implementation
        let server_info = McpServerInfo {
            name: "test-server".to_string(),
            transport: "stdio".to_string(),
            command: Some("echo".to_string()),
            args: Some(vec!["test".to_string()]),
            endpoint: None,
            env: None,
        };

        let mut client = McpClient::new(server_info);
        let connect_result = client.connect().await;

        // For now, we expect this to fail gracefully
        assert!(connect_result.is_err());
    }

    #[tokio::test]
    async fn test_mcp_tool_execution_with_args() {
        // RED: This test defines the expected interface for tool execution
        let server_info = McpServerInfo {
            name: "test-server".to_string(),
            transport: "stdio".to_string(),
            command: Some("node".to_string()),
            args: Some(vec!["test-server.js".to_string()]),
            endpoint: None,
            env: None,
        };

        let mut client = McpClient::new(server_info);

        // Test tool execution with arguments
        let tool_args = serde_json::json!({
            "path": "/test/path",
            "recursive": true
        });

        let result = client.execute_tool("list_files", tool_args).await;

        // For now, we expect this to fail gracefully since we haven't implemented it
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_mcp_registry_can_remove_server() {
        // RED: Test server removal functionality
        let mut registry = McpRegistry::new();

        // Add a server first
        let server_config = McpServerInfo {
            name: "test-server".to_string(),
            transport: "stdio".to_string(),
            command: Some("node".to_string()),
            args: Some(vec!["server.js".to_string()]),
            endpoint: None,
            env: None,
        };

        registry.add_server("test-server", server_config).await.unwrap();

        // Now remove it
        let remove_result = registry.remove_server("test-server").await;
        assert!(remove_result.is_ok());

        let servers = registry.list_servers().await.unwrap();
        assert_eq!(servers.len(), 0);
    }

    #[tokio::test]
    async fn test_mcp_client_handles_connection_failure() {
        // RED: Test error handling for invalid servers
        let server_info = McpServerInfo {
            name: "invalid-server".to_string(),
            transport: "stdio".to_string(),
            command: Some("nonexistent-command".to_string()),
            args: None,
            endpoint: None,
            env: None,
        };

        let mut client = McpClient::new(server_info);
        let result = client.connect().await;

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Failed to start MCP server"));
    }
}
