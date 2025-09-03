//! Stream buffer implementation for efficient chunk management

use crate::streaming::StreamingChunk;
use std::collections::VecDeque;
use std::time::Instant;

/// Efficient buffer for streaming chunks
#[derive(Debug)]
pub struct StreamBuffer {
    /// Buffered content
    content: String,
    /// Buffer capacity
    capacity: usize,
    /// Chunk history for debugging
    chunks: VecDeque<StreamingChunk>,
    /// Total bytes processed
    total_bytes: usize,
    /// Last update timestamp
    last_update: Instant,
}

impl StreamBuffer {
    /// Create a new stream buffer
    pub fn new(capacity: usize) -> Self {
        Self {
            content: String::with_capacity(capacity),
            capacity,
            chunks: VecDeque::new(),
            total_bytes: 0,
            last_update: Instant::now(),
        }
    }

    /// Add a chunk to the buffer
    pub fn add_chunk(&mut self, chunk: &StreamingChunk) -> String {
        // Add content to buffer
        self.content.push_str(&chunk.content);
        self.total_bytes += chunk.content.len();
        self.last_update = Instant::now();

        // Store chunk for history (limit to last 100 chunks)
        self.chunks.push_back(chunk.clone());
        if self.chunks.len() > 100 {
            self.chunks.pop_front();
        }

        // Return the new content for immediate display
        chunk.content.clone()
    }

    /// Get the current content
    pub fn get_content(&self) -> String {
        self.content.clone()
    }

    /// Get content length
    pub fn len(&self) -> usize {
        self.content.len()
    }

    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.content.is_empty()
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.content.clear();
        self.chunks.clear();
        self.total_bytes = 0;
        self.last_update = Instant::now();
    }

    /// Get the last N characters for preview
    pub fn get_tail(&self, n: usize) -> String {
        if self.content.len() <= n {
            self.content.clone()
        } else {
            self.content.chars().skip(self.content.chars().count() - n).collect()
        }
    }

    /// Get buffer statistics
    pub fn get_stats(&self) -> BufferStats {
        BufferStats {
            content_length: self.content.len(),
            chunk_count: self.chunks.len(),
            total_bytes: self.total_bytes,
            capacity: self.capacity,
            utilization: self.content.len() as f64 / self.capacity as f64,
            last_update: self.last_update,
        }
    }

    /// Check if buffer needs optimization
    pub fn needs_optimization(&self) -> bool {
        // Optimize if content is much larger than capacity
        self.content.len() > self.capacity * 2
    }

    /// Optimize buffer by keeping only recent content
    pub fn optimize(&mut self, keep_chars: usize) {
        if self.content.len() > keep_chars {
            let start_pos = self.content.chars().count() - keep_chars;
            self.content = self.content.chars().skip(start_pos).collect();

            // Clear old chunks since they're no longer relevant
            self.chunks.clear();
        }
    }
}

/// Buffer statistics
#[derive(Debug, Clone)]
pub struct BufferStats {
    pub content_length: usize,
    pub chunk_count: usize,
    pub total_bytes: usize,
    pub capacity: usize,
    pub utilization: f64,
    pub last_update: Instant,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::streaming::StreamingChunk;
    use std::time::SystemTime;

    #[test]
    fn test_buffer_creation() {
        let buffer = StreamBuffer::new(1024);
        assert_eq!(buffer.capacity, 1024);
        assert!(buffer.is_empty());
    }

    #[test]
    fn test_add_chunk() {
        let mut buffer = StreamBuffer::new(1024);
        let chunk = StreamingChunk {
            content: "Hello".to_string(),
            sequence: 0,
            timestamp: SystemTime::now(),
            metadata: None,
        };

        let result = buffer.add_chunk(&chunk);
        assert_eq!(result, "Hello");
        assert_eq!(buffer.get_content(), "Hello");
        assert_eq!(buffer.len(), 5);
    }

    #[test]
    fn test_buffer_optimization() {
        let mut buffer = StreamBuffer::new(10);

        // Add content that exceeds capacity
        let chunk = StreamingChunk {
            content: "This is a very long string that exceeds the buffer capacity".to_string(),
            sequence: 0,
            timestamp: SystemTime::now(),
            metadata: None,
        };

        buffer.add_chunk(&chunk);
        assert!(buffer.needs_optimization());

        buffer.optimize(20);
        assert_eq!(buffer.len(), 20);
    }
}
