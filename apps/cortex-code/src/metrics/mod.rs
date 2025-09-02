//! Metrics and monitoring system for Cortex Code
//! Provides performance tracking, usage statistics, and health monitoring

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub timestamp: u64,
    pub requests: RequestMetrics,
    pub performance: PerformanceMetrics,
    pub usage: UsageMetrics,
    pub errors: ErrorMetrics,
    pub system: SystemMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMetrics {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_response_time_ms: f64,
    pub requests_per_minute: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub memory_usage_mb: f64,
    pub cpu_usage_percent: f64,
    pub response_time_p50_ms: f64,
    pub response_time_p95_ms: f64,
    pub response_time_p99_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMetrics {
    pub active_sessions: usize,
    pub total_conversations: u64,
    pub total_tokens_processed: u64,
    pub provider_usage: HashMap<String, u64>,
    pub feature_usage: HashMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorMetrics {
    pub total_errors: u64,
    pub error_rate_percent: f64,
    pub error_types: HashMap<String, u64>,
    pub last_error_time: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub uptime_seconds: u64,
    pub startup_time: u64,
    pub health_status: HealthStatus,
    pub component_health: HashMap<String, ComponentHealth>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub status: HealthStatus,
    pub last_check: u64,
    pub error_count: u64,
    pub message: Option<String>,
}

#[derive(Debug)]
pub struct MetricsCollector {
    startup_time: Instant,
    system_startup: SystemTime,

    // Atomic counters for thread-safe updates
    total_requests: AtomicU64,
    successful_requests: AtomicU64,
    failed_requests: AtomicU64,
    total_conversations: AtomicU64,
    total_tokens: AtomicU64,
    total_errors: AtomicU64,

    // Thread-safe collections
    active_sessions: AtomicUsize,
    provider_usage: Arc<RwLock<HashMap<String, u64>>>,
    feature_usage: Arc<RwLock<HashMap<String, u64>>>,
    error_types: Arc<RwLock<HashMap<String, u64>>>,
    component_health: Arc<RwLock<HashMap<String, ComponentHealth>>>,

    // Response time tracking
    response_times: Arc<RwLock<Vec<Duration>>>,
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

impl MetricsCollector {
    pub fn new() -> Self {
        let now = Instant::now();
        let system_now = SystemTime::now();

        Self {
            startup_time: now,
            system_startup: system_now,
            total_requests: AtomicU64::new(0),
            successful_requests: AtomicU64::new(0),
            failed_requests: AtomicU64::new(0),
            total_conversations: AtomicU64::new(0),
            total_tokens: AtomicU64::new(0),
            total_errors: AtomicU64::new(0),
            active_sessions: AtomicUsize::new(0),
            provider_usage: Arc::new(RwLock::new(HashMap::new())),
            feature_usage: Arc::new(RwLock::new(HashMap::new())),
            error_types: Arc::new(RwLock::new(HashMap::new())),
            component_health: Arc::new(RwLock::new(HashMap::new())),
            response_times: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn record_request(&self, duration: Duration, success: bool) {
        self.total_requests.fetch_add(1, Ordering::Relaxed);

        if success {
            self.successful_requests.fetch_add(1, Ordering::Relaxed);
        } else {
            self.failed_requests.fetch_add(1, Ordering::Relaxed);
        }

        // Record response time
        let mut response_times = self.response_times.write().await;
        response_times.push(duration);

        // Keep only recent response times (last 1000 requests)
        if response_times.len() > 1000 {
            response_times.drain(..500); // Remove oldest half
        }
    }

    pub async fn record_provider_usage(&self, provider: &str) {
        let mut usage = self.provider_usage.write().await;
        *usage.entry(provider.to_string()).or_insert(0) += 1;
    }

    pub async fn record_feature_usage(&self, feature: &str) {
        let mut usage = self.feature_usage.write().await;
        *usage.entry(feature.to_string()).or_insert(0) += 1;
    }

    pub fn record_conversation(&self) {
        self.total_conversations.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_tokens(&self, count: u64) {
        self.total_tokens.fetch_add(count, Ordering::Relaxed);
    }

    pub async fn record_error(&self, error_type: &str) {
        self.total_errors.fetch_add(1, Ordering::Relaxed);

        let mut errors = self.error_types.write().await;
        *errors.entry(error_type.to_string()).or_insert(0) += 1;
    }

    pub fn add_session(&self) {
        self.active_sessions.fetch_add(1, Ordering::Relaxed);
    }

    pub fn remove_session(&self) {
        self.active_sessions.fetch_sub(1, Ordering::Relaxed);
    }

    pub async fn update_component_health(&self, component: &str, health: ComponentHealth) {
        let mut components = self.component_health.write().await;
        components.insert(component.to_string(), health);
    }

    pub async fn get_snapshot(&self) -> MetricsSnapshot {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let uptime = self.startup_time.elapsed().as_secs();
        let total_requests = self.total_requests.load(Ordering::Relaxed);
        let successful_requests = self.successful_requests.load(Ordering::Relaxed);
        let failed_requests = self.failed_requests.load(Ordering::Relaxed);
        let total_errors = self.total_errors.load(Ordering::Relaxed);

        // Calculate response time percentiles
        let response_times = self.response_times.read().await;
        let (p50, p95, p99, avg) = if response_times.is_empty() {
            (0.0, 0.0, 0.0, 0.0)
        } else {
            let mut times: Vec<f64> = response_times
                .iter()
                .map(|d| d.as_millis() as f64)
                .collect();
            times.sort_by(|a, b| a.partial_cmp(b).unwrap());

            let len = times.len();
            let p50 = times[len * 50 / 100];
            let p95 = times[len * 95 / 100];
            let p99 = times[len * 99 / 100];
            let avg = times.iter().sum::<f64>() / len as f64;

            (p50, p95, p99, avg)
        };

        // Calculate request rate (requests per minute)
        let requests_per_minute = if uptime > 0 {
            (total_requests as f64) / (uptime as f64 / 60.0)
        } else {
            0.0
        };

        // Calculate error rate
        let error_rate_percent = if total_requests > 0 {
            (total_errors as f64) / (total_requests as f64) * 100.0
        } else {
            0.0
        };

        // Determine overall health status
        let health_status = if error_rate_percent > 10.0 {
            HealthStatus::Unhealthy
        } else if error_rate_percent > 5.0 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };

        MetricsSnapshot {
            timestamp: now,
            requests: RequestMetrics {
                total_requests,
                successful_requests,
                failed_requests,
                average_response_time_ms: avg,
                requests_per_minute,
            },
            performance: PerformanceMetrics {
                memory_usage_mb: self.get_memory_usage_mb(),
                cpu_usage_percent: self.get_cpu_usage_percent(),
                response_time_p50_ms: p50,
                response_time_p95_ms: p95,
                response_time_p99_ms: p99,
            },
            usage: UsageMetrics {
                active_sessions: self.active_sessions.load(Ordering::Relaxed),
                total_conversations: self.total_conversations.load(Ordering::Relaxed),
                total_tokens_processed: self.total_tokens.load(Ordering::Relaxed),
                provider_usage: self.provider_usage.read().await.clone(),
                feature_usage: self.feature_usage.read().await.clone(),
            },
            errors: ErrorMetrics {
                total_errors,
                error_rate_percent,
                error_types: self.error_types.read().await.clone(),
                last_error_time: None, // TODO: Track last error timestamp
            },
            system: SystemMetrics {
                uptime_seconds: uptime,
                startup_time: self.system_startup
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
                health_status,
                component_health: self.component_health.read().await.clone(),
            },
        }
    }

    fn get_memory_usage_mb(&self) -> f64 {
        // Platform-specific memory usage detection
        // This is a simplified implementation
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            if let Ok(output) = Command::new("ps")
                .args(["-o", "rss=", "-p"])
                .arg(std::process::id().to_string())
                .output()
            {
                if let Ok(rss_str) = String::from_utf8(output.stdout) {
                    if let Ok(rss_kb) = rss_str.trim().parse::<f64>() {
                        return rss_kb / 1024.0; // Convert KB to MB
                    }
                }
            }
        }

        // Fallback - return 0 if we can't determine memory usage
        0.0
    }

    fn get_cpu_usage_percent(&self) -> f64 {
        // Platform-specific CPU usage detection
        // This is a simplified implementation that returns 0
        // In a real implementation, you'd use system monitoring libraries
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_metrics_collection() {
        let metrics = MetricsCollector::new();

        // Record some sample data
        metrics.record_request(Duration::from_millis(100), true).await;
        metrics.record_request(Duration::from_millis(200), false).await;
        metrics.record_provider_usage("openai").await;
        metrics.record_conversation();
        metrics.record_tokens(150);

        let snapshot = metrics.get_snapshot().await;

        assert_eq!(snapshot.requests.total_requests, 2);
        assert_eq!(snapshot.requests.successful_requests, 1);
        assert_eq!(snapshot.requests.failed_requests, 1);
        assert_eq!(snapshot.usage.total_conversations, 1);
        assert_eq!(snapshot.usage.total_tokens_processed, 150);
        assert!(snapshot.usage.provider_usage.contains_key("openai"));
    }
}
