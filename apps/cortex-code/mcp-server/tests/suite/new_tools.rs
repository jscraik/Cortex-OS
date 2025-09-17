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
async fn new_tools_are_registered_and_listed() -> anyhow::Result<()> {
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

    // Check that our new tools are registered
    let tool_names: Vec<String> = list_result.tools.iter().map(|t| t.name.clone()).collect();

    // Should have all our new tools
    assert!(
        tool_names.contains(&"echo".to_string()),
        "echo tool should be registered"
    );
    assert!(
        tool_names.contains(&"file_operations".to_string()),
        "file_operations tool should be registered"
    );
    assert!(
        tool_names.contains(&"file_search".to_string()),
        "file_search tool should be registered"
    );
    assert!(
        tool_names.contains(&"apply_patch".to_string()),
        "apply_patch tool should be registered"
    );
    assert!(
        tool_names.contains(&"code_analysis".to_string()),
        "code_analysis tool should be registered"
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn file_operations_tool_works() -> anyhow::Result<()> {
    let codex_home = TempDir::new()?;
    let test_dir = TempDir::new()?;
    let test_file_path = test_dir.path().join("test.txt");
    let test_content = "Hello, MCP file operations!";

    let mut mcp = McpProcess::new(codex_home.path()).await?;
    timeout(DEFAULT_READ_TIMEOUT, mcp.initialize()).await??;

    // Test write operation
    let write_id = mcp
        .send_call_tool_request(
            "file_operations",
            json!({
                "operation": "write",
                "path": test_file_path.to_string_lossy(),
                "content": test_content
            }),
        )
        .await?;
    let write_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(write_id)),
    )
    .await??;
    let write_result: CallToolResult = to_response(write_response)?;
    assert_eq!(write_result.is_error, None);

    // Test read operation
    let read_id = mcp
        .send_call_tool_request(
            "file_operations",
            json!({
                "operation": "read",
                "path": test_file_path.to_string_lossy()
            }),
        )
        .await?;
    let read_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(read_id)),
    )
    .await??;
    let read_result: CallToolResult = to_response(read_response)?;
    assert_eq!(read_result.is_error, None);

    match &read_result.content[0] {
        ContentBlock::TextContent(text) => assert_eq!(text.text, test_content),
        other => panic!("expected text content, found {other:?}"),
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn file_search_tool_works() -> anyhow::Result<()> {
    let codex_home = TempDir::new()?;
    let test_dir = TempDir::new()?;

    // Create a test file to search for
    let test_file_path = test_dir.path().join("example.txt");
    tokio::fs::write(&test_file_path, "test content").await?;

    let mut mcp = McpProcess::new(codex_home.path()).await?;
    timeout(DEFAULT_READ_TIMEOUT, mcp.initialize()).await??;

    let search_id = mcp
        .send_call_tool_request(
            "file_search",
            json!({
                "pattern": "example",
                "directory": test_dir.path().to_string_lossy(),
                "max_results": 10
            }),
        )
        .await?;
    let search_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(search_id)),
    )
    .await??;
    let search_result: CallToolResult = to_response(search_response)?;
    assert_eq!(search_result.is_error, None);

    match &search_result.content[0] {
        ContentBlock::TextContent(text) => {
            assert!(
                text.text.contains("example.txt"),
                "should find the test file"
            );
        }
        other => panic!("expected text content, found {other:?}"),
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn code_analysis_tool_works() -> anyhow::Result<()> {
    let codex_home = TempDir::new()?;
    let test_dir = TempDir::new()?;

    // Create a test Rust file
    let test_file_path = test_dir.path().join("test.rs");
    let rust_code = r#"
// This is a comment
fn main() {
    println!("Hello, world!");
}

fn add(a: i32, b: i32) -> i32 {
    a + b
}

struct MyStruct {
    field: String,
}
"#;
    tokio::fs::write(&test_file_path, rust_code).await?;

    let mut mcp = McpProcess::new(codex_home.path()).await?;
    timeout(DEFAULT_READ_TIMEOUT, mcp.initialize()).await??;

    // Test metrics analysis
    let analysis_id = mcp
        .send_call_tool_request(
            "code_analysis",
            json!({
                "file_path": test_file_path.to_string_lossy(),
                "analysis_type": "metrics"
            }),
        )
        .await?;
    let analysis_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(analysis_id)),
    )
    .await??;
    let analysis_result: CallToolResult = to_response(analysis_response)?;
    assert_eq!(analysis_result.is_error, None);

    match &analysis_result.content[0] {
        ContentBlock::TextContent(text) => {
            assert!(
                text.text.contains("Code Metrics"),
                "should contain metrics analysis"
            );
            assert!(
                text.text.contains("Total lines"),
                "should contain line count"
            );
        }
        other => panic!("expected text content, found {other:?}"),
    }

    // Test structure analysis
    let structure_id = mcp
        .send_call_tool_request(
            "code_analysis",
            json!({
                "file_path": test_file_path.to_string_lossy(),
                "analysis_type": "structure"
            }),
        )
        .await?;
    let structure_response = timeout(
        DEFAULT_READ_TIMEOUT,
        mcp.read_stream_until_response_message(RequestId::Integer(structure_id)),
    )
    .await??;
    let structure_result: CallToolResult = to_response(structure_response)?;
    assert_eq!(structure_result.is_error, None);

    match &structure_result.content[0] {
        ContentBlock::TextContent(text) => {
            assert!(text.text.contains("fn main"), "should find main function");
            assert!(text.text.contains("fn add"), "should find add function");
            assert!(text.text.contains("struct MyStruct"), "should find struct");
        }
        other => panic!("expected text content, found {other:?}"),
    }

    Ok(())
}
