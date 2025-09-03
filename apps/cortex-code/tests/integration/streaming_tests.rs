//! Integration tests for streaming functionality
//!
//! These tests verify the enhanced streaming implementation
//! including buffer management, cursor animation, and provider integration.

use cortex_code::streaming::*;
use futures::stream;
use std::time::{Duration, SystemTime};
use tokio::time::sleep;

#[tokio::test]
async fn test_streaming_session_lifecycle() {
    let config = StreamingConfig::default();
    let mut session = StreamingSession::new("test-session".to_string(), config);

    assert_eq!(session.get_state().await, StreamingState::Idle);

    // Create a test stream
    let test_stream = stream::iter(vec![
        Ok("Hello".to_string()),
        Ok(" ".to_string()),
        Ok("World".to_string()),
    ]);

    // Start streaming
    session.start(test_stream).await.unwrap();

    // Give time for processing
    sleep(Duration::from_millis(100)).await;

    // Check state
    assert_eq!(session.get_state().await, StreamingState::Streaming);

    // Process chunks
    while let Ok(Some(content)) = session.process_chunk().await {
        assert!(!content.is_empty());
    }

    // Stop streaming
    session.stop().await.unwrap();
    assert_eq!(session.get_state().await, StreamingState::Completed);
}

#[tokio::test]
async fn test_streaming_manager() {
    let config = StreamingConfig::default();
    let manager = StreamingManager::new(config);

    // Create sessions
    let session1 = manager.create_session("session-1".to_string()).await;
    let session2 = manager.create_session("session-2".to_string()).await;

    assert_eq!(manager.get_active_sessions().await.len(), 2);

    // Remove a session
    manager.remove_session("session-1").await;
    assert_eq!(manager.get_active_sessions().await.len(), 1);

    // Cleanup completed sessions
    manager.cleanup_completed_sessions().await;
    assert_eq!(manager.get_active_sessions().await.len(), 1);
}

#[tokio::test]
async fn test_buffer_operations() {
    let mut buffer = StreamBuffer::new(1024);

    let chunk = StreamingChunk {
        content: "Test content".to_string(),
        sequence: 0,
        timestamp: SystemTime::now(),
        metadata: None,
    };

    let result = buffer.add_chunk(&chunk);
    assert_eq!(result, "Test content");
    assert_eq!(buffer.get_content(), "Test content");
    assert_eq!(buffer.len(), 12);

    // Test buffer optimization
    buffer.optimize(5);
    assert_eq!(buffer.len(), 5);
}

#[tokio::test]
async fn test_cursor_animation() {
    let mut cursor = CursorAnimator::new(100); // 100ms blink interval

    cursor.start();
    assert!(cursor.is_visible());

    // Test cursor character
    let char1 = cursor.get_cursor_char();
    assert!(char1 == '█' || char1 == ' ');

    // Wait for blink
    sleep(Duration::from_millis(150)).await;
    cursor.update();

    let char2 = cursor.get_cursor_char();
    assert_ne!(char1, char2);

    // Test different styles
    cursor.set_style(CursorStyle::Line);
    let line_char = cursor.get_cursor_char();
    assert!(line_char == '|' || line_char == ' ');

    cursor.set_style(CursorStyle::Dots);
    let dots = cursor.get_dots_pattern();
    assert_eq!(dots.len(), 3);
}

#[tokio::test]
async fn test_metrics_collection() {
    let mut metrics = StreamingMetrics::new();

    let chunk = StreamingChunk {
        content: "Test".to_string(),
        sequence: 0,
        timestamp: SystemTime::now(),
        metadata: None,
    };

    metrics.record_chunk(&chunk);
    assert_eq!(metrics.total_chunks, 1);
    assert_eq!(metrics.total_bytes, 4);

    let summary = metrics.get_summary();
    assert_eq!(summary.total_chunks, 1);
    assert_eq!(summary.total_bytes, 4);

    // Test performance grade
    let grade = metrics.get_performance_grade();
    assert_eq!(grade, PerformanceGrade::Poor); // No time data yet

    // Add error
    metrics.record_error("Test error");
    assert_eq!(metrics.error_count, 1);
    assert_eq!(metrics.last_error, Some("Test error".to_string()));
}

#[tokio::test]
async fn test_provider_stream_wrapper() {
    use crate::streaming::provider_stream::*;

    // Create mock provider
    let provider = MockStreamingProvider::new(
        vec!["Hello".to_string(), " ".to_string(), "World".to_string()],
        10
    );

    let wrapper = ProviderStream::new(provider, 2);
    let mut stream = wrapper.create_stream("test");

    let mut results = Vec::new();
    while let Some(result) = stream.next().await {
        results.push(result.unwrap());
    }

    assert!(!results.is_empty());
    // Results should be chunked and combined
}

#[tokio::test]
async fn test_streaming_config_defaults() {
    let config = StreamingConfig::default();

    assert_eq!(config.buffer_size, 8192);
    assert_eq!(config.chunk_interval_ms, 50);
    assert_eq!(config.timeout_ms, 10000);
    assert!(config.cursor_animation);
    assert_eq!(config.cursor_blink_ms, 500);
    assert!(config.metrics_enabled);
    assert_eq!(config.auto_scroll_threshold, 1000);
}

#[tokio::test]
async fn test_streaming_control_commands() {
    let config = StreamingConfig::default();
    let session = StreamingSession::new("control-test".to_string(), config);

    // Test control commands
    session.pause().await.unwrap();
    session.resume().await.unwrap();
    session.stop().await.unwrap();

    // These should not panic even when session is not active
}

#[tokio::test]
async fn test_large_content_handling() {
    let mut buffer = StreamBuffer::new(100);

    // Add content that exceeds buffer capacity
    let large_content = "A".repeat(200);
    let chunk = StreamingChunk {
        content: large_content,
        sequence: 0,
        timestamp: SystemTime::now(),
        metadata: None,
    };

    buffer.add_chunk(&chunk);
    assert!(buffer.needs_optimization());

    // Test optimization
    buffer.optimize(50);
    assert_eq!(buffer.len(), 50);
    assert!(!buffer.needs_optimization());
}
