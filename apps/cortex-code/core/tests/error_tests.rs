//! Comprehensive tests for error handling and propagation
//!
//! Tests verify that errors are properly formatted, propagated,
//! and handled throughout the system following TDD principles.

use codex_core::error::{CodexErr, SandboxErr, UsageLimitReachedError};
use std::time::Duration;
use uuid::Uuid;

/// Test error formatting and display
#[test]
fn test_error_display_formatting() {
    // Test UsageLimitReachedError formatting
    let usage_err = UsageLimitReachedError {
        plan_type: Some("plus".to_string()),
        resets_in_seconds: Some(300), // 5 minutes
    };
    let expected = "You've hit your usage limit. Upgrade to Pro (https://openai.com/chatgpt/pricing) or try again in 5 minutes.";
    assert_eq!(usage_err.to_string(), expected);

    // Test CodexErr::UsageLimitReached wrapping
    let codex_err = CodexErr::UsageLimitReached(usage_err);
    assert!(codex_err.to_string().contains("You've hit your usage limit"));
}

/// Test stream error with retry delay
#[test]
fn test_stream_error_with_delay() {
    let delay = Duration::from_secs(30);
    let err = CodexErr::Stream("Connection lost".to_string(), Some(delay));

    assert_eq!(err.to_string(), "stream disconnected before completion: Connection lost");

    // Verify the delay is preserved
    if let CodexErr::Stream(_, Some(actual_delay)) = err {
        assert_eq!(actual_delay, delay);
    } else {
        panic!("Expected Stream error with delay");
    }
}

/// Test conversation not found error
#[test]
fn test_conversation_not_found() {
    let conversation_id = Uuid::new_v4();
    let err = CodexErr::ConversationNotFound(conversation_id);

    assert_eq!(err.to_string(), format!("no conversation with id: {}", conversation_id));
}

/// Test sandbox error propagation
#[test]
fn test_sandbox_error_propagation() {
    let sandbox_err = SandboxErr::Denied(1, "stdout".to_string(), "stderr".to_string());
    let codex_err = CodexErr::Sandbox(sandbox_err);

    assert!(codex_err.to_string().contains("sandbox denied exec error"));
    assert!(codex_err.to_string().contains("exit code: 1"));
}

/// Test timeout error variants
#[test]
fn test_timeout_errors() {
    // CodexErr timeout
    let codex_timeout = CodexErr::Timeout;
    assert_eq!(codex_timeout.to_string(), "timeout waiting for child process to exit");

    // SandboxErr timeout
    let sandbox_timeout = SandboxErr::Timeout;
    assert_eq!(sandbox_timeout.to_string(), "command timed out");
}

/// Test error result type alias
#[test]
fn test_result_type_alias() {
    fn returns_error() -> codex_core::error::Result<String> {
        Err(CodexErr::Interrupted)
    }

    let result = returns_error();
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().to_string(), "interrupted (Ctrl-C)");
}

/// Test error chain and source information
#[test]
fn test_error_source_chain() {
    let sandbox_err = SandboxErr::Timeout;
    let codex_err = CodexErr::Sandbox(sandbox_err);

    // Verify the error can be downcast to its source
    assert!(matches!(codex_err, CodexErr::Sandbox(_)));

    // Test that the error message includes the source
    assert!(codex_err.to_string().contains("command timed out"));
}

/// Test error consistency across different constructors
#[test]
fn test_error_consistency() {
    // Test that similar errors have consistent formatting
    let stream_err1 = CodexErr::Stream("reason1".to_string(), None);
    let stream_err2 = CodexErr::Stream("reason2".to_string(), Some(Duration::from_secs(10)));

    assert!(stream_err1.to_string().starts_with("stream disconnected before completion:"));
    assert!(stream_err2.to_string().starts_with("stream disconnected before completion:"));
}

/// Test error categorization for different error types
#[test]
fn test_error_categorization() {
    let errors = vec![
        CodexErr::Timeout,
        CodexErr::Interrupted,
        CodexErr::Spawn,
        CodexErr::InternalAgentDied,
        CodexErr::UsageNotIncluded,
        CodexErr::InternalServerError,
    ];

    // Verify each error has unique message
    let mut messages = std::collections::HashSet::new();
    for err in errors {
        let msg = err.to_string();
        assert!(!msg.is_empty(), "Error message should not be empty");
        assert!(messages.insert(msg), "Error messages should be unique");
    }
}

/// Test edge cases in error handling
#[test]
fn test_error_edge_cases() {
    // Test empty string handling
    let stream_err = CodexErr::Stream("".to_string(), None);
    assert_eq!(stream_err.to_string(), "stream disconnected before completion: ");

    // Test very long error messages
    let long_msg = "x".repeat(1000);
    let long_err = CodexErr::Stream(long_msg.clone(), None);
    assert!(long_err.to_string().contains(&long_msg));
}

#[cfg(target_os = "linux")]
mod linux_specific {
    use super::*;

    /// Test Linux-specific sandbox errors
    #[test]
    fn test_landlock_errors() {
        let err = SandboxErr::LandlockRestrict;
        assert_eq!(err.to_string(), "Landlock was not able to fully enforce all sandbox rules");

        let codex_err = CodexErr::Sandbox(err);
        assert!(codex_err.to_string().contains("Landlock was not able to fully enforce"));
    }
}
