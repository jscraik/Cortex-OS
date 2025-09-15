use serde_json::{Value, json};

#[path = "../common/mod.rs"]
mod common;

use common::{
    MockMcpError, assert_text_content, assert_tool_called, setup_mock_server, structured_result,
    text_result,
};

#[tokio::test]
async fn mock_server_records_and_asserts_calls() {
    let fixture = setup_mock_server();

    fixture
        .server
        .register_tool("echo", |args: Value| async move {
            let message = args
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or_default();
            Ok(text_result(format!("echo:{message}")))
        });

    let response = fixture
        .client
        .call_tool("echo", json!({ "message": "hello" }))
        .await
        .expect("tool call should succeed");

    assert_text_content(&response, "echo:hello");
    let calls = assert_tool_called(&fixture.server, "echo", Some(1));
    assert_eq!(calls[0].arguments["message"], json!("hello"));

    fixture.teardown().await;
}

#[tokio::test]
async fn structured_responses_are_supported() {
    let fixture = setup_mock_server();

    fixture
        .server
        .register_tool("add", |args: Value| async move {
            let a = args.get("a").and_then(Value::as_i64).unwrap_or(0);
            let b = args.get("b").and_then(Value::as_i64).unwrap_or(0);
            Ok(structured_result(json!({ "sum": a + b })))
        });

    let response = fixture
        .client
        .call_tool("add", json!({ "a": 2, "b": 3 }))
        .await
        .expect("tool call should succeed");

    let structured = response
        .structured_content
        .as_ref()
        .expect("structured content should be present");
    assert_eq!(structured["sum"], json!(5));

    let calls = assert_tool_called(&fixture.server, "add", Some(1));
    assert_eq!(calls.len(), 1);

    fixture.teardown().await;
}

#[tokio::test]
async fn unknown_tools_surface_errors() {
    let fixture = setup_mock_server();

    let error = fixture
        .client
        .call_tool("missing", Value::Null)
        .await
        .expect_err("calling an unknown tool should fail");

    match error {
        MockMcpError::ToolNotRegistered(tool) => assert_eq!(tool, "missing"),
        other => panic!("unexpected error variant: {other:?}"),
    }

    fixture.teardown().await;
}
