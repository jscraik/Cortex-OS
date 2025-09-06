//! Simple integration tests for Anthropic provider package

use codex_anthropic::{AnthropicClient, AnthropicError};

#[tokio::test]
async fn test_anthropic_client_creation() {
    let result = AnthropicClient::new("test-api-key".to_string());
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_anthropic_client_creation_with_empty_key() {
    // The client accepts empty keys but would fail at runtime
    let result = AnthropicClient::new("".to_string());
    assert!(result.is_ok()); // Constructor succeeds but runtime calls would fail
}

#[test]
fn test_serde_error_conversion() {
    // Test that serde_json::Error converts to AnthropicError::ParseError
    let invalid_json = "{ invalid json }";
    let parse_result: Result<serde_json::Value, serde_json::Error> =
        serde_json::from_str(invalid_json);
    let serde_error = parse_result.unwrap_err();
    let anthropic_error: AnthropicError = serde_error.into();
    match anthropic_error {
        AnthropicError::ParseError(_) => {
            // Expected behavior
        }
        other => panic!("Expected ParseError, got: {:?}", other),
    }
}
