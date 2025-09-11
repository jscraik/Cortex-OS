use std::path::Path;

use mcp_test_support::to_response;
use mcp_test_support::McpProcess;
use mcp_types::CallToolResult;
use mcp_types::ContentBlock;
use mcp_types::JSONRPCResponse;
use mcp_types::ListToolsResult;
use mcp_types::RequestId;
use mcp_types::TextContent;
use serde_json::json;
use tempfile::TempDir;
use tokio::time::timeout;

const DEFAULT_READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

#[tokio::test]
async fn test_test_tool_executes_end_to_end() {
    let codex_home = TempDir::new().expect("tempdir");
    create_config_toml(codex_home.path()).expect("write config");

    let mut mcp = McpProcess::new(codex_home.path())
        .await
        .expect("spawn mcp process");
    timeout(DEFAULT_READ_TIMEOUT, mcp.initialize())
        .await
        .expect("init timeout")
        .expect("init failed");

    let list_id = mcp
        .send_tools_list_request()
        .await
        .expect("send tools/list");
    let list_resp: JSONRPCResponse = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(list_id)),
    )
    .await
    .expect("tools/list timeout")
    .expect("tools/list response");
    let tools: ListToolsResult = to_response(list_resp).expect("parse tools");
    assert!(tools.tools.iter().any(|t| t.name == "test-echo"));

    let call_id = mcp
        .send_tools_call_request("test-echo", json!({"message": "hi"}))
        .await
        .expect("send tools/call");
    let call_resp: JSONRPCResponse = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(call_id)),
    )
    .await
    .expect("tools/call timeout")
    .expect("tools/call response");
    let result: CallToolResult = to_response(call_resp).expect("parse call result");
    let first = result
        .content
        .first()
        .expect("result content");
    match first {
        ContentBlock::TextContent(TextContent { text, .. }) => {
            assert_eq!(text, "echo: hi");
        }
        other => panic!("unexpected content: {other:?}"),
    }
}

fn create_config_toml(codex_home: &Path) -> std::io::Result<()> {
    let config_toml = codex_home.join("config.toml");
    std::fs::write(
        config_toml,
        r#"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
model_reasoning_effort = "high"
profile = "test"

[profiles.test]
model = "gpt-4o"
approval_policy = "on-request"
model_reasoning_effort = "high"
model_reasoning_summary = "detailed"
"#,
    )
}

