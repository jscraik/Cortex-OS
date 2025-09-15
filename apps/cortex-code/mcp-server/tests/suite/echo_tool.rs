use mcp_test_support::McpProcess;
use mcp_test_support::to_response;
use mcp_types::CallToolResult;
use mcp_types::ContentBlock;
use mcp_types::ListToolsResult;
use mcp_types::RequestId;
use serde_json::json;
use tempfile::TempDir;
use tokio::time::timeout;

const DEFAULT_READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn echo_tool_is_listed_and_executes() -> anyhow::Result<()> {
    let codex_home = TempDir::new()?;

    let mut mcp = McpProcess::new(codex_home.path()).await?;
    timeout(DEFAULT_READ_TIMEOUT, mcp.initialize()).await??;

    let list_id = mcp.send_list_tools_request().await?;
    let list_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(list_id)),
    )
    .await??;
    let list_result: ListToolsResult = to_response(list_response)?;

    let echo_tool = list_result
        .tools
        .iter()
        .find(|tool| tool.name == "echo")
        .expect("echo tool should be registered");
    assert_eq!(echo_tool.title.as_deref(), Some("Echo"));
    assert!(
        echo_tool
            .input_schema
            .required
            .as_ref()
            .map_or(false, |required| required
                .iter()
                .any(|field| field == "message"))
    );

    let call_id = mcp
        .send_call_tool_request("echo", json!({"message": "Hello MCP"}))
        .await?;
    let call_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(call_id)),
    )
    .await??;
    let call_result: CallToolResult = to_response(call_response)?;
    assert_eq!(call_result.is_error, None);
    assert!(call_result.structured_content.is_none());
    match &call_result.content[0] {
        ContentBlock::TextContent(text) => assert_eq!(text.text, "Hello MCP"),
        other => panic!("expected text content, found {other:?}"),
    }

    let invalid_call_id = mcp
        .send_call_tool_request("echo", json!({"unexpected": "value"}))
        .await?;
    let invalid_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(invalid_call_id)),
    )
    .await??;
    let invalid_result: CallToolResult = to_response(invalid_response)?;
    assert_eq!(invalid_result.is_error, Some(true));
    let error_text = match &invalid_result.content[0] {
        ContentBlock::TextContent(text) => text.text.clone(),
        other => panic!("expected text content for error, found {other:?}"),
    };
    assert!(
        error_text.contains("invalid input"),
        "error text should reference invalid input"
    );

    Ok(())
}
