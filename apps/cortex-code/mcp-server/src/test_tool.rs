use mcp_types::{Tool, ToolInputSchema};
use serde_json::json;

/// Simple tool definition used for end-to-end testing.
pub(crate) fn create_test_tool() -> Tool {
    Tool {
        name: "test-echo".to_string(),
        title: Some("Test Echo".to_string()),
        description: Some("Echo back a provided message.".to_string()),
        input_schema: ToolInputSchema {
            r#type: "object".to_string(),
            properties: Some(json!({
                "message": {
                    "type": "string",
                    "description": "Text to echo back"
                }
            })),
            required: Some(vec!["message".to_string()]),
        },
        output_schema: None,
        annotations: None,
    }
}

