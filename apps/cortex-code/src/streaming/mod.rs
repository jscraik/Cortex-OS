//! Enhanced streaming implementation for real-time AI responses
//!
//! This module provides high-performance streaming capabilities with:
//! - Buffered streaming with configurable chunk sizes
//! - Real-time cursor animation and visual feedback
//! - Memory-efficient token processing
//! - Provider-agnostic streaming interface
//! - Error recovery and reconnection logic

use anyhow::Result;
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, error, info, warn};

pub mod buffer;
pub mod cursor;
pub mod provider_stream;
pub mod metrics;

pub use buffer::StreamBuffer;
pub use cursor::CursorAnimator;
pub use provider_stream::ProviderStream;
pub use metrics::StreamingMetrics;

/// Configuration for streaming behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingConfig {
    /// Buffer size for incoming chunks
    pub buffer_size: usize,
    /// Chunk processing interval in milliseconds
    pub chunk_interval_ms: u64,
    /// Maximum time to wait for next chunk before timeout
    pub timeout_ms: u64,
    /// Enable visual cursor animation
    pub cursor_animation: bool,
    /// Cursor blink interval in milliseconds
    pub cursor_blink_ms: u64,
    /// Enable streaming metrics collection
    pub metrics_enabled: bool,
    /// Auto-scroll threshold (scroll when buffer > threshold)
    pub auto_scroll_threshold: usize,
}

impl Default for StreamingConfig {
    fn default() -> Self {
        Self {
            buffer_size: 8192,
            chunk_interval_ms: 50,
            timeout_ms: 10000,
            cursor_animation: true,
            cursor_blink_ms: 500,
            metrics_enabled: true,
            auto_scroll_threshold: 1000,
        }
    }
}

/// State of a streaming session
#[derive(Debug, Clone, PartialEq)]
pub enum StreamingState {
    /// Not currently streaming
    Idle,
    /// Preparing to stream (connecting to provider)
    Connecting,
    /// Actively receiving data
    Streaming,
    /// Temporarily paused
    Paused,
    /// Completed successfully
    Completed,
    /// Failed with error
    Failed(String),
}

/// Streaming chunk with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingChunk {
    /// Content of the chunk
    pub content: String,
    /// Chunk sequence number
    pub sequence: u64,
    /// Timestamp when chunk was received
    pub timestamp: SystemTime,
    /// Provider-specific metadata
    pub metadata: Option<serde_json::Value>,
}

/// Enhanced streaming session manager
#[derive(Debug)]
pub struct StreamingSession {
    /// Session identifier
    pub session_id: String,
    /// Current state
    pub state: Arc<RwLock<StreamingState>>,
    /// Configuration
    pub config: StreamingConfig,
    /// Buffer for incoming chunks
    pub buffer: Arc<RwLock<StreamBuffer>>,
    /// Cursor animator
    pub cursor: Arc<RwLock<CursorAnimator>>,
    /// Metrics collector
    pub metrics: Arc<RwLock<StreamingMetrics>>,
    /// Channel for receiving chunks
    chunk_receiver: Option<mpsc::UnboundedReceiver<StreamingChunk>>,
    /// Channel for sending control commands
    control_sender: mpsc::UnboundedSender<StreamingControl>,
}

/// Control commands for streaming session
#[derive(Debug, Clone)]
pub enum StreamingControl {
    Pause,
    Resume,
    Stop,
    SetBufferSize(usize),
    SetChunkInterval(Duration),
}

impl StreamingSession {
    /// Create a new streaming session
    pub fn new(session_id: String, config: StreamingConfig) -> Self {
        let (control_sender, _control_receiver) = mpsc::unbounded_channel();

        Self {
            session_id,
            state: Arc::new(RwLock::new(StreamingState::Idle)),
            config: config.clone(),
            buffer: Arc::new(RwLock::new(StreamBuffer::new(config.buffer_size))),
            cursor: Arc::new(RwLock::new(CursorAnimator::new(config.cursor_blink_ms))),
            metrics: Arc::new(RwLock::new(StreamingMetrics::new())),
            chunk_receiver: None,
            control_sender,
        }
    }

    /// Start streaming from a provider stream
    pub async fn start<S>(&mut self, stream: S) -> Result<()>
    where
        S: Stream<Item = Result<String>> + Send + 'static,
    {
        info!("Starting streaming session: {}", self.session_id);

        // Update state
        *self.state.write().await = StreamingState::Connecting;

        // Reset metrics and buffer
        self.metrics.write().await.reset();
        self.buffer.write().await.clear();

        // Start cursor animation if enabled
        if self.config.cursor_animation {
            self.cursor.write().await.start();
        }

        // Create chunk channel
        let (chunk_sender, chunk_receiver) = mpsc::unbounded_channel();
        self.chunk_receiver = Some(chunk_receiver);

        // Spawn stream processor
        let state = Arc::clone(&self.state);
        let metrics = Arc::clone(&self.metrics);
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut sequence = 0u64;
            let mut stream = Box::pin(stream);

            // Update state to streaming
            *state.write().await = StreamingState::Streaming;

            while let Some(result) = stream.next().await {
                match result {
                    Ok(content) => {
                        let chunk = StreamingChunk {
                            content,
                            sequence,
                            timestamp: SystemTime::now(),
                            metadata: None,
                        };

                        // Update metrics
                        metrics.write().await.record_chunk(&chunk);

                        // Send chunk
                        if chunk_sender.send(chunk).is_err() {
                            warn!("Chunk receiver dropped, stopping stream");
                            break;
                        }

                        sequence += 1;

                        // Respect chunk interval
                        if config.chunk_interval_ms > 0 {
                            tokio::time::sleep(Duration::from_millis(config.chunk_interval_ms)).await;
                        }
                    }
                    Err(e) => {
                        error!("Stream error: {}", e);
                        *state.write().await = StreamingState::Failed(e.to_string());
                        break;
                    }
                }
            }

            // Mark as completed if not already failed
            let mut state_guard = state.write().await;
            if *state_guard == StreamingState::Streaming {
                *state_guard = StreamingState::Completed;
            }
        });

        Ok(())
    }

    /// Process the next chunk if available
    pub async fn process_chunk(&mut self) -> Result<Option<String>> {
        if let Some(ref mut receiver) = self.chunk_receiver {
            if let Ok(chunk) = receiver.try_recv() {
                // Add to buffer
                let result = self.buffer.write().await.add_chunk(&chunk);

                // Update cursor position
                if self.config.cursor_animation {
                    self.cursor.write().await.update();
                }

                return Ok(Some(result));
            }
        }
        Ok(None)
    }

    /// Get the current streaming state
    pub async fn get_state(&self) -> StreamingState {
        self.state.read().await.clone()
    }

    /// Get buffered content
    pub async fn get_content(&self) -> String {
        self.buffer.read().await.get_content()
    }

    /// Get streaming metrics
    pub async fn get_metrics(&self) -> StreamingMetrics {
        self.metrics.read().await.clone()
    }

    /// Pause streaming
    pub async fn pause(&self) -> Result<()> {
        *self.state.write().await = StreamingState::Paused;
        self.cursor.write().await.pause();
        self.control_sender.send(StreamingControl::Pause)?;
        Ok(())
    }

    /// Resume streaming
    pub async fn resume(&self) -> Result<()> {
        *self.state.write().await = StreamingState::Streaming;
        self.cursor.write().await.resume();
        self.control_sender.send(StreamingControl::Resume)?;
        Ok(())
    }

    /// Stop streaming
    pub async fn stop(&self) -> Result<()> {
        *self.state.write().await = StreamingState::Completed;
        self.cursor.write().await.stop();
        self.control_sender.send(StreamingControl::Stop)?;
        Ok(())
    }

    /// Check if cursor should be visible
    pub async fn is_cursor_visible(&self) -> bool {
        if self.config.cursor_animation {
            self.cursor.read().await.is_visible()
        } else {
            false
        }
    }
}

/// Factory for creating streaming sessions
#[derive(Debug, Clone)]
pub struct StreamingManager {
    config: StreamingConfig,
    active_sessions: Arc<RwLock<std::collections::HashMap<String, Arc<RwLock<StreamingSession>>>>>,
}

impl StreamingManager {
    /// Create a new streaming manager
    pub fn new(config: StreamingConfig) -> Self {
        Self {
            config,
            active_sessions: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Create a new streaming session
    pub async fn create_session(&self, session_id: String) -> Arc<RwLock<StreamingSession>> {
        let session = Arc::new(RwLock::new(StreamingSession::new(session_id.clone(), self.config.clone())));

        self.active_sessions.write().await.insert(session_id, Arc::clone(&session));

        session
    }

    /// Get an existing session
    pub async fn get_session(&self, session_id: &str) -> Option<Arc<RwLock<StreamingSession>>> {
        self.active_sessions.read().await.get(session_id).cloned()
    }

    /// Remove a session
    pub async fn remove_session(&self, session_id: &str) -> Option<Arc<RwLock<StreamingSession>>> {
        self.active_sessions.write().await.remove(session_id)
    }

    /// Get all active session IDs
    pub async fn get_active_sessions(&self) -> Vec<String> {
        self.active_sessions.read().await.keys().cloned().collect()
    }

    /// Clean up completed sessions
    pub async fn cleanup_completed_sessions(&self) {
        let mut sessions = self.active_sessions.write().await;
        let mut to_remove = Vec::new();

        for (session_id, session) in sessions.iter() {
            let state = session.read().await.get_state().await;
            if matches!(state, StreamingState::Completed | StreamingState::Failed(_)) {
                to_remove.push(session_id.clone());
            }
        }

        for session_id in to_remove {
            sessions.remove(&session_id);
            debug!("Cleaned up completed session: {}", session_id);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::stream;
    use tokio_test;

    #[tokio::test]
    async fn test_streaming_session_creation() {
        let config = StreamingConfig::default();
        let session = StreamingSession::new("test-session".to_string(), config);

        assert_eq!(session.session_id, "test-session");
        assert_eq!(session.get_state().await, StreamingState::Idle);
    }

    #[tokio::test]
    async fn test_streaming_manager() {
        let config = StreamingConfig::default();
        let manager = StreamingManager::new(config);

        let session = manager.create_session("test".to_string()).await;
        assert!(manager.get_session("test").await.is_some());

        manager.remove_session("test").await;
        assert!(manager.get_session("test").await.is_none());
    }

    #[tokio::test]
    async fn test_stream_processing() {
        let config = StreamingConfig::default();
        let mut session = StreamingSession::new("test".to_string(), config);

        // Create a simple test stream
        let test_stream = stream::iter(vec![
            Ok("Hello".to_string()),
            Ok(" ".to_string()),
            Ok("World".to_string()),
        ]);

        session.start(test_stream).await.unwrap();

        // Poll process_chunk a few times to move data into the buffer
        for _ in 0..10 {
            let _ = session.process_chunk().await.unwrap_or(None);
            tokio::time::sleep(Duration::from_millis(10)).await;
        }

        // Check that we can get content
        let content = session.get_content().await;
        assert!(!content.is_empty());
    }
}
