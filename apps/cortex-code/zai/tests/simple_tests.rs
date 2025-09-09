//! Simple integration tests for Z.ai provider package

use codex_zai::{ZaiClient, ZaiError};

#[tokio::test]
async fn test_zai_client_creation() {
    let result = ZaiClient::new("test-api-key".to_string());
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_zai_client_creation_with_empty_key() {
    // The ZaiClient validates empty keys and should fail
    let result = ZaiClient::new("".to_string());
    assert!(result.is_err()); // Constructor should fail with empty key
}

#[test]
fn test_serde_error_conversion() {
    // Test that serde_json::Error converts to ZaiError::JsonError
    let invalid_json = "{ invalid json }";
    let parse_result: Result<serde_json::Value, serde_json::Error> =
        serde_json::from_str(invalid_json);
    let serde_error = parse_result.unwrap_err();
    let zai_error: ZaiError = serde_error.into();
    match zai_error {
        ZaiError::JsonError(_) => {
            // Expected behavior
        }
        other => panic!("Expected JsonError, got: {:?}", other),
    }
}
