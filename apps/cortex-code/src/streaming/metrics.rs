//! Streaming metrics and performance monitoring

use crate::streaming::StreamingChunk;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::{Duration, SystemTime};

/// Performance metrics for streaming sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingMetrics {
    /// Session start time
    pub start_time: Option<SystemTime>,
    /// Total chunks processed
    pub total_chunks: u64,
    /// Total bytes processed
    pub total_bytes: usize,
    /// Average chunk size
    pub avg_chunk_size: f64,
    /// Chunks per second
    pub chunks_per_second: f64,
    /// Bytes per second
    pub bytes_per_second: f64,
    /// Latency measurements (last 100)
    pub latencies: VecDeque<Duration>,
    /// Average latency
    pub avg_latency: Duration,
    /// Peak latency
    pub peak_latency: Duration,
    /// Number of errors encountered
    pub error_count: u64,
    /// Last error message
    pub last_error: Option<String>,
    /// Session duration
    pub duration: Duration,
}

impl Default for StreamingMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamingMetrics {
    /// Create new metrics instance
    pub fn new() -> Self {
        Self {
            start_time: None,
            total_chunks: 0,
            total_bytes: 0,
            avg_chunk_size: 0.0,
            chunks_per_second: 0.0,
            bytes_per_second: 0.0,
            latencies: VecDeque::new(),
            avg_latency: Duration::from_millis(0),
            peak_latency: Duration::from_millis(0),
            error_count: 0,
            last_error: None,
            duration: Duration::from_millis(0),
        }
    }

    /// Reset all metrics
    pub fn reset(&mut self) {
        *self = Self::new();
    }

    /// Start timing
    pub fn start(&mut self) {
        self.start_time = Some(SystemTime::now());
    }

    /// Record a chunk
    pub fn record_chunk(&mut self, chunk: &StreamingChunk) {
        if self.start_time.is_none() {
            self.start();
        }

        self.total_chunks += 1;
        self.total_bytes += chunk.content.len();

        // Calculate latency (time since chunk creation)
        let latency = chunk.timestamp.elapsed().unwrap_or(Duration::from_millis(0));
        self.latencies.push_back(latency);

        // Keep only last 100 latencies
        if self.latencies.len() > 100 {
            self.latencies.pop_front();
        }

        // Update peak latency
        if latency > self.peak_latency {
            self.peak_latency = latency;
        }

        self.update_derived_metrics();
    }

    /// Record an error
    pub fn record_error(&mut self, error: &str) {
        self.error_count += 1;
        self.last_error = Some(error.to_string());
    }

    /// Update derived metrics
    fn update_derived_metrics(&mut self) {
        if let Some(start_time) = self.start_time {
            self.duration = start_time.elapsed().unwrap_or(Duration::from_millis(0));
            let duration_secs = self.duration.as_secs_f64();

            if duration_secs > 0.0 {
                self.chunks_per_second = self.total_chunks as f64 / duration_secs;
                self.bytes_per_second = self.total_bytes as f64 / duration_secs;
            }

            if self.total_chunks > 0 {
                self.avg_chunk_size = self.total_bytes as f64 / self.total_chunks as f64;
            }

            if !self.latencies.is_empty() {
                let total_latency: Duration = self.latencies.iter().sum();
                self.avg_latency = total_latency / self.latencies.len() as u32;
            }
        }
    }

    /// Get performance summary
    pub fn get_summary(&self) -> MetricsSummary {
        MetricsSummary {
            duration_ms: self.duration.as_millis() as u64,
            total_chunks: self.total_chunks,
            total_bytes: self.total_bytes,
            avg_chunk_size: self.avg_chunk_size,
            throughput_cps: self.chunks_per_second,
            throughput_bps: self.bytes_per_second,
            avg_latency_ms: self.avg_latency.as_millis() as u64,
            peak_latency_ms: self.peak_latency.as_millis() as u64,
            error_count: self.error_count,
            error_rate: if self.total_chunks > 0 {
                self.error_count as f64 / self.total_chunks as f64 * 100.0
            } else {
                0.0
            },
        }
    }

    /// Check if performance is good
    pub fn is_performing_well(&self) -> bool {
        self.avg_latency < Duration::from_millis(100) &&
        self.error_count == 0 &&
        self.chunks_per_second > 10.0
    }

    /// Get performance grade
    pub fn get_performance_grade(&self) -> PerformanceGrade {
        if self.error_count > 0 {
            return PerformanceGrade::Poor;
        }

        let latency_ms = self.avg_latency.as_millis();
        let throughput = self.chunks_per_second;

        match (latency_ms, throughput) {
            (0..=50, t) if t > 20.0 => PerformanceGrade::Excellent,
            (0..=100, t) if t > 10.0 => PerformanceGrade::Good,
            (0..=200, t) if t > 5.0 => PerformanceGrade::Fair,
            _ => PerformanceGrade::Poor,
        }
    }
}

/// Summary of streaming metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSummary {
    pub duration_ms: u64,
    pub total_chunks: u64,
    pub total_bytes: usize,
    pub avg_chunk_size: f64,
    pub throughput_cps: f64,
    pub throughput_bps: f64,
    pub avg_latency_ms: u64,
    pub peak_latency_ms: u64,
    pub error_count: u64,
    pub error_rate: f64,
}

/// Performance grade for streaming session
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PerformanceGrade {
    Excellent,
    Good,
    Fair,
    Poor,
}

impl std::fmt::Display for PerformanceGrade {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PerformanceGrade::Excellent => write!(f, "Excellent (A)"),
            PerformanceGrade::Good => write!(f, "Good (B)"),
            PerformanceGrade::Fair => write!(f, "Fair (C)"),
            PerformanceGrade::Poor => write!(f, "Poor (D)"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_creation() {
        let metrics = StreamingMetrics::new();
        assert_eq!(metrics.total_chunks, 0);
        assert_eq!(metrics.total_bytes, 0);
        assert!(metrics.start_time.is_none());
    }

    #[test]
    fn test_chunk_recording() {
        let mut metrics = StreamingMetrics::new();
        let chunk = crate::streaming::StreamingChunk {
            content: "Hello".to_string(),
            sequence: 0,
            timestamp: SystemTime::now(),
            metadata: None,
        };

        metrics.record_chunk(&chunk);

        assert_eq!(metrics.total_chunks, 1);
        assert_eq!(metrics.total_bytes, 5);
        assert!(metrics.start_time.is_some());
    }

    #[test]
    fn test_error_recording() {
        let mut metrics = StreamingMetrics::new();
        metrics.record_error("Test error");

        assert_eq!(metrics.error_count, 1);
        assert_eq!(metrics.last_error, Some("Test error".to_string()));
    }

    #[test]
    fn test_performance_grade() {
        let mut metrics = StreamingMetrics::new();

        // Should start as poor (no data)
        assert_eq!(metrics.get_performance_grade(), PerformanceGrade::Poor);

        // Add an error
        metrics.record_error("Test error");
        assert_eq!(metrics.get_performance_grade(), PerformanceGrade::Poor);
    }

    #[test]
    fn test_metrics_summary() {
        let mut metrics = StreamingMetrics::new();
        let chunk = crate::streaming::StreamingChunk {
            content: "Test".to_string(),
            sequence: 0,
            timestamp: SystemTime::now(),
            metadata: None,
        };

        metrics.record_chunk(&chunk);
        let summary = metrics.get_summary();

        assert_eq!(summary.total_chunks, 1);
        assert_eq!(summary.total_bytes, 4);
        assert_eq!(summary.avg_chunk_size, 4.0);
    }
}
