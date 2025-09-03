use anyhow::Result;
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, error, info, warn};

pub mod buffer;
pub mod cursor;
pub mod provider_stream;
pub mod metrics;

pub use buffer::{StreamBuffer, BufferChunk, BufferStats};
pub use cursor::{CursorAnimator, CursorConfig, CursorStyle, CursorPosition, CursorPresets};
pub use provider_stream::{
    ProviderStream, StreamChunk, ChunkType, StreamRequest, StreamResponse,
    StreamManager, ProviderCapabilities, MockProvider
};
pub use metrics::{
    StreamingMetrics, StreamingEvent, MetricsSnapshot, PerformanceSnapshot,
    QualitySnapshot, UsageSnapshot, ErrorSnapshot, ThresholdAlert, AlertLevel
};

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
            cursor: Arc::new(RwLock::new(CursorAnimator::new(
                Duration::from_millis(config.cursor_blink_ms),
            ))),
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
            self.cursor.write().await.start().await;
        }

        // Create channel for chunks
        let (chunk_sender, chunk_receiver) = mpsc::unbounded_channel();
        self.chunk_receiver = Some(chunk_receiver);

        // Spawn streaming task
        let session_id = self.session_id.clone();
        let state = Arc::clone(&self.state);
        let buffer = Arc::clone(&self.buffer);
        let metrics = Arc::clone(&self.metrics);
        let config = self.config.clone();

        tokio::spawn(async move {
            Self::stream_processor(session_id, stream, chunk_sender, state, buffer, metrics, config).await
        });

        Ok(())
    }

    /// Stop the streaming session
    pub async fn stop(&mut self) -> Result<()> {
        info!("Stopping streaming session: {}", self.session_id);

        *self.state.write().await = StreamingState::Completed;

        // Stop cursor animation
        self.cursor.write().await.stop().await;

        // Close receiver
        if let Some(receiver) = self.chunk_receiver.take() {
            receiver.close();
        }

        Ok(())
    }

    /// Pause the streaming session
    pub async fn pause(&mut self) -> Result<()> {
        debug!("Pausing streaming session: {}", self.session_id);
        *self.state.write().await = StreamingState::Paused;
        Ok(())
    }

    /// Resume the streaming session
    pub async fn resume(&mut self) -> Result<()> {
        debug!("Resuming streaming session: {}", self.session_id);
        *self.state.write().await = StreamingState::Streaming;
        Ok(())
    }

    /// Get current session state
    pub async fn get_state(&self) -> StreamingState {
        self.state.read().await.clone()
    }

    /// Get current buffer content
    pub async fn get_content(&self) -> String {
        self.buffer.read().await.get_content()
    }

    /// Get streaming metrics
    pub async fn get_metrics(&self) -> StreamingMetrics {
        self.metrics.read().await.clone()
    }

    /// Process incoming stream and manage chunks
    async fn stream_processor<S>(
        session_id: String,
        mut stream: S,
        chunk_sender: mpsc::UnboundedSender<StreamingChunk>,
        state: Arc<RwLock<StreamingState>>,
        buffer: Arc<RwLock<StreamBuffer>>,
        metrics: Arc<RwLock<StreamingMetrics>>,
        config: StreamingConfig,
    ) where
        S: Stream<Item = Result<String>> + Send + 'static,
    {
        let mut sequence = 0u64;
        *state.write().await = StreamingState::Streaming;

        while let Some(result) = stream.next().await {
            // Check if we should continue streaming
            let current_state = state.read().await.clone();
            match current_state {
                StreamingState::Paused => {
                    // Wait for resume or stop
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    continue;
                }
                StreamingState::Completed | StreamingState::Failed(_) => {
                    break;
                }
                _ => {}
            }

            match result {
                Ok(content) => {
                    sequence += 1;

                    let chunk = StreamingChunk {
                        content: content.clone(),
                        sequence,
                        timestamp: SystemTime::now(),
                        metadata: None,
                    };

                    // Add to buffer
                    if let Err(e) = buffer.write().await.push(&content) {
                        error!("Buffer error in session {}: {}", session_id, e);
                        *state.write().await = StreamingState::Failed(e.to_string());
                        break;
                    }

                    // Update metrics
                    metrics.write().await.record_chunk(&chunk);

                    // Send chunk to receiver
                    if chunk_sender.send(chunk).is_err() {
                        debug!("Chunk receiver closed for session: {}", session_id);
                        break;
                    }

                    // Rate limiting
                    if config.chunk_interval_ms > 0 {
                        tokio::time::sleep(Duration::from_millis(config.chunk_interval_ms)).await;
                    }
                }
                Err(e) => {
                    error!("Stream error in session {}: {}", session_id, e);
                    metrics.write().await.record_error(&e);
                    *state.write().await = StreamingState::Failed(e.to_string());
                    break;
                }
            }
        }

        // Mark as completed if we ended normally
        let current_state = state.read().await.clone();
        if matches!(current_state, StreamingState::Streaming) {
            *state.write().await = StreamingState::Completed;
        }

        info!("Streaming session {} finished with state: {:?}", session_id, current_state);
    }

    /// Process received chunks
    pub async fn process_chunks(&mut self) -> Result<Vec<StreamingChunk>> {
        let mut chunks = Vec::new();

        if let Some(receiver) = &mut self.chunk_receiver {
            while let Ok(chunk) = receiver.try_recv() {
                chunks.push(chunk);
            }
        }

        Ok(chunks)
    }

    /// Get control sender for external control
    pub fn get_control_sender(&self) -> mpsc::UnboundedSender<StreamingControl> {
        self.control_sender.clone()
    }
}

/// Streaming manager for multiple sessions
#[derive(Debug)]
pub struct StreamingManager {
    sessions: Arc<RwLock<std::collections::HashMap<String, StreamingSession>>>,
    config: StreamingConfig,
}

impl StreamingManager {
    /// Create new streaming manager
    pub fn new(config: StreamingConfig) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(std::collections::HashMap::new())),
            config,
        }
    }

    /// Create a new streaming session
    pub async fn create_session(&self, session_id: String) -> Result<()> {
        let session = StreamingSession::new(session_id.clone(), self.config.clone());
        self.sessions.write().await.insert(session_id, session);
        Ok(())
    }

    /// Remove a streaming session
    pub async fn remove_session(&self, session_id: &str) -> Result<()> {
        if let Some(mut session) = self.sessions.write().await.remove(session_id) {
            session.stop().await?;
        }
        Ok(())
    }

    /// Get session by ID
    pub async fn get_session(&self, session_id: &str) -> Option<StreamingSession> {
        self.sessions.read().await.get(session_id).cloned()
    }

    /// Get all active sessions
    pub async fn get_all_sessions(&self) -> Vec<String> {
        self.sessions.read().await.keys().cloned().collect()
    }

    /// Get streaming statistics
    pub async fn get_statistics(&self) -> StreamingStatistics {
        let sessions = self.sessions.read().await;
        let total_sessions = sessions.len();

        let mut active_sessions = 0;
        let mut completed_sessions = 0;
        let mut failed_sessions = 0;

        for session in sessions.values() {
            match session.get_state().await {
                StreamingState::Streaming | StreamingState::Connecting => active_sessions += 1,
                StreamingState::Completed => completed_sessions += 1,
                StreamingState::Failed(_) => failed_sessions += 1,
                _ => {}
            }
        }

        StreamingStatistics {
            total_sessions,
            active_sessions,
            completed_sessions,
            failed_sessions,
        }
    }
}

/// Streaming statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingStatistics {
    pub total_sessions: usize,
    pub active_sessions: usize,
    pub completed_sessions: usize,
    pub failed_sessions: usize,
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
    async fn test_streaming_session_basic_flow() {
        let config = StreamingConfig::default();
        let mut session = StreamingSession::new("test-session".to_string(), config);

        // Create a test stream
        let test_data = vec!["Hello", " ", "world", "!"];
        let test_stream = stream::iter(test_data.into_iter().map(|s| Ok(s.to_string())));

        // Start streaming
        session.start(test_stream).await.unwrap();

        // Wait a bit for processing
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Check content
        let content = session.get_content().await;
        assert_eq!(content, "Hello world!");

        // Stop session
        session.stop().await.unwrap();
        assert_eq!(session.get_state().await, StreamingState::Completed);
    }

    #[tokio::test]
    async fn test_streaming_manager() {
        let config = StreamingConfig::default();
        let manager = StreamingManager::new(config);

        // Create session
        manager.create_session("test-1".to_string()).await.unwrap();

        // Check it exists
        assert!(manager.get_session("test-1").await.is_some());

        // Remove session
        manager.remove_session("test-1").await.unwrap();

        // Check it's gone
        assert!(manager.get_session("test-1").await.is_none());
    }

    #[tokio::test]
    async fn test_streaming_control() {
        let config = StreamingConfig::default();
        let mut session = StreamingSession::new("test-session".to_string(), config);

        // Test pause/resume
        session.pause().await.unwrap();
        assert_eq!(session.get_state().await, StreamingState::Paused);

        session.resume().await.unwrap();
        assert_eq!(session.get_state().await, StreamingState::Streaming);
    }
}
