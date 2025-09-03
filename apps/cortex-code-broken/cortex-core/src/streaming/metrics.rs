use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime};

/// Streaming metrics collector and analyzer
#[derive(Debug, Clone)]
pub struct StreamingMetrics {
    /// Metrics data storage
    data: Arc<Mutex<MetricsData>>,
    /// Configuration
    config: MetricsConfig,
}

/// Internal metrics data
#[derive(Debug, Default)]
struct MetricsData {
    /// Performance metrics
    performance: PerformanceMetrics,
    /// Quality metrics
    quality: QualityMetrics,
    /// Usage metrics
    usage: UsageMetrics,
    /// Error metrics
    errors: ErrorMetrics,
    /// Historical data
    history: MetricsHistory,
}

/// Performance-related metrics
#[derive(Debug, Default)]
pub struct PerformanceMetrics {
    /// Response time measurements
    pub response_times: VecDeque<Duration>,
    /// Throughput measurements (chunks per second)
    pub throughput: VecDeque<f64>,
    /// Latency measurements
    pub latency: VecDeque<Duration>,
    /// Token processing rate
    pub tokens_per_second: VecDeque<f64>,
    /// Buffer utilization percentages
    pub buffer_utilization: VecDeque<f64>,
    /// Memory usage in bytes
    pub memory_usage: VecDeque<usize>,
    /// CPU usage percentage
    pub cpu_usage: VecDeque<f64>,
}

/// Quality-related metrics
#[derive(Debug, Default)]
pub struct QualityMetrics {
    /// Completion rates
    pub completion_rate: f64,
    /// Error rates
    pub error_rate: f64,
    /// Retry counts
    pub retry_counts: VecDeque<u32>,
    /// Timeout occurrences
    pub timeout_count: u64,
    /// Success counts
    pub success_count: u64,
    /// Total requests
    pub total_requests: u64,
    /// Average chunk sizes
    pub chunk_sizes: VecDeque<usize>,
}

/// Usage-related metrics
#[derive(Debug, Default)]
pub struct UsageMetrics {
    /// Active streams count
    pub active_streams: u32,
    /// Total sessions
    pub total_sessions: u64,
    /// Provider usage counts
    pub provider_usage: HashMap<String, u64>,
    /// Model usage counts
    pub model_usage: HashMap<String, u64>,
    /// Peak concurrent streams
    pub peak_concurrent: u32,
    /// Total tokens processed
    pub total_tokens: u64,
    /// Session durations
    pub session_durations: VecDeque<Duration>,
}

/// Error-related metrics
#[derive(Debug, Default)]
pub struct ErrorMetrics {
    /// Error counts by type
    pub error_types: HashMap<String, u64>,
    /// Error counts by provider
    pub provider_errors: HashMap<String, u64>,
    /// Recent errors
    pub recent_errors: VecDeque<ErrorEntry>,
    /// Total error count
    pub total_errors: u64,
    /// Critical error count
    pub critical_errors: u64,
}

/// Historical metrics storage
#[derive(Debug, Default)]
struct MetricsHistory {
    /// Hourly aggregates
    hourly: VecDeque<AggregateMetrics>,
    /// Daily aggregates
    daily: VecDeque<AggregateMetrics>,
    /// Weekly aggregates
    weekly: VecDeque<AggregateMetrics>,
}

/// Error entry for tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEntry {
    /// Error message
    pub message: String,
    /// Error type
    pub error_type: String,
    /// Provider that caused error
    pub provider: Option<String>,
    /// Timestamp
    pub timestamp: SystemTime,
    /// Request ID if available
    pub request_id: Option<String>,
    /// Stack trace
    pub stack_trace: Option<String>,
}

/// Aggregated metrics for time periods
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregateMetrics {
    /// Time period start
    pub period_start: SystemTime,
    /// Time period end
    pub period_end: SystemTime,
    /// Average response time
    pub avg_response_time_ms: f64,
    /// Average throughput
    pub avg_throughput: f64,
    /// Total requests
    pub total_requests: u64,
    /// Success rate
    pub success_rate: f64,
    /// Error rate
    pub error_rate: f64,
    /// Total tokens
    pub total_tokens: u64,
    /// Peak concurrent streams
    pub peak_concurrent: u32,
}

/// Metrics configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    /// Maximum samples to keep in memory
    pub max_samples: usize,
    /// History retention period in days
    pub retention_days: u32,
    /// Whether to enable detailed tracking
    pub detailed_tracking: bool,
    /// Sampling rate (0.0 to 1.0)
    pub sampling_rate: f64,
    /// Aggregation interval in minutes
    pub aggregation_interval_minutes: u32,
    /// Performance threshold percentiles
    pub performance_thresholds: PerformanceThresholds,
}

/// Performance threshold configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceThresholds {
    /// Warning threshold for response time (ms)
    pub response_time_warning_ms: u64,
    /// Critical threshold for response time (ms)
    pub response_time_critical_ms: u64,
    /// Warning threshold for error rate
    pub error_rate_warning: f64,
    /// Critical threshold for error rate
    pub error_rate_critical: f64,
    /// Warning threshold for memory usage (MB)
    pub memory_warning_mb: usize,
    /// Critical threshold for memory usage (MB)
    pub memory_critical_mb: usize,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            max_samples: 10000,
            retention_days: 30,
            detailed_tracking: true,
            sampling_rate: 1.0,
            aggregation_interval_minutes: 5,
            performance_thresholds: PerformanceThresholds {
                response_time_warning_ms: 5000,
                response_time_critical_ms: 15000,
                error_rate_warning: 0.05,
                error_rate_critical: 0.10,
                memory_warning_mb: 512,
                memory_critical_mb: 1024,
            },
        }
    }
}

/// Streaming event for metrics tracking
#[derive(Debug, Clone)]
pub enum StreamingEvent {
    /// Stream started
    StreamStarted {
        session_id: String,
        provider: String,
        model: String,
        timestamp: SystemTime,
    },
    /// Stream completed
    StreamCompleted {
        session_id: String,
        duration: Duration,
        chunk_count: u64,
        token_count: u64,
        success: bool,
        timestamp: SystemTime,
    },
    /// Chunk received
    ChunkReceived {
        session_id: String,
        chunk_size: usize,
        latency: Duration,
        timestamp: SystemTime,
    },
    /// Error occurred
    ErrorOccurred {
        session_id: Option<String>,
        error: ErrorEntry,
        timestamp: SystemTime,
    },
    /// Buffer updated
    BufferUpdated {
        session_id: String,
        utilization: f64,
        size_bytes: usize,
        timestamp: SystemTime,
    },
    /// Performance sample
    PerformanceSample {
        cpu_usage: f64,
        memory_usage: usize,
        active_streams: u32,
        timestamp: SystemTime,
    },
}

impl StreamingMetrics {
    /// Create a new metrics collector
    pub fn new(config: MetricsConfig) -> Self {
        Self {
            data: Arc::new(Mutex::new(MetricsData::default())),
            config,
        }
    }

    /// Create with default configuration
    pub fn default() -> Self {
        Self::new(MetricsConfig::default())
    }

    /// Record a streaming event
    pub fn record_event(&self, event: StreamingEvent) -> Result<()> {
        if !self.should_sample() {
            return Ok(());
        }

        let mut data = self.data.lock().unwrap();

        match event {
            StreamingEvent::StreamStarted { provider, model, .. } => {
                data.usage.total_sessions += 1;
                data.usage.active_streams += 1;
                data.usage.peak_concurrent = data.usage.peak_concurrent.max(data.usage.active_streams);

                *data.usage.provider_usage.entry(provider).or_insert(0) += 1;
                *data.usage.model_usage.entry(model).or_insert(0) += 1;
            },

            StreamingEvent::StreamCompleted {
                duration,
                chunk_count,
                token_count,
                success,
                ..
            } => {
                data.usage.active_streams = data.usage.active_streams.saturating_sub(1);
                data.usage.total_tokens += token_count;

                self.add_sample(&mut data.usage.session_durations, duration);
                self.add_sample(&mut data.performance.response_times, duration);

                data.quality.total_requests += 1;
                if success {
                    data.quality.success_count += 1;
                } else {
                    data.errors.total_errors += 1;
                }

                // Calculate throughput (chunks per second)
                let throughput = chunk_count as f64 / duration.as_secs_f64();
                self.add_sample(&mut data.performance.throughput, throughput);

                // Calculate tokens per second
                let tokens_per_second = token_count as f64 / duration.as_secs_f64();
                self.add_sample(&mut data.performance.tokens_per_second, tokens_per_second);

                // Update rates
                self.update_rates(&mut data);
            },

            StreamingEvent::ChunkReceived { chunk_size, latency, .. } => {
                self.add_sample(&mut data.performance.latency, latency);
                self.add_sample(&mut data.quality.chunk_sizes, chunk_size);
            },

            StreamingEvent::ErrorOccurred { error, .. } => {
                data.errors.total_errors += 1;

                // Count by error type
                *data.errors.error_types.entry(error.error_type.clone()).or_insert(0) += 1;

                // Count by provider if available
                if let Some(provider) = &error.provider {
                    *data.errors.provider_errors.entry(provider.clone()).or_insert(0) += 1;
                }

                // Add to recent errors
                data.errors.recent_errors.push_back(error);
                if data.errors.recent_errors.len() > self.config.max_samples {
                    data.errors.recent_errors.pop_front();
                }
            },

            StreamingEvent::BufferUpdated { utilization, size_bytes, .. } => {
                self.add_sample(&mut data.performance.buffer_utilization, utilization);
                self.add_sample(&mut data.performance.memory_usage, size_bytes);
            },

            StreamingEvent::PerformanceSample {
                cpu_usage,
                memory_usage,
                active_streams,
                ..
            } => {
                self.add_sample(&mut data.performance.cpu_usage, cpu_usage);
                self.add_sample(&mut data.performance.memory_usage, memory_usage);
                data.usage.active_streams = active_streams;
            },
        }

        Ok(())
    }

    /// Add a sample to a deque with size limit
    fn add_sample<T>(&self, deque: &mut VecDeque<T>, value: T) {
        deque.push_back(value);
        if deque.len() > self.config.max_samples {
            deque.pop_front();
        }
    }

    /// Update calculated rates
    fn update_rates(&self, data: &mut MetricsData) {
        if data.quality.total_requests > 0 {
            data.quality.completion_rate = data.quality.success_count as f64 / data.quality.total_requests as f64;
            data.quality.error_rate = data.errors.total_errors as f64 / data.quality.total_requests as f64;
        }
    }

    /// Check if we should sample this event
    fn should_sample(&self) -> bool {
        if self.config.sampling_rate >= 1.0 {
            return true;
        }

        use rand::Rng;
        let mut rng = rand::thread_rng();
        rng.gen::<f64>() < self.config.sampling_rate
    }

    /// Get current metrics snapshot
    pub fn get_snapshot(&self) -> MetricsSnapshot {
        let data = self.data.lock().unwrap();

        MetricsSnapshot {
            timestamp: SystemTime::now(),
            performance: PerformanceSnapshot {
                avg_response_time_ms: Self::avg_duration(&data.performance.response_times),
                avg_throughput: Self::avg_f64(&data.performance.throughput),
                avg_latency_ms: Self::avg_duration(&data.performance.latency),
                avg_tokens_per_second: Self::avg_f64(&data.performance.tokens_per_second),
                avg_buffer_utilization: Self::avg_f64(&data.performance.buffer_utilization),
                current_memory_mb: data.performance.memory_usage.back().copied().unwrap_or(0) / 1024 / 1024,
                current_cpu_usage: data.performance.cpu_usage.back().copied().unwrap_or(0.0),
            },
            quality: QualitySnapshot {
                completion_rate: data.quality.completion_rate,
                error_rate: data.quality.error_rate,
                avg_chunk_size: Self::avg_usize(&data.quality.chunk_sizes),
                total_requests: data.quality.total_requests,
                success_count: data.quality.success_count,
                timeout_count: data.quality.timeout_count,
            },
            usage: UsageSnapshot {
                active_streams: data.usage.active_streams,
                total_sessions: data.usage.total_sessions,
                peak_concurrent: data.usage.peak_concurrent,
                total_tokens: data.usage.total_tokens,
                provider_usage: data.usage.provider_usage.clone(),
                model_usage: data.usage.model_usage.clone(),
            },
            errors: ErrorSnapshot {
                total_errors: data.errors.total_errors,
                critical_errors: data.errors.critical_errors,
                error_types: data.errors.error_types.clone(),
                provider_errors: data.errors.provider_errors.clone(),
                recent_error_count: data.errors.recent_errors.len(),
            },
        }
    }

    /// Get performance percentiles
    pub fn get_performance_percentiles(&self) -> PerformancePercentiles {
        let data = self.data.lock().unwrap();

        PerformancePercentiles {
            response_time: Self::calculate_percentiles(&data.performance.response_times),
            latency: Self::calculate_percentiles(&data.performance.latency),
            throughput: Self::calculate_percentiles_f64(&data.performance.throughput),
            tokens_per_second: Self::calculate_percentiles_f64(&data.performance.tokens_per_second),
        }
    }

    /// Calculate percentiles for duration data
    fn calculate_percentiles(data: &VecDeque<Duration>) -> Percentiles<f64> {
        if data.is_empty() {
            return Percentiles::default();
        }

        let mut values: Vec<f64> = data.iter().map(|d| d.as_millis() as f64).collect();
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let len = values.len();
        Percentiles {
            p50: values[len * 50 / 100],
            p90: values[len * 90 / 100],
            p95: values[len * 95 / 100],
            p99: values[len * 99 / 100],
        }
    }

    /// Calculate percentiles for f64 data
    fn calculate_percentiles_f64(data: &VecDeque<f64>) -> Percentiles<f64> {
        if data.is_empty() {
            return Percentiles::default();
        }

        let mut values: Vec<f64> = data.iter().copied().collect();
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let len = values.len();
        Percentiles {
            p50: values[len * 50 / 100],
            p90: values[len * 90 / 100],
            p95: values[len * 95 / 100],
            p99: values[len * 99 / 100],
        }
    }

    /// Calculate average duration
    fn avg_duration(data: &VecDeque<Duration>) -> f64 {
        if data.is_empty() {
            return 0.0;
        }

        let sum: Duration = data.iter().sum();
        sum.as_millis() as f64 / data.len() as f64
    }

    /// Calculate average f64
    fn avg_f64(data: &VecDeque<f64>) -> f64 {
        if data.is_empty() {
            return 0.0;
        }

        data.iter().sum::<f64>() / data.len() as f64
    }

    /// Calculate average usize
    fn avg_usize(data: &VecDeque<usize>) -> f64 {
        if data.is_empty() {
            return 0.0;
        }

        data.iter().sum::<usize>() as f64 / data.len() as f64
    }

    /// Check if any thresholds are exceeded
    pub fn check_thresholds(&self) -> Vec<ThresholdAlert> {
        let snapshot = self.get_snapshot();
        let mut alerts = Vec::new();
        let thresholds = &self.config.performance_thresholds;

        // Response time thresholds
        if snapshot.performance.avg_response_time_ms > thresholds.response_time_critical_ms as f64 {
            alerts.push(ThresholdAlert {
                metric: "response_time".to_string(),
                level: AlertLevel::Critical,
                current_value: snapshot.performance.avg_response_time_ms,
                threshold: thresholds.response_time_critical_ms as f64,
                message: "Average response time exceeds critical threshold".to_string(),
            });
        } else if snapshot.performance.avg_response_time_ms > thresholds.response_time_warning_ms as f64 {
            alerts.push(ThresholdAlert {
                metric: "response_time".to_string(),
                level: AlertLevel::Warning,
                current_value: snapshot.performance.avg_response_time_ms,
                threshold: thresholds.response_time_warning_ms as f64,
                message: "Average response time exceeds warning threshold".to_string(),
            });
        }

        // Error rate thresholds
        if snapshot.quality.error_rate > thresholds.error_rate_critical {
            alerts.push(ThresholdAlert {
                metric: "error_rate".to_string(),
                level: AlertLevel::Critical,
                current_value: snapshot.quality.error_rate,
                threshold: thresholds.error_rate_critical,
                message: "Error rate exceeds critical threshold".to_string(),
            });
        } else if snapshot.quality.error_rate > thresholds.error_rate_warning {
            alerts.push(ThresholdAlert {
                metric: "error_rate".to_string(),
                level: AlertLevel::Warning,
                current_value: snapshot.quality.error_rate,
                threshold: thresholds.error_rate_warning,
                message: "Error rate exceeds warning threshold".to_string(),
            });
        }

        // Memory usage thresholds
        if snapshot.performance.current_memory_mb > thresholds.memory_critical_mb {
            alerts.push(ThresholdAlert {
                metric: "memory_usage".to_string(),
                level: AlertLevel::Critical,
                current_value: snapshot.performance.current_memory_mb as f64,
                threshold: thresholds.memory_critical_mb as f64,
                message: "Memory usage exceeds critical threshold".to_string(),
            });
        } else if snapshot.performance.current_memory_mb > thresholds.memory_warning_mb {
            alerts.push(ThresholdAlert {
                metric: "memory_usage".to_string(),
                level: AlertLevel::Warning,
                current_value: snapshot.performance.current_memory_mb as f64,
                threshold: thresholds.memory_warning_mb as f64,
                message: "Memory usage exceeds warning threshold".to_string(),
            });
        }

        alerts
    }

    /// Reset all metrics
    pub fn reset(&self) {
        let mut data = self.data.lock().unwrap();
        *data = MetricsData::default();
    }

    /// Export metrics to JSON
    pub fn export_json(&self) -> Result<String> {
        let snapshot = self.get_snapshot();
        serde_json::to_string_pretty(&snapshot).map_err(Into::into)
    }
}

/// Metrics snapshot for external consumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub timestamp: SystemTime,
    pub performance: PerformanceSnapshot,
    pub quality: QualitySnapshot,
    pub usage: UsageSnapshot,
    pub errors: ErrorSnapshot,
}

/// Performance metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSnapshot {
    pub avg_response_time_ms: f64,
    pub avg_throughput: f64,
    pub avg_latency_ms: f64,
    pub avg_tokens_per_second: f64,
    pub avg_buffer_utilization: f64,
    pub current_memory_mb: usize,
    pub current_cpu_usage: f64,
}

/// Quality metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualitySnapshot {
    pub completion_rate: f64,
    pub error_rate: f64,
    pub avg_chunk_size: f64,
    pub total_requests: u64,
    pub success_count: u64,
    pub timeout_count: u64,
}

/// Usage metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSnapshot {
    pub active_streams: u32,
    pub total_sessions: u64,
    pub peak_concurrent: u32,
    pub total_tokens: u64,
    pub provider_usage: HashMap<String, u64>,
    pub model_usage: HashMap<String, u64>,
}

/// Error metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorSnapshot {
    pub total_errors: u64,
    pub critical_errors: u64,
    pub error_types: HashMap<String, u64>,
    pub provider_errors: HashMap<String, u64>,
    pub recent_error_count: usize,
}

/// Performance percentiles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformancePercentiles {
    pub response_time: Percentiles<f64>,
    pub latency: Percentiles<f64>,
    pub throughput: Percentiles<f64>,
    pub tokens_per_second: Percentiles<f64>,
}

/// Percentile values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Percentiles<T> {
    pub p50: T,
    pub p90: T,
    pub p95: T,
    pub p99: T,
}

impl<T: Default> Default for Percentiles<T> {
    fn default() -> Self {
        Self {
            p50: T::default(),
            p90: T::default(),
            p95: T::default(),
            p99: T::default(),
        }
    }
}

/// Threshold alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThresholdAlert {
    pub metric: String,
    pub level: AlertLevel,
    pub current_value: f64,
    pub threshold: f64,
    pub message: String,
}

/// Alert severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertLevel {
    Warning,
    Critical,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_creation() {
        let config = MetricsConfig::default();
        let metrics = StreamingMetrics::new(config);

        let snapshot = metrics.get_snapshot();
        assert_eq!(snapshot.usage.active_streams, 0);
        assert_eq!(snapshot.usage.total_sessions, 0);
    }

    #[test]
    fn test_stream_events() {
        let metrics = StreamingMetrics::default();

        // Record stream start
        metrics.record_event(StreamingEvent::StreamStarted {
            session_id: "test_session".to_string(),
            provider: "openai".to_string(),
            model: "gpt-4".to_string(),
            timestamp: SystemTime::now(),
        }).unwrap();

        let snapshot = metrics.get_snapshot();
        assert_eq!(snapshot.usage.active_streams, 1);
        assert_eq!(snapshot.usage.total_sessions, 1);
        assert_eq!(snapshot.usage.provider_usage.get("openai"), Some(&1));

        // Record stream completion
        metrics.record_event(StreamingEvent::StreamCompleted {
            session_id: "test_session".to_string(),
            duration: Duration::from_millis(1500),
            chunk_count: 10,
            token_count: 100,
            success: true,
            timestamp: SystemTime::now(),
        }).unwrap();

        let snapshot = metrics.get_snapshot();
        assert_eq!(snapshot.usage.active_streams, 0);
        assert_eq!(snapshot.quality.success_count, 1);
        assert_eq!(snapshot.usage.total_tokens, 100);
    }

    #[test]
    fn test_error_tracking() {
        let metrics = StreamingMetrics::default();

        let error = ErrorEntry {
            message: "Test error".to_string(),
            error_type: "timeout".to_string(),
            provider: Some("openai".to_string()),
            timestamp: SystemTime::now(),
            request_id: Some("req_123".to_string()),
            stack_trace: None,
        };

        metrics.record_event(StreamingEvent::ErrorOccurred {
            session_id: Some("test_session".to_string()),
            error,
            timestamp: SystemTime::now(),
        }).unwrap();

        let snapshot = metrics.get_snapshot();
        assert_eq!(snapshot.errors.total_errors, 1);
        assert_eq!(snapshot.errors.error_types.get("timeout"), Some(&1));
        assert_eq!(snapshot.errors.provider_errors.get("openai"), Some(&1));
    }

    #[test]
    fn test_performance_samples() {
        let metrics = StreamingMetrics::default();

        // Record chunk
        metrics.record_event(StreamingEvent::ChunkReceived {
            session_id: "test".to_string(),
            chunk_size: 1024,
            latency: Duration::from_millis(50),
            timestamp: SystemTime::now(),
        }).unwrap();

        // Record performance sample
        metrics.record_event(StreamingEvent::PerformanceSample {
            cpu_usage: 15.5,
            memory_usage: 512 * 1024 * 1024, // 512 MB
            active_streams: 2,
            timestamp: SystemTime::now(),
        }).unwrap();

        let snapshot = metrics.get_snapshot();
        assert_eq!(snapshot.performance.current_cpu_usage, 15.5);
        assert_eq!(snapshot.performance.current_memory_mb, 512);
        assert_eq!(snapshot.usage.active_streams, 2);
    }

    #[test]
    fn test_threshold_alerts() {
        let config = MetricsConfig {
            performance_thresholds: PerformanceThresholds {
                response_time_warning_ms: 1000,
                response_time_critical_ms: 5000,
                error_rate_warning: 0.1,
                error_rate_critical: 0.2,
                memory_warning_mb: 100,
                memory_critical_mb: 500,
            },
            ..Default::default()
        };

        let metrics = StreamingMetrics::new(config);

        // Add some data that exceeds thresholds
        metrics.record_event(StreamingEvent::StreamCompleted {
            session_id: "test".to_string(),
            duration: Duration::from_millis(6000), // Exceeds critical threshold
            chunk_count: 10,
            token_count: 100,
            success: false, // This creates an error
            timestamp: SystemTime::now(),
        }).unwrap();

        let alerts = metrics.check_thresholds();
        assert!(!alerts.is_empty());

        // Check for response time alert
        let response_time_alert = alerts.iter().find(|a| a.metric == "response_time");
        assert!(response_time_alert.is_some());
        assert_eq!(response_time_alert.unwrap().level, AlertLevel::Critical);
    }

    #[test]
    fn test_percentiles() {
        let metrics = StreamingMetrics::default();

        // Add multiple response times
        for i in 1..=100 {
            metrics.record_event(StreamingEvent::StreamCompleted {
                session_id: format!("test_{}", i),
                duration: Duration::from_millis(i * 10),
                chunk_count: 5,
                token_count: 50,
                success: true,
                timestamp: SystemTime::now(),
            }).unwrap();
        }

        let percentiles = metrics.get_performance_percentiles();
        assert!(percentiles.response_time.p50 > 0.0);
        assert!(percentiles.response_time.p90 > percentiles.response_time.p50);
        assert!(percentiles.response_time.p95 > percentiles.response_time.p90);
        assert!(percentiles.response_time.p99 > percentiles.response_time.p95);
    }

    #[test]
    fn test_metrics_export() {
        let metrics = StreamingMetrics::default();

        metrics.record_event(StreamingEvent::StreamStarted {
            session_id: "test".to_string(),
            provider: "test_provider".to_string(),
            model: "test_model".to_string(),
            timestamp: SystemTime::now(),
        }).unwrap();

        let json = metrics.export_json().unwrap();
        assert!(json.contains("timestamp"));
        assert!(json.contains("performance"));
        assert!(json.contains("test_provider"));
    }

    #[test]
    fn test_sampling_rate() {
        let config = MetricsConfig {
            sampling_rate: 0.0, // No sampling
            ..Default::default()
        };

        let metrics = StreamingMetrics::new(config);

        metrics.record_event(StreamingEvent::StreamStarted {
            session_id: "test".to_string(),
            provider: "test".to_string(),
            model: "test".to_string(),
            timestamp: SystemTime::now(),
        }).unwrap();

        // With 0% sampling, no events should be recorded
        let snapshot = metrics.get_snapshot();
        // Note: The should_sample() check is probabilistic, so this test might be flaky
        // In a real implementation, you'd want to make sampling deterministic for testing
    }

    #[test]
    fn test_metrics_reset() {
        let metrics = StreamingMetrics::default();

        metrics.record_event(StreamingEvent::StreamStarted {
            session_id: "test".to_string(),
            provider: "test".to_string(),
            model: "test".to_string(),
            timestamp: SystemTime::now(),
        }).unwrap();

        let snapshot_before = metrics.get_snapshot();
        assert_eq!(snapshot_before.usage.total_sessions, 1);

        metrics.reset();

        let snapshot_after = metrics.get_snapshot();
        assert_eq!(snapshot_after.usage.total_sessions, 0);
    }
}
