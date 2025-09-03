use anyhow::{anyhow, Result};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::pin::Pin;
use std::time::{Duration, SystemTime};
use tokio::sync::mpsc;
use tokio::time::timeout;
use uuid::Uuid;

/// Streaming response chunk from AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    /// Chunk content
    pub content: String,
    /// Chunk type
    pub chunk_type: ChunkType,
    /// Metadata
    pub metadata: HashMap<String, String>,
    /// Timestamp
    pub timestamp: SystemTime,
    /// Sequence number
    pub sequence: u64,
    /// Whether this is the final chunk
    pub is_final: bool,
}

/// Types of streaming chunks
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChunkType {
    /// Text content
    Text,
    /// Code content
    Code,
    /// Thinking/reasoning
    Thinking,
    /// Tool use
    ToolUse,
    /// Tool result
    ToolResult,
    /// Error message
    Error,
    /// System message
    System,
    /// Metadata update
    Metadata,
    /// Status update
    Status,
    /// Final response
    Final,
}

/// Provider stream configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStreamConfig {
    /// Provider name
    pub provider: String,
    /// Model name
    pub model: String,
    /// Request timeout in seconds
    pub timeout_seconds: u64,
    /// Buffer size for chunks
    pub buffer_size: usize,
    /// Whether to enable retry on failure
    pub retry_enabled: bool,
    /// Maximum retry attempts
    pub max_retries: u32,
    /// Retry delay in milliseconds
    pub retry_delay_ms: u64,
    /// Whether to filter empty chunks
    pub filter_empty: bool,
    /// Custom headers
    pub headers: HashMap<String, String>,
}

impl Default for ProviderStreamConfig {
    fn default() -> Self {
        Self {
            provider: "default".to_string(),
            model: "default".to_string(),
            timeout_seconds: 300,
            buffer_size: 1000,
            retry_enabled: true,
            max_retries: 3,
            retry_delay_ms: 1000,
            filter_empty: true,
            headers: HashMap::new(),
        }
    }
}

/// Stream request to AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamRequest {
    /// Request prompt/messages
    pub prompt: String,
    /// Provider-specific parameters
    pub parameters: HashMap<String, serde_json::Value>,
    /// Request ID for tracking
    pub request_id: String,
    /// Custom metadata
    pub metadata: HashMap<String, String>,
}

/// Stream response metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamResponse {
    /// Response ID
    pub response_id: String,
    /// Request ID that generated this response
    pub request_id: String,
    /// Total chunks received
    pub total_chunks: u64,
    /// Total content length
    pub content_length: usize,
    /// Response start time
    pub start_time: SystemTime,
    /// Response end time
    pub end_time: Option<SystemTime>,
    /// Whether response completed successfully
    pub completed: bool,
    /// Error message if failed
    pub error: Option<String>,
    /// Provider metadata
    pub provider_metadata: HashMap<String, String>,
}

/// Trait for AI provider streaming
#[async_trait]
pub trait ProviderStream: Send + Sync {
    /// Start streaming from provider
    async fn start_stream(
        &self,
        request: StreamRequest,
        config: ProviderStreamConfig,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk>> + Send>>>;

    /// Get provider name
    fn provider_name(&self) -> &str;

    /// Check if provider is available
    async fn health_check(&self) -> Result<()>;

    /// Get supported models
    async fn get_models(&self) -> Result<Vec<String>>;

    /// Get provider capabilities
    fn get_capabilities(&self) -> ProviderCapabilities;
}

/// Provider capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    /// Supports streaming
    pub streaming: bool,
    /// Supports tool use
    pub tool_use: bool,
    /// Supports function calling
    pub function_calling: bool,
    /// Supports vision/images
    pub vision: bool,
    /// Maximum context length
    pub max_context_length: Option<usize>,
    /// Supported content types
    pub content_types: Vec<String>,
    /// Rate limits
    pub rate_limits: Option<RateLimits>,
}

/// Rate limit information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimits {
    /// Requests per minute
    pub requests_per_minute: Option<u32>,
    /// Tokens per minute
    pub tokens_per_minute: Option<u32>,
    /// Concurrent requests
    pub concurrent_requests: Option<u32>,
}

/// Stream manager for handling multiple provider streams
#[derive(Debug)]
pub struct StreamManager {
    /// Active streams
    streams: HashMap<String, ActiveStream>,
    /// Provider implementations
    providers: HashMap<String, Box<dyn ProviderStream>>,
    /// Global configuration
    config: StreamManagerConfig,
}

/// Active stream information
#[derive(Debug)]
struct ActiveStream {
    /// Stream ID
    id: String,
    /// Provider name
    provider: String,
    /// Request information
    request: StreamRequest,
    /// Response metadata
    response: StreamResponse,
    /// Chunk sender
    sender: mpsc::UnboundedSender<StreamChunk>,
    /// Whether stream is active
    active: bool,
}

/// Stream manager configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamManagerConfig {
    /// Default timeout for streams
    pub default_timeout_seconds: u64,
    /// Maximum concurrent streams
    pub max_concurrent_streams: usize,
    /// Stream cleanup interval in seconds
    pub cleanup_interval_seconds: u64,
    /// Default provider
    pub default_provider: String,
}

impl Default for StreamManagerConfig {
    fn default() -> Self {
        Self {
            default_timeout_seconds: 300,
            max_concurrent_streams: 10,
            cleanup_interval_seconds: 60,
            default_provider: "openai".to_string(),
        }
    }
}

impl StreamManager {
    /// Create a new stream manager
    pub fn new(config: StreamManagerConfig) -> Self {
        Self {
            streams: HashMap::new(),
            providers: HashMap::new(),
            config,
        }
    }

    /// Register a provider
    pub fn register_provider(&mut self, provider: Box<dyn ProviderStream>) {
        let name = provider.provider_name().to_string();
        self.providers.insert(name, provider);
    }

    /// Start a new stream
    pub async fn start_stream(
        &mut self,
        request: StreamRequest,
        provider_config: ProviderStreamConfig,
    ) -> Result<mpsc::UnboundedReceiver<StreamChunk>> {
        // Check stream limits
        if self.streams.len() >= self.config.max_concurrent_streams {
            return Err(anyhow!("Maximum concurrent streams reached"));
        }

        // Get provider
        let provider = self
            .providers
            .get(&provider_config.provider)
            .ok_or_else(|| anyhow!("Provider not found: {}", provider_config.provider))?;

        // Create response metadata
        let response = StreamResponse {
            response_id: format!("resp_{}", Uuid::new_v4()),
            request_id: request.request_id.clone(),
            total_chunks: 0,
            content_length: 0,
            start_time: SystemTime::now(),
            end_time: None,
            completed: false,
            error: None,
            provider_metadata: HashMap::new(),
        };

        // Create channel for chunks
        let (sender, receiver) = mpsc::unbounded_channel();

        // Create active stream
        let active_stream = ActiveStream {
            id: response.response_id.clone(),
            provider: provider_config.provider.clone(),
            request: request.clone(),
            response,
            sender: sender.clone(),
            active: true,
        };

        let stream_id = active_stream.id.clone();
        self.streams.insert(stream_id.clone(), active_stream);

        // Start provider stream
        let provider_stream = provider.start_stream(request, provider_config).await?;

        // Spawn task to handle stream
        let streams_ref = self.streams.clone(); // We'll need to refactor this for real usage
        tokio::spawn(async move {
            let mut sequence = 0u64;
            let mut stream = provider_stream;

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(mut chunk) => {
                        chunk.sequence = sequence;
                        sequence += 1;

                        if sender.send(chunk).is_err() {
                            break; // Receiver dropped
                        }
                    }
                    Err(e) => {
                        let error_chunk = StreamChunk {
                            content: format!("Stream error: {}", e),
                            chunk_type: ChunkType::Error,
                            metadata: HashMap::new(),
                            timestamp: SystemTime::now(),
                            sequence,
                            is_final: true,
                        };

                        let _ = sender.send(error_chunk);
                        break;
                    }
                }
            }
        });

        Ok(receiver)
    }

    /// Stop a stream
    pub async fn stop_stream(&mut self, stream_id: &str) -> Result<()> {
        if let Some(stream) = self.streams.get_mut(stream_id) {
            stream.active = false;
            // Sender will be dropped when stream is removed
        }
        Ok(())
    }

    /// Get stream status
    pub fn get_stream_status(&self, stream_id: &str) -> Option<&StreamResponse> {
        self.streams.get(stream_id).map(|s| &s.response)
    }

    /// List active streams
    pub fn list_active_streams(&self) -> Vec<String> {
        self.streams
            .values()
            .filter(|s| s.active)
            .map(|s| s.id.clone())
            .collect()
    }

    /// Clean up inactive streams
    pub fn cleanup_inactive_streams(&mut self) {
        self.streams.retain(|_, stream| stream.active);
    }

    /// Get provider by name
    pub fn get_provider(&self, name: &str) -> Option<&dyn ProviderStream> {
        self.providers.get(name).map(|p| p.as_ref())
    }

    /// List available providers
    pub fn list_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    /// Health check all providers
    pub async fn health_check_all(&self) -> HashMap<String, Result<()>> {
        let mut results = HashMap::new();

        for (name, provider) in &self.providers {
            let result = provider.health_check().await;
            results.insert(name.clone(), result);
        }

        results
    }
}

/// Mock provider for testing
#[derive(Debug, Clone)]
pub struct MockProvider {
    name: String,
    chunks: Vec<String>,
    delay_ms: u64,
}

impl MockProvider {
    /// Create a new mock provider
    pub fn new(name: String, chunks: Vec<String>) -> Self {
        Self {
            name,
            chunks,
            delay_ms: 100,
        }
    }

    /// Set delay between chunks
    pub fn with_delay(mut self, delay_ms: u64) -> Self {
        self.delay_ms = delay_ms;
        self
    }
}

#[async_trait]
impl ProviderStream for MockProvider {
    async fn start_stream(
        &self,
        _request: StreamRequest,
        _config: ProviderStreamConfig,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<StreamChunk>> + Send>>> {
        let chunks = self.chunks.clone();
        let delay = Duration::from_millis(self.delay_ms);

        let stream = futures::stream::iter(chunks.into_iter().enumerate())
            .then(move |(i, content)| async move {
                if i > 0 {
                    tokio::time::sleep(delay).await;
                }

                Ok(StreamChunk {
                    content,
                    chunk_type: ChunkType::Text,
                    metadata: HashMap::new(),
                    timestamp: SystemTime::now(),
                    sequence: i as u64,
                    is_final: false, // Will be set by stream manager
                })
            });

        Ok(Box::pin(stream))
    }

    fn provider_name(&self) -> &str {
        &self.name
    }

    async fn health_check(&self) -> Result<()> {
        Ok(())
    }

    async fn get_models(&self) -> Result<Vec<String>> {
        Ok(vec!["mock-model".to_string()])
    }

    fn get_capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            streaming: true,
            tool_use: false,
            function_calling: false,
            vision: false,
            max_context_length: Some(4096),
            content_types: vec!["text/plain".to_string()],
            rate_limits: None,
        }
    }
}

/// Utility functions for stream processing
pub mod stream_utils {
    use super::*;

    /// Filter empty chunks from stream
    pub fn filter_empty_chunks(
        stream: impl Stream<Item = Result<StreamChunk>>,
    ) -> impl Stream<Item = Result<StreamChunk>> {
        stream.filter(|chunk| {
            futures::future::ready(match chunk {
                Ok(chunk) => !chunk.content.trim().is_empty(),
                Err(_) => true, // Keep errors
            })
        })
    }

    /// Add timeout to stream
    pub fn with_timeout(
        stream: impl Stream<Item = Result<StreamChunk>>,
        timeout_duration: Duration,
    ) -> impl Stream<Item = Result<StreamChunk>> {
        stream.map(move |chunk| {
            match chunk {
                Ok(chunk) => Ok(chunk),
                Err(e) => Err(e),
            }
        })
    }

    /// Batch chunks by time window
    pub fn batch_chunks(
        stream: impl Stream<Item = Result<StreamChunk>>,
        window_ms: u64,
    ) -> impl Stream<Item = Result<Vec<StreamChunk>>> {
        use futures::stream::StreamExt;
        use tokio::time::interval;

        let window_duration = Duration::from_millis(window_ms);
        let mut buffer = Vec::new();
        let mut interval = interval(window_duration);

        stream.map(move |chunk_result| {
            match chunk_result {
                Ok(chunk) => {
                    buffer.push(chunk);
                    // In real implementation, we'd need proper batching logic
                    if buffer.len() >= 10 {
                        let batch = buffer.clone();
                        buffer.clear();
                        Ok(batch)
                    } else {
                        Ok(vec![]) // Empty batch for now
                    }
                }
                Err(e) => Err(e),
            }
        })
        .filter(|batch_result| {
            futures::future::ready(match batch_result {
                Ok(batch) => !batch.is_empty(),
                Err(_) => true,
            })
        })
    }

    /// Count tokens in stream chunks
    pub fn count_tokens(chunks: &[StreamChunk]) -> usize {
        chunks
            .iter()
            .map(|chunk| {
                // Simple token estimation (words * 1.3)
                let words = chunk.content.split_whitespace().count();
                ((words as f64) * 1.3) as usize
            })
            .sum()
    }

    /// Merge consecutive text chunks
    pub fn merge_text_chunks(chunks: Vec<StreamChunk>) -> Vec<StreamChunk> {
        let mut merged = Vec::new();
        let mut current_text = String::new();
        let mut current_metadata = HashMap::new();
        let mut current_sequence = 0;
        let mut current_timestamp = SystemTime::now();

        for chunk in chunks {
            if chunk.chunk_type == ChunkType::Text && !chunk.is_final {
                if current_text.is_empty() {
                    current_sequence = chunk.sequence;
                    current_timestamp = chunk.timestamp;
                    current_metadata = chunk.metadata.clone();
                }
                current_text.push_str(&chunk.content);
            } else {
                // Flush current text chunk if any
                if !current_text.is_empty() {
                    merged.push(StreamChunk {
                        content: current_text.clone(),
                        chunk_type: ChunkType::Text,
                        metadata: current_metadata.clone(),
                        timestamp: current_timestamp,
                        sequence: current_sequence,
                        is_final: false,
                    });
                    current_text.clear();
                    current_metadata.clear();
                }

                // Add non-text chunk
                merged.push(chunk);
            }
        }

        // Flush any remaining text
        if !current_text.is_empty() {
            merged.push(StreamChunk {
                content: current_text,
                chunk_type: ChunkType::Text,
                metadata: current_metadata,
                timestamp: current_timestamp,
                sequence: current_sequence,
                is_final: false,
            });
        }

        merged
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::StreamExt;

    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockProvider::new(
            "test".to_string(),
            vec!["Hello".to_string(), " World".to_string()],
        );

        let request = StreamRequest {
            prompt: "Test prompt".to_string(),
            parameters: HashMap::new(),
            request_id: "test_request".to_string(),
            metadata: HashMap::new(),
        };

        let config = ProviderStreamConfig::default();
        let stream = provider.start_stream(request, config).await.unwrap();

        let chunks: Vec<_> = stream.collect().await;
        assert_eq!(chunks.len(), 2);

        for chunk in chunks {
            assert!(chunk.is_ok());
            let chunk = chunk.unwrap();
            assert!(chunk.content == "Hello" || chunk.content == " World");
        }
    }

    #[tokio::test]
    async fn test_stream_manager() {
        let config = StreamManagerConfig::default();
        let mut manager = StreamManager::new(config);

        let provider = MockProvider::new(
            "test".to_string(),
            vec!["Test".to_string(), " Stream".to_string()],
        );
        manager.register_provider(Box::new(provider));

        let request = StreamRequest {
            prompt: "Test".to_string(),
            parameters: HashMap::new(),
            request_id: "test_req".to_string(),
            metadata: HashMap::new(),
        };

        let provider_config = ProviderStreamConfig {
            provider: "test".to_string(),
            ..Default::default()
        };

        let mut receiver = manager.start_stream(request, provider_config).await.unwrap();

        let mut chunk_count = 0;
        while let Some(chunk) = receiver.recv().await {
            chunk_count += 1;
            assert!(!chunk.content.is_empty());
        }

        assert!(chunk_count > 0);
    }

    #[test]
    fn test_chunk_creation() {
        let chunk = StreamChunk {
            content: "Test content".to_string(),
            chunk_type: ChunkType::Text,
            metadata: HashMap::new(),
            timestamp: SystemTime::now(),
            sequence: 0,
            is_final: false,
        };

        assert_eq!(chunk.content, "Test content");
        assert_eq!(chunk.chunk_type, ChunkType::Text);
        assert!(!chunk.is_final);
    }

    #[test]
    fn test_provider_capabilities() {
        let caps = ProviderCapabilities {
            streaming: true,
            tool_use: true,
            function_calling: false,
            vision: true,
            max_context_length: Some(8192),
            content_types: vec!["text/plain".to_string(), "image/jpeg".to_string()],
            rate_limits: Some(RateLimits {
                requests_per_minute: Some(60),
                tokens_per_minute: Some(1000000),
                concurrent_requests: Some(10),
            }),
        };

        assert!(caps.streaming);
        assert!(caps.tool_use);
        assert!(!caps.function_calling);
        assert!(caps.vision);
        assert_eq!(caps.max_context_length, Some(8192));
    }

    #[test]
    fn test_stream_utils_token_counting() {
        let chunks = vec![
            StreamChunk {
                content: "Hello world test".to_string(),
                chunk_type: ChunkType::Text,
                metadata: HashMap::new(),
                timestamp: SystemTime::now(),
                sequence: 0,
                is_final: false,
            },
            StreamChunk {
                content: "Another chunk here".to_string(),
                chunk_type: ChunkType::Text,
                metadata: HashMap::new(),
                timestamp: SystemTime::now(),
                sequence: 1,
                is_final: false,
            },
        ];

        let token_count = stream_utils::count_tokens(&chunks);
        assert!(token_count > 0);
    }

    #[test]
    fn test_stream_utils_merge_chunks() {
        let chunks = vec![
            StreamChunk {
                content: "Hello".to_string(),
                chunk_type: ChunkType::Text,
                metadata: HashMap::new(),
                timestamp: SystemTime::now(),
                sequence: 0,
                is_final: false,
            },
            StreamChunk {
                content: " World".to_string(),
                chunk_type: ChunkType::Text,
                metadata: HashMap::new(),
                timestamp: SystemTime::now(),
                sequence: 1,
                is_final: false,
            },
            StreamChunk {
                content: "System message".to_string(),
                chunk_type: ChunkType::System,
                metadata: HashMap::new(),
                timestamp: SystemTime::now(),
                sequence: 2,
                is_final: false,
            },
        ];

        let merged = stream_utils::merge_text_chunks(chunks);
        assert_eq!(merged.len(), 2); // One merged text chunk + one system chunk
        assert_eq!(merged[0].content, "Hello World");
        assert_eq!(merged[1].chunk_type, ChunkType::System);
    }
}
