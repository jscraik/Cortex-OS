use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Semaphore};
use tracing::{debug, error, info, warn};

/// Resource management system for cortex-code
///
/// Provides memory monitoring, connection pooling, rate limiting,
/// and circuit breaker patterns for robust operation.
/// Follows September 2025 standards with functional programming patterns.
pub struct ResourceManager {
    config: ResourceConfig,
    memory_monitor: Arc<MemoryMonitor>,
    connection_pool: Arc<ConnectionPool>,
    rate_limiter: Arc<RateLimiter>,
    circuit_breaker: Arc<RwLock<CircuitBreaker>>,
    metrics: Arc<ResourceMetrics>,
}

/// Resource management configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceConfig {
    /// Maximum memory usage in MB
    pub max_memory_mb: u64,
    /// Maximum CPU percentage (0-100)
    pub max_cpu_percent: f32,
    /// Maximum concurrent requests
    pub max_concurrent_requests: usize,
    /// Request timeout in milliseconds
    pub request_timeout_ms: u64,
    /// Enable circuit breaker
    pub circuit_breaker_enabled: bool,
    /// Circuit breaker failure threshold
    pub circuit_breaker_threshold: f32,
    /// Rate limit requests per second
    pub rate_limit_rps: u32,
    /// Memory cleanup interval in seconds
    pub memory_cleanup_interval_s: u64,
}

/// Memory monitoring system
pub struct MemoryMonitor {
    max_memory_bytes: AtomicU64,
    current_usage_bytes: AtomicU64,
    peak_usage_bytes: AtomicU64,
    cleanup_threshold: f32,
    last_cleanup: Arc<RwLock<Instant>>,
}

/// Connection pool manager
pub struct ConnectionPool {
    max_connections: usize,
    active_connections: AtomicUsize,
    connection_semaphore: Semaphore,
    connection_timeout: Duration,
}

/// Rate limiting system
pub struct RateLimiter {
    requests_per_second: AtomicU32,
    current_requests: AtomicU32,
    window_start: Arc<RwLock<Instant>>,
    window_duration: Duration,
}

/// Circuit breaker for fault tolerance
#[derive(Debug)]
pub struct CircuitBreaker {
    state: CircuitBreakerState,
    failure_count: u32,
    success_count: u32,
    failure_threshold: u32,
    timeout: Duration,
    last_failure_time: Option<Instant>,
}

/// Circuit breaker states
#[derive(Debug, Clone, PartialEq)]
pub enum CircuitBreakerState {
    Closed,
    Open,
    HalfOpen,
}

/// Resource usage metrics
pub struct ResourceMetrics {
    total_requests: AtomicU64,
    successful_requests: AtomicU64,
    failed_requests: AtomicU64,
    circuit_breaker_trips: AtomicU32,
    rate_limit_hits: AtomicU32,
    memory_cleanups: AtomicU32,
}

/// Resource allocation result
#[derive(Debug)]
pub enum ResourceAllocation {
    Success,
    MemoryExhausted,
    RateLimited,
    CircuitOpen,
    ConnectionPoolFull,
}

impl Default for ResourceConfig {
    fn default() -> Self {
        Self {
            max_memory_mb: 1024, // 1GB default
            max_cpu_percent: 80.0,
            max_concurrent_requests: 100,
            request_timeout_ms: 30_000, // 30 seconds
            circuit_breaker_enabled: true,
            circuit_breaker_threshold: 0.5, // 50% failure rate
            rate_limit_rps: 100,
            memory_cleanup_interval_s: 60,
        }
    }
}

impl ResourceManager {
    /// Create new resource manager
    pub fn new(config: ResourceConfig) -> Self {
        let memory_monitor = Arc::new(MemoryMonitor::new(config.max_memory_mb * 1024 * 1024));
        let connection_pool = Arc::new(ConnectionPool::new(
            config.max_concurrent_requests,
            Duration::from_millis(config.request_timeout_ms),
        ));
        let rate_limiter = Arc::new(RateLimiter::new(config.rate_limit_rps));
        let circuit_breaker = Arc::new(RwLock::new(CircuitBreaker::new(
            (config.circuit_breaker_threshold * 10.0) as u32,
            Duration::from_secs(30),
        )));
        let metrics = Arc::new(ResourceMetrics::new());

        Self {
            config,
            memory_monitor,
            connection_pool,
            rate_limiter,
            circuit_breaker,
            metrics,
        }
    }

    /// Attempt to allocate resources for a request
    pub async fn allocate_resources(&self) -> Result<ResourceAllocation> {
        // Check circuit breaker first
        if self.config.circuit_breaker_enabled {
            let circuit_state = self.circuit_breaker.read().await.get_state();
            if circuit_state == CircuitBreakerState::Open {
                self.metrics.circuit_breaker_trips.fetch_add(1, Ordering::Relaxed);
                return Ok(ResourceAllocation::CircuitOpen);
            }
        }

        // Check rate limiting
        if !self.rate_limiter.allow_request() {
            self.metrics.rate_limit_hits.fetch_add(1, Ordering::Relaxed);
            return Ok(ResourceAllocation::RateLimited);
        }

        // Check memory usage
        if !self.memory_monitor.check_available_memory() {
            return Ok(ResourceAllocation::MemoryExhausted);
        }

        // Check connection pool
        if !self.connection_pool.try_acquire_connection() {
            return Ok(ResourceAllocation::ConnectionPoolFull);
        }

        self.metrics.total_requests.fetch_add(1, Ordering::Relaxed);
        Ok(ResourceAllocation::Success)
    }

    /// Release resources after request completion
    pub async fn release_resources(&self, success: bool) {
        self.connection_pool.release_connection();

        if success {
            self.metrics.successful_requests.fetch_add(1, Ordering::Relaxed);
            if self.config.circuit_breaker_enabled {
                self.circuit_breaker.write().await.record_success();
            }
        } else {
            self.metrics.failed_requests.fetch_add(1, Ordering::Relaxed);
            if self.config.circuit_breaker_enabled {
                self.circuit_breaker.write().await.record_failure();
            }
        }
    }

    /// Get current resource metrics
    pub fn get_metrics(&self) -> ResourceSnapshot {
        ResourceSnapshot {
            total_requests: self.metrics.total_requests.load(Ordering::Relaxed),
            successful_requests: self.metrics.successful_requests.load(Ordering::Relaxed),
            failed_requests: self.metrics.failed_requests.load(Ordering::Relaxed),
            circuit_breaker_trips: self.metrics.circuit_breaker_trips.load(Ordering::Relaxed),
            rate_limit_hits: self.metrics.rate_limit_hits.load(Ordering::Relaxed),
            memory_usage_bytes: self.memory_monitor.current_usage_bytes.load(Ordering::Relaxed),
            peak_memory_bytes: self.memory_monitor.peak_usage_bytes.load(Ordering::Relaxed),
            active_connections: self.connection_pool.active_connections.load(Ordering::Relaxed),
        }
    }

    /// Perform cleanup operations
    pub async fn cleanup(&self) -> Result<()> {
        let should_cleanup = {
            let last_cleanup = self.memory_monitor.last_cleanup.read().await;
            last_cleanup.elapsed().as_secs() >= self.config.memory_cleanup_interval_s
        };

        if should_cleanup {
            self.memory_monitor.perform_cleanup().await?;
            self.metrics.memory_cleanups.fetch_add(1, Ordering::Relaxed);
        }

        Ok(())
    }
}

impl MemoryMonitor {
    fn new(max_memory_bytes: u64) -> Self {
        Self {
            max_memory_bytes: AtomicU64::new(max_memory_bytes),
            current_usage_bytes: AtomicU64::new(0),
            peak_usage_bytes: AtomicU64::new(0),
            cleanup_threshold: 0.8, // 80% threshold
            last_cleanup: Arc::new(RwLock::new(Instant::now())),
        }
    }

    fn check_available_memory(&self) -> bool {
        let current = self.current_usage_bytes.load(Ordering::Relaxed);
        let max = self.max_memory_bytes.load(Ordering::Relaxed);
        let usage_ratio = current as f64 / max as f64;

        usage_ratio < self.cleanup_threshold as f64
    }

    async fn perform_cleanup(&self) -> Result<()> {
        // Force garbage collection if possible
        #[cfg(feature = "gc")]
        {
            std::gc::collect();
        }

        // Update last cleanup time
        let mut last_cleanup = self.last_cleanup.write().await;
        *last_cleanup = Instant::now();

        info!("Memory cleanup performed");
        Ok(())
    }

    fn record_allocation(&self, bytes: u64) {
        let new_usage = self.current_usage_bytes.fetch_add(bytes, Ordering::Relaxed) + bytes;

        // Update peak if necessary
        let current_peak = self.peak_usage_bytes.load(Ordering::Relaxed);
        if new_usage > current_peak {
            self.peak_usage_bytes.store(new_usage, Ordering::Relaxed);
        }
    }

    fn record_deallocation(&self, bytes: u64) {
        self.current_usage_bytes.fetch_sub(bytes, Ordering::Relaxed);
    }
}

impl ConnectionPool {
    fn new(max_connections: usize, timeout: Duration) -> Self {
        Self {
            max_connections,
            active_connections: AtomicUsize::new(0),
            connection_semaphore: Semaphore::new(max_connections),
            connection_timeout: timeout,
        }
    }

    fn try_acquire_connection(&self) -> bool {
        if let Ok(_permit) = self.connection_semaphore.try_acquire() {
            self.active_connections.fetch_add(1, Ordering::Relaxed);
            std::mem::forget(_permit); // Keep permit until release_connection
            true
        } else {
            false
        }
    }

    fn release_connection(&self) {
        if self.active_connections.load(Ordering::Relaxed) > 0 {
            self.active_connections.fetch_sub(1, Ordering::Relaxed);
            self.connection_semaphore.add_permits(1);
        }
    }
}

impl RateLimiter {
    fn new(requests_per_second: u32) -> Self {
        Self {
            requests_per_second: AtomicU32::new(requests_per_second),
            current_requests: AtomicU32::new(0),
            window_start: Arc::new(RwLock::new(Instant::now())),
            window_duration: Duration::from_secs(1),
        }
    }

    fn allow_request(&self) -> bool {
        let now = Instant::now();
        let requests_per_second = self.requests_per_second.load(Ordering::Relaxed);

        // Check if we need to reset the window
        let window_start = {
            let window = futures::executor::block_on(self.window_start.read());
            *window
        };

        if now.duration_since(window_start) >= self.window_duration {
            // Reset window
            let mut window = futures::executor::block_on(self.window_start.write());
            *window = now;
            self.current_requests.store(0, Ordering::Relaxed);
        }

        let current_requests = self.current_requests.fetch_add(1, Ordering::Relaxed);
        current_requests < requests_per_second
    }
}

impl CircuitBreaker {
    fn new(failure_threshold: u32, timeout: Duration) -> Self {
        Self {
            state: CircuitBreakerState::Closed,
            failure_count: 0,
            success_count: 0,
            failure_threshold,
            timeout,
            last_failure_time: None,
        }
    }

    fn get_state(&self) -> CircuitBreakerState {
        match self.state {
            CircuitBreakerState::Open => {
                if let Some(last_failure) = self.last_failure_time {
                    if last_failure.elapsed() >= self.timeout {
                        return CircuitBreakerState::HalfOpen;
                    }
                }
                CircuitBreakerState::Open
            }
            other => other,
        }
    }

    fn record_success(&mut self) {
        self.success_count += 1;
        self.failure_count = 0;

        if self.state == CircuitBreakerState::HalfOpen {
            self.state = CircuitBreakerState::Closed;
        }
    }

    fn record_failure(&mut self) {
        self.failure_count += 1;
        self.last_failure_time = Some(Instant::now());

        if self.failure_count >= self.failure_threshold {
            self.state = CircuitBreakerState::Open;
        }
    }
}

impl ResourceMetrics {
    fn new() -> Self {
        Self {
            total_requests: AtomicU64::new(0),
            successful_requests: AtomicU64::new(0),
            failed_requests: AtomicU64::new(0),
            circuit_breaker_trips: AtomicU32::new(0),
            rate_limit_hits: AtomicU32::new(0),
            memory_cleanups: AtomicU32::new(0),
        }
    }
}

/// Resource usage snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSnapshot {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub circuit_breaker_trips: u32,
    pub rate_limit_hits: u32,
    pub memory_usage_bytes: u64,
    pub peak_memory_bytes: u64,
    pub active_connections: usize,
}

impl ResourceSnapshot {
    /// Calculate success rate as percentage
    pub fn success_rate(&self) -> f64 {
        if self.total_requests == 0 {
            return 100.0;
        }

        (self.successful_requests as f64 / self.total_requests as f64) * 100.0
    }

    /// Calculate memory usage percentage
    pub fn memory_usage_percent(&self, max_memory_bytes: u64) -> f64 {
        if max_memory_bytes == 0 {
            return 0.0;
        }

        (self.memory_usage_bytes as f64 / max_memory_bytes as f64) * 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_resource_manager_allocation() {
        let config = ResourceConfig::default();
        let manager = ResourceManager::new(config);

        let result = manager.allocate_resources().await.unwrap();
        assert!(matches!(result, ResourceAllocation::Success));

        manager.release_resources(true).await;

        let metrics = manager.get_metrics();
        assert_eq!(metrics.total_requests, 1);
        assert_eq!(metrics.successful_requests, 1);
    }

    #[tokio::test]
    async fn test_memory_monitor() {
        let monitor = MemoryMonitor::new(1024 * 1024); // 1MB

        assert!(monitor.check_available_memory());

        monitor.record_allocation(500 * 1024); // 500KB
        assert!(monitor.check_available_memory());

        monitor.record_allocation(600 * 1024); // 600KB more (total 1.1MB > 80% of 1MB)
        assert!(!monitor.check_available_memory());

        monitor.record_deallocation(600 * 1024);
        assert!(monitor.check_available_memory());
    }

    #[tokio::test]
    async fn test_connection_pool() {
        let pool = ConnectionPool::new(2, Duration::from_secs(30));

        assert!(pool.try_acquire_connection());
        assert!(pool.try_acquire_connection());
        assert!(!pool.try_acquire_connection()); // Pool exhausted

        pool.release_connection();
        assert!(pool.try_acquire_connection()); // Available again
    }

    #[tokio::test]
    async fn test_rate_limiter() {
        let limiter = RateLimiter::new(2); // 2 requests per second

        assert!(limiter.allow_request());
        assert!(limiter.allow_request());
        assert!(!limiter.allow_request()); // Rate limited

        // Wait for window reset
        sleep(Duration::from_secs(1)).await;
        assert!(limiter.allow_request());
    }

    #[tokio::test]
    async fn test_circuit_breaker() {
        let mut breaker = CircuitBreaker::new(2, Duration::from_millis(100));

        assert_eq!(breaker.get_state(), CircuitBreakerState::Closed);

        breaker.record_failure();
        breaker.record_failure();
        assert_eq!(breaker.get_state(), CircuitBreakerState::Open);

        // Wait for timeout
        sleep(Duration::from_millis(150)).await;
        assert_eq!(breaker.get_state(), CircuitBreakerState::HalfOpen);

        breaker.record_success();
        assert_eq!(breaker.state, CircuitBreakerState::Closed);
    }

    #[test]
    fn test_resource_snapshot() {
        let snapshot = ResourceSnapshot {
            total_requests: 100,
            successful_requests: 90,
            failed_requests: 10,
            circuit_breaker_trips: 1,
            rate_limit_hits: 5,
            memory_usage_bytes: 500 * 1024 * 1024, // 500MB
            peak_memory_bytes: 600 * 1024 * 1024,  // 600MB
            active_connections: 10,
        };

        assert_eq!(snapshot.success_rate(), 90.0);
        assert_eq!(snapshot.memory_usage_percent(1024 * 1024 * 1024), 48.828125); // ~48.8%
    }
}
