//! Abstractions and helpers for defining MCP tools in Rust.

mod echo;

pub use echo::{EchoTool, EchoToolInput};

use async_trait::async_trait;
use mcp_types::{CallToolResult, ContentBlock, TextContent, Tool, ToolInputSchema};
use schemars::JsonSchema;
use schemars::r#gen::SchemaSettings;
use schemars::schema::RootSchema;
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Clone)]
pub struct McpToolMetadata {
    pub name: &'static str,
    pub title: Option<&'static str>,
    pub description: Option<&'static str>,
}

#[derive(Debug, Clone)]
pub struct McpToolResponse {
    pub content: Vec<ContentBlock>,
    pub structured_content: Option<Value>,
    pub is_error: bool,
}

impl McpToolResponse {
    pub fn text(message: impl Into<String>) -> Self {
        Self {
            content: vec![ContentBlock::TextContent(TextContent {
                r#type: "text".to_string(),
                text: message.into(),
                annotations: None,
            })],
            structured_content: None,
            is_error: false,
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            is_error: true,
            ..Self::text(message)
        }
    }

    pub fn into_call_tool_result(self) -> CallToolResult {
        CallToolResult {
            content: self.content,
            is_error: self.is_error.then_some(true),
            structured_content: self.structured_content,
        }
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum McpToolError {
    #[error("invalid input: {details}")]
    InvalidInput { details: String },
    #[error("tool execution failed: {details}")]
    Execution { details: String },
}

impl McpToolError {
    pub fn into_call_tool_result(self) -> CallToolResult {
        McpToolResponse::error(self.to_string()).into_call_tool_result()
    }
}

#[async_trait]
pub trait McpTool: Send + Sync + 'static {
    type Input: DeserializeOwned + Serialize + JsonSchema + Send + Sync + 'static;

    fn metadata(&self) -> McpToolMetadata;

    async fn invoke(&self, input: Self::Input) -> Result<McpToolResponse, McpToolError>;

    fn schema() -> RootSchema
    where
        Self: Sized,
    {
        SchemaSettings::draft2019_09()
            .with(|settings| {
                settings.inline_subschemas = true;
                settings.option_add_null_type = false;
            })
            .into_generator()
            .into_root_schema_for::<Self::Input>()
    }
}

#[async_trait]
trait ErasedMcpTool: Send + Sync {
    fn definition(&self) -> Tool;

    async fn call(&self, arguments: Option<Value>) -> Result<CallToolResult, McpToolError>;
}

#[async_trait]
impl<T> ErasedMcpTool for T
where
    T: McpTool + Sync,
{
    fn definition(&self) -> Tool {
        let metadata = self.metadata();
        let schema = Self::schema();
        #[expect(clippy::expect_used)]
        let schema_value = serde_json::to_value(schema)
            .expect("Failed to serialize JSON schema for tool registration");
        #[expect(clippy::expect_used)]
        let input_schema: ToolInputSchema = serde_json::from_value(schema_value)
            .expect("Failed to convert schema to ToolInputSchema format");

        Tool {
            name: metadata.name.to_string(),
            title: metadata.title.map(str::to_string),
            description: metadata.description.map(str::to_string),
            input_schema,
            output_schema: None,
            annotations: None,
        }
    }

    async fn call(&self, arguments: Option<Value>) -> Result<CallToolResult, McpToolError> {
        let input_value = arguments.unwrap_or_else(|| json!({}));
        let input =
            serde_json::from_value(input_value).map_err(|err| McpToolError::InvalidInput {
                details: err.to_string(),
            })?;
        let response = self.invoke(input).await?;
        Ok(response.into_call_tool_result())
    }
}

pub struct ToolRegistry {
    tools: BTreeMap<String, Arc<dyn ErasedMcpTool>>,
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self {
            tools: BTreeMap::new(),
        }
    }
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_tool<T: McpTool>(&mut self, tool: T) -> Result<(), ToolRegistrationError> {
        let metadata = tool.metadata();
        let name = metadata.name;
        if self.tools.contains_key(name) {
            return Err(ToolRegistrationError::DuplicateTool {
                name: name.to_string(),
            });
        }
        self.tools.insert(name.to_string(), Arc::new(tool));
        Ok(())
    }

    pub fn list_tools(&self) -> Vec<Tool> {
        self.tools.values().map(|tool| tool.definition()).collect()
    }

    pub async fn call_tool(
        &self,
        name: &str,
        arguments: Option<Value>,
    ) -> Option<Result<CallToolResult, McpToolError>> {
        let tool = self.tools.get(name).cloned()?;
        Some(tool.call(arguments).await)
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ToolRegistrationError {
    #[error("tool named '{name}' is already registered")]
    DuplicateTool { name: String },
}

#[cfg(test)]
mod tests {
    use super::*;
    use schemars::JsonSchema;
    use serde::Deserialize;
    use serde::Serialize;
    use serde_json::json;

    #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
    struct TestInput {
        message: String,
    }

    #[derive(Default)]
    struct TestTool;

    #[async_trait::async_trait]
    impl McpTool for TestTool {
        type Input = TestInput;

        fn metadata(&self) -> McpToolMetadata {
            McpToolMetadata {
                name: "test",
                title: Some("Test"),
                description: Some("Test tool"),
            }
        }

        async fn invoke(&self, input: Self::Input) -> Result<McpToolResponse, McpToolError> {
            Ok(McpToolResponse::text(input.message))
        }
    }

    #[tokio::test]
    async fn registers_tool_and_lists_definition() {
        let mut registry = ToolRegistry::new();
        registry
            .register_tool(TestTool::default())
            .expect("register tool");
        let tools = registry.list_tools();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "test");
        assert!(
            tools[0]
                .input_schema
                .required
                .as_ref()
                .map_or(false, |required| required.contains(&"message".to_string()))
        );
    }

    #[tokio::test]
    async fn rejects_invalid_input() {
        let mut registry = ToolRegistry::new();
        registry
            .register_tool(TestTool::default())
            .expect("register tool");
        let err = registry
            .call_tool("test", Some(json!({})))
            .await
            .expect("tool should exist")
            .expect_err("call should fail");
        matches!(err, McpToolError::InvalidInput { .. });
    }

    #[derive(Default)]
    struct FailingTool;

    #[async_trait::async_trait]
    impl McpTool for FailingTool {
        type Input = TestInput;

        fn metadata(&self) -> McpToolMetadata {
            McpToolMetadata {
                name: "failing",
                title: None,
                description: Some("Always fails"),
            }
        }

        async fn invoke(&self, _input: Self::Input) -> Result<McpToolResponse, McpToolError> {
            Err(McpToolError::Execution {
                details: "boom".to_string(),
            })
        }
    }

    #[tokio::test]
    async fn propagates_execution_errors() {
        let mut registry = ToolRegistry::new();
        registry
            .register_tool(FailingTool::default())
            .expect("register tool");
        let err = registry
            .call_tool(
                "failing",
                Some(json!({
                    "message": "ignored",
                })),
            )
            .await
            .expect("tool should exist")
            .expect_err("call should fail");
        matches!(err, McpToolError::Execution { .. });
    }

    #[tokio::test]
    async fn rejects_duplicate_names() {
        let mut registry = ToolRegistry::new();
        registry
            .register_tool(TestTool::default())
            .expect("register tool");
        let err = registry
            .register_tool(TestTool::default())
            .expect_err("duplicate registration");
        matches!(err, ToolRegistrationError::DuplicateTool { .. });
    }
}
