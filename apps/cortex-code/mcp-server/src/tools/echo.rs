use super::{McpTool, McpToolError, McpToolMetadata, McpToolResponse};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;

/// Simple MCP tool that returns the provided message without modification.
///
/// # Examples
///
/// ```no_run
/// # use codex_mcp_server::tools::{EchoTool, ToolRegistry};
/// # use serde_json::json;
/// # use tokio::runtime::Runtime;
/// # let runtime = Runtime::new().unwrap();
/// # runtime.block_on(async {
/// let mut registry = ToolRegistry::new();
/// registry.register_tool(EchoTool::default()).unwrap();
/// let response = registry
///     .call_tool("echo", Some(json!({"message": "hello"})))
///     .await
///     .expect("tool is registered")
///     .expect("call succeeded");
/// assert_eq!(response.content.len(), 1);
/// # });
/// ```
#[derive(Debug, Default, Clone)]
pub struct EchoTool;

/// Input parameters for [`EchoTool`].
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct EchoToolInput {
    /// Message that should be returned to the caller.
    pub message: String,
}

#[async_trait]
impl McpTool for EchoTool {
    type Input = EchoToolInput;

    fn metadata(&self) -> McpToolMetadata {
        McpToolMetadata {
            name: "echo",
            title: Some("Echo"),
            description: Some("Return the provided message as-is."),
        }
    }

    async fn invoke(&self, input: Self::Input) -> Result<McpToolResponse, McpToolError> {
        Ok(McpToolResponse::text(input.message))
    }
}
