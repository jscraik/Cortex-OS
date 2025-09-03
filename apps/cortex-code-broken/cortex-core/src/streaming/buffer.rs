use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::SystemTime;

/// High-performance streaming buffer with configurable size and behavior
#[derive(Debug, Clone)]
pub struct StreamBuffer {
    /// Buffer content storage
    content: String,
    /// Circular buffer for chunks
    chunks: VecDeque<BufferChunk>,
    /// Maximum buffer size in bytes
    max_size: usize,
    /// Current size in bytes
    current_size: usize,
    /// Total chunks processed
    total_chunks: u64,
    /// Buffer creation time
    created_at: SystemTime,
    /// Last update time
    last_update: SystemTime,
}

/// Individual chunk in the buffer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferChunk {
    /// Chunk content
    pub content: String,
    /// Chunk size in bytes
    pub size: usize,
    /// Sequence number
    pub sequence: u64,
    /// Timestamp when added
    pub timestamp: SystemTime,
}

/// Buffer statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BufferStats {
    /// Current content length
    pub content_length: usize,
    /// Current size in bytes
    pub current_size: usize,
    /// Maximum size in bytes
    pub max_size: usize,
    /// Number of chunks in buffer
    pub chunk_count: usize,
    /// Total chunks processed
    pub total_chunks: u64,
    /// Buffer age in seconds
    pub age_seconds: u64,
    /// Last update timestamp
    pub last_update: SystemTime,
}

impl StreamBuffer {
    /// Create a new stream buffer with specified maximum size
    pub fn new(max_size: usize) -> Self {
        let now = SystemTime::now();
        Self {
            content: String::new(),
            chunks: VecDeque::new(),
            max_size,
            current_size: 0,
            total_chunks: 0,
            created_at: now,
            last_update: now,
        }
    }

    /// Push new content to the buffer
    pub fn push(&mut self, content: &str) -> Result<()> {
        if content.is_empty() {
            return Ok(());
        }

        let chunk_size = content.len();

        // Check if this chunk would exceed buffer limits
        if chunk_size > self.max_size {
            return Err(anyhow!(
                "Chunk size {} exceeds maximum buffer size {}",
                chunk_size,
                self.max_size
            ));
        }

        // Ensure we have space for the new chunk
        self.ensure_space(chunk_size)?;

        // Create the chunk
        let chunk = BufferChunk {
            content: content.to_string(),
            size: chunk_size,
            sequence: self.total_chunks,
            timestamp: SystemTime::now(),
        };

        // Add to content and chunks
        self.content.push_str(content);
        self.chunks.push_back(chunk);
        self.current_size += chunk_size;
        self.total_chunks += 1;
        self.last_update = SystemTime::now();

        Ok(())
    }

    /// Ensure there's enough space for a new chunk
    fn ensure_space(&mut self, needed_size: usize) -> Result<()> {
        while self.current_size + needed_size > self.max_size && !self.chunks.is_empty() {
            if let Some(old_chunk) = self.chunks.pop_front() {
                // Remove from content (this is O(n) but necessary for accurate content)
                if self.content.starts_with(&old_chunk.content) {
                    self.content.drain(..old_chunk.content.len());
                }
                self.current_size = self.current_size.saturating_sub(old_chunk.size);
            }
        }

        if self.current_size + needed_size > self.max_size {
            return Err(anyhow!(
                "Cannot fit chunk of size {} in buffer (current: {}, max: {})",
                needed_size,
                self.current_size,
                self.max_size
            ));
        }

        Ok(())
    }

    /// Get current buffer content
    pub fn get_content(&self) -> String {
        self.content.clone()
    }

    /// Get buffer content with line wrapping
    pub fn get_content_wrapped(&self, width: usize) -> Vec<String> {
        if width == 0 {
            return vec![self.content.clone()];
        }

        let mut lines = Vec::new();
        let mut current_line = String::new();

        for char in self.content.chars() {
            if char == '\n' {
                lines.push(current_line);
                current_line = String::new();
            } else if current_line.len() >= width {
                lines.push(current_line);
                current_line = char.to_string();
            } else {
                current_line.push(char);
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }

        lines
    }

    /// Get last N characters from buffer
    pub fn get_tail(&self, n: usize) -> String {
        if n >= self.content.len() {
            self.content.clone()
        } else {
            self.content[self.content.len() - n..].to_string()
        }
    }

    /// Get first N characters from buffer
    pub fn get_head(&self, n: usize) -> String {
        if n >= self.content.len() {
            self.content.clone()
        } else {
            self.content[..n].to_string()
        }
    }

    /// Get chunks in a specific range
    pub fn get_chunks_range(&self, start: u64, end: u64) -> Vec<BufferChunk> {
        self.chunks
            .iter()
            .filter(|chunk| chunk.sequence >= start && chunk.sequence < end)
            .cloned()
            .collect()
    }

    /// Get recent chunks (last N chunks)
    pub fn get_recent_chunks(&self, n: usize) -> Vec<BufferChunk> {
        self.chunks
            .iter()
            .rev()
            .take(n)
            .rev()
            .cloned()
            .collect()
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.content.clear();
        self.chunks.clear();
        self.current_size = 0;
        self.total_chunks = 0;
        self.last_update = SystemTime::now();
    }

    /// Resize buffer (may truncate content)
    pub fn resize(&mut self, new_max_size: usize) -> Result<()> {
        self.max_size = new_max_size;

        // If we're over the new limit, remove old chunks
        if self.current_size > new_max_size {
            self.ensure_space(0)?;
        }

        Ok(())
    }

    /// Get buffer statistics
    pub fn get_stats(&self) -> BufferStats {
        BufferStats {
            content_length: self.content.len(),
            current_size: self.current_size,
            max_size: self.max_size,
            chunk_count: self.chunks.len(),
            total_chunks: self.total_chunks,
            age_seconds: self.created_at
                .elapsed()
                .unwrap_or_default()
                .as_secs(),
            last_update: self.last_update,
        }
    }

    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.content.is_empty()
    }

    /// Check if buffer is full
    pub fn is_full(&self) -> bool {
        self.current_size >= self.max_size
    }

    /// Get current utilization as percentage
    pub fn utilization_percent(&self) -> f64 {
        if self.max_size == 0 {
            return 0.0;
        }
        (self.current_size as f64 / self.max_size as f64) * 100.0
    }

    /// Search for content in buffer
    pub fn search(&self, pattern: &str) -> Vec<usize> {
        let mut positions = Vec::new();
        let content_lower = self.content.to_lowercase();
        let pattern_lower = pattern.to_lowercase();

        let mut start = 0;
        while let Some(pos) = content_lower[start..].find(&pattern_lower) {
            positions.push(start + pos);
            start += pos + 1;
        }

        positions
    }

    /// Count lines in buffer
    pub fn line_count(&self) -> usize {
        if self.content.is_empty() {
            0
        } else {
            self.content.lines().count()
        }
    }

    /// Get content by line range
    pub fn get_lines(&self, start: usize, end: usize) -> String {
        let lines: Vec<&str> = self.content.lines().collect();

        if start >= lines.len() {
            return String::new();
        }

        let end = end.min(lines.len());
        lines[start..end].join("\n")
    }

    /// Append to buffer (alias for push for compatibility)
    pub fn append(&mut self, content: &str) -> Result<()> {
        self.push(content)
    }

    /// Get buffer content length
    pub fn len(&self) -> usize {
        self.content.len()
    }

    /// Get maximum buffer size
    pub fn max_size(&self) -> usize {
        self.max_size
    }

    /// Get current size in bytes
    pub fn current_size(&self) -> usize {
        self.current_size
    }

    /// Get chunk count
    pub fn chunk_count(&self) -> usize {
        self.chunks.len()
    }

    /// Get total chunks processed
    pub fn total_chunks(&self) -> u64 {
        self.total_chunks
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_buffer_creation() {
        let buffer = StreamBuffer::new(1024);
        assert_eq!(buffer.max_size(), 1024);
        assert_eq!(buffer.len(), 0);
        assert!(buffer.is_empty());
        assert!(!buffer.is_full());
    }

    #[test]
    fn test_buffer_push() {
        let mut buffer = StreamBuffer::new(1024);

        buffer.push("Hello").unwrap();
        assert_eq!(buffer.get_content(), "Hello");
        assert_eq!(buffer.len(), 5);
        assert_eq!(buffer.chunk_count(), 1);

        buffer.push(" World").unwrap();
        assert_eq!(buffer.get_content(), "Hello World");
        assert_eq!(buffer.len(), 11);
        assert_eq!(buffer.chunk_count(), 2);
    }

    #[test]
    fn test_buffer_overflow() {
        let mut buffer = StreamBuffer::new(10);

        buffer.push("Hello").unwrap();
        buffer.push(" World").unwrap(); // Total: 11 chars, should trigger cleanup

        // Should have removed "Hello" to fit " World"
        assert!(buffer.get_content().ends_with("World"));
        assert!(buffer.len() <= 10);
    }

    #[test]
    fn test_buffer_large_chunk() {
        let mut buffer = StreamBuffer::new(5);

        // Chunk larger than buffer should fail
        let result = buffer.push("This is too long");
        assert!(result.is_err());
    }

    #[test]
    fn test_buffer_tail_head() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Hello World!").unwrap();

        assert_eq!(buffer.get_tail(5), "orld!");
        assert_eq!(buffer.get_head(5), "Hello");
        assert_eq!(buffer.get_tail(100), "Hello World!");
        assert_eq!(buffer.get_head(100), "Hello World!");
    }

    #[test]
    fn test_buffer_search() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Hello World Hello Universe").unwrap();

        let positions = buffer.search("Hello");
        assert_eq!(positions, vec![0, 12]);

        let positions = buffer.search("xyz");
        assert!(positions.is_empty());
    }

    #[test]
    fn test_buffer_lines() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Line 1\nLine 2\nLine 3").unwrap();

        assert_eq!(buffer.line_count(), 3);
        assert_eq!(buffer.get_lines(0, 2), "Line 1\nLine 2");
        assert_eq!(buffer.get_lines(1, 3), "Line 2\nLine 3");
    }

    #[test]
    fn test_buffer_wrapped_content() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("This is a long line that should wrap").unwrap();

        let wrapped = buffer.get_content_wrapped(10);
        assert!(wrapped.len() > 1);
        assert!(wrapped[0].len() <= 10);
    }

    #[test]
    fn test_buffer_resize() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Hello World").unwrap();

        buffer.resize(5).unwrap();
        assert_eq!(buffer.max_size(), 5);
        assert!(buffer.len() <= 5);
    }

    #[test]
    fn test_buffer_chunks() {
        let mut buffer = StreamBuffer::new(1024);

        buffer.push("First").unwrap();
        thread::sleep(Duration::from_millis(1));
        buffer.push("Second").unwrap();
        thread::sleep(Duration::from_millis(1));
        buffer.push("Third").unwrap();

        let recent = buffer.get_recent_chunks(2);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].content, "Second");
        assert_eq!(recent[1].content, "Third");

        let range = buffer.get_chunks_range(0, 2);
        assert_eq!(range.len(), 2);
        assert_eq!(range[0].content, "First");
        assert_eq!(range[1].content, "Second");
    }

    #[test]
    fn test_buffer_stats() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Hello").unwrap();

        let stats = buffer.get_stats();
        assert_eq!(stats.content_length, 5);
        assert_eq!(stats.chunk_count, 1);
        assert_eq!(stats.total_chunks, 1);
        assert_eq!(stats.max_size, 1024);
        assert!(stats.age_seconds >= 0);
    }

    #[test]
    fn test_buffer_utilization() {
        let mut buffer = StreamBuffer::new(10);
        buffer.push("Hello").unwrap(); // 5 bytes

        assert_eq!(buffer.utilization_percent(), 50.0);

        buffer.push("World").unwrap(); // 5 more bytes = 10 total
        assert_eq!(buffer.utilization_percent(), 100.0);
    }

    #[test]
    fn test_buffer_clear() {
        let mut buffer = StreamBuffer::new(1024);
        buffer.push("Hello World").unwrap();

        assert!(!buffer.is_empty());
        buffer.clear();
        assert!(buffer.is_empty());
        assert_eq!(buffer.len(), 0);
        assert_eq!(buffer.chunk_count(), 0);
    }
}
