use crate::{GitHubError, GitHubResult};
use futures::Future;
use reqwest::Response;
use std::collections::VecDeque;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio::time::sleep;
use tracing::{debug, warn};
const MAX_QUEUE_SIZE: usize = 1000;

/// GitHub API rate limiter with intelligent request queuing and backoff
#[derive(Clone)]
pub struct GitHubRateLimiter {
    state: Arc<Mutex<RateLimiterState>>,
}

struct RateLimiterState {
    remaining_requests: u64,
    reset_time: Instant,
    last_request: Option<Instant>,
    queue: VecDeque<QueuedRequest>,
    processing: bool,
    resource_limits: std::collections::HashMap<String, ResourceLimit>,
}

#[derive(Debug)]
struct ResourceLimit {
    limit: u64,
    remaining: u64,
    reset: Instant,
    used: u64,
}

type QueuedRequest = Box<dyn FnOnce() -> Pin<Box<dyn Future<Output = ()> + Send>> + Send>;

impl GitHubRateLimiter {
    pub fn new() -> Self {
        let state = RateLimiterState {
            remaining_requests: 5000, // GitHub default for authenticated requests
            reset_time: Instant::now() + Duration::from_secs(3600), // 1 hour
            last_request: None,
            queue: VecDeque::new(),
            processing: false,
            resource_limits: std::collections::HashMap::new(),
        };

        Self {
            state: Arc::new(Mutex::new(state)),
        }
    }

    /// Make a rate-limited request
    pub async fn make_request<F, Fut>(&self, request_fn: F) -> GitHubResult<Response>
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: Future<Output = GitHubResult<Response>> + Send + 'static,
    {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let state_for_task = Arc::clone(&self.state);

        {
            let mut state = self.state.lock().await;
            if state.queue.len() >= MAX_QUEUE_SIZE {
                return Err(GitHubError::RateLimit("Request queue full".to_string()));
            }

            // Add request to queue
            state.queue.push_back(Box::new(move || {
                let fut = request_fn();
                let state_for_task = Arc::clone(&state_for_task);
                Box::pin(async move {
                    let result = fut.await;
                    match &result {
                        Ok(resp) => {
                            // Update rate limit headers based on response
                            GitHubRateLimiter::update_rate_limit_info(&state_for_task, resp).await;
                        }
                        Err(err) => {
                            if GitHubRateLimiter::is_rate_limit_error(err) {
                                GitHubRateLimiter::handle_rate_limit_error(&state_for_task, err)
                                    .await;
                            }
                        }
                    }
                    let _ = tx.send(result);
                })
            }));

            // Start processing if not already processing
            if !state.processing {
                state.processing = true;
                let state_clone = Arc::clone(&self.state);
                tokio::spawn(async move {
                    GitHubRateLimiter::process_queue(state_clone).await;
                });
            }
        }

        rx.await
            .map_err(|_| GitHubError::Other(anyhow::anyhow!("Request cancelled")))?
    }

    async fn process_queue(state: Arc<Mutex<RateLimiterState>>) {
        loop {
            let request = {
                let mut state_guard = state.lock().await;
                if let Some(request) = state_guard.queue.pop_front() {
                    request
                } else {
                    state_guard.processing = false;
                    break;
                }
            };

            // Wait if rate limited
            GitHubRateLimiter::wait_for_rate_limit(&state).await;

            // Execute request
            let future = request();
            future.await;

            // Calculate dynamic delay between requests
            let delay = {
                let state_guard = state.lock().await;
                GitHubRateLimiter::calculate_delay(&state_guard)
            };
            if delay > Duration::ZERO {
                sleep(delay).await;
            }
        }
    }

    async fn wait_for_rate_limit(state: &Arc<Mutex<RateLimiterState>>) {
        let wait_duration = {
            let state_guard = state.lock().await;
            if state_guard.remaining_requests == 0 {
                Some(
                    state_guard
                        .reset_time
                        .saturating_duration_since(Instant::now()),
                )
            } else {
                None
            }
        };

        if let Some(d) = wait_duration {
            debug!("Rate limit reached, waiting {:?}", d);
            sleep(d).await;
        }
    }

    fn calculate_delay(state: &RateLimiterState) -> Duration {
        if state.remaining_requests == 0 {
            return Duration::from_secs(1);
        }
        let now = Instant::now();
        if state.reset_time > now {
            let span = state.reset_time - now;
            let remaining = state.remaining_requests.max(1) as u32;
            span / remaining
        } else {
            Duration::ZERO
        }
    }

    async fn update_rate_limit_info(state: &Arc<Mutex<RateLimiterState>>, response: &Response) {
        let mut state_guard = state.lock().await;

        // Update general rate limit info
        if let Some(remaining) = response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse().ok())
        {
            state_guard.remaining_requests = remaining;
        }

        if let Some(reset_timestamp) = response
            .headers()
            .get("x-ratelimit-reset")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok())
        {
            state_guard.reset_time = Instant::now()
                + Duration::from_secs(
                    reset_timestamp.saturating_sub(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs(),
                    ),
                );
        }

        // Update resource-specific limits (Actions, Search, etc.)
        if let Some(resource) = response
            .headers()
            .get("x-ratelimit-resource")
            .and_then(|h| h.to_str().ok())
        {
            let limit = response
                .headers()
                .get("x-ratelimit-limit")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse().ok())
                .unwrap_or(5000);

            let remaining = response
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);

            let used = response
                .headers()
                .get("x-ratelimit-used")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse().ok())
                .unwrap_or(limit - remaining);

            let reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok())
                .map(|timestamp| {
                    Instant::now()
                        + Duration::from_secs(
                            timestamp.saturating_sub(
                                std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs(),
                            ),
                        )
                })
                .unwrap_or_else(|| Instant::now() + Duration::from_secs(3600));

            state_guard.resource_limits.insert(
                resource.to_string(),
                ResourceLimit {
                    limit,
                    remaining,
                    reset,
                    used,
                },
            );
        }

        state_guard.last_request = Some(Instant::now());
    }

    fn is_rate_limit_error(error: &GitHubError) -> bool {
        match error {
            GitHubError::Network(reqwest_error) => reqwest_error
                .status()
                .map(|status| status == 403 || status == 429)
                .unwrap_or(false),
            GitHubError::RateLimit(_) => true,
            _ => false,
        }
    }

    async fn handle_rate_limit_error(state: &Arc<Mutex<RateLimiterState>>, error: &GitHubError) {
        let mut state_guard = state.lock().await;

        // Set remaining requests to 0 to trigger waiting
        state_guard.remaining_requests = 0;

        // If we have retry-after header info, use it
        // This would need to be extracted from the error
        // For now, use a conservative estimate
        state_guard.reset_time = Instant::now() + Duration::from_secs(60);

        warn!("Rate limit error handled: {:?}", error);
    }

    /// Get current rate limit status
    pub async fn get_rate_limit_status(&self) -> RateLimitStatus {
        let state = self.state.lock().await;
        RateLimitStatus {
            remaining: state.remaining_requests,
            reset_time: state.reset_time,
            queue_length: state.queue.len(),
            resource_limits: state
                .resource_limits
                .iter()
                .map(|(resource, limit)| {
                    (
                        resource.clone(),
                        ResourceLimitStatus {
                            limit: limit.limit,
                            remaining: limit.remaining,
                            reset_time: limit.reset,
                            used: limit.used,
                        },
                    )
                })
                .collect(),
        }
    }
}

impl Default for GitHubRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitStatus {
    pub remaining: u64,
    pub reset_time: Instant,
    pub queue_length: usize,
    pub resource_limits: std::collections::HashMap<String, ResourceLimitStatus>,
}

#[derive(Debug, Clone)]
pub struct ResourceLimitStatus {
    pub limit: u64,
    pub remaining: u64,
    pub reset_time: Instant,
    pub used: u64,
}

/// Exponential backoff for retry logic
pub struct RetryManager {
    max_retries: usize,
    base_delay: Duration,
    max_delay: Duration,
}

impl RetryManager {
    pub fn new() -> Self {
        Self {
            max_retries: 3,
            base_delay: Duration::from_millis(1000),
            max_delay: Duration::from_secs(60),
        }
    }

    pub fn with_config(max_retries: usize, base_delay: Duration, max_delay: Duration) -> Self {
        Self {
            max_retries,
            base_delay,
            max_delay,
        }
    }

    /// Execute function with exponential backoff retry
    pub async fn execute_with_retry<F, Fut, T>(&self, mut f: F) -> GitHubResult<T>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = GitHubResult<T>>,
    {
        let mut last_error = None;

        for attempt in 0..=self.max_retries {
            match f().await {
                Ok(result) => return Ok(result),
                Err(error) => {
                    if attempt == self.max_retries {
                        return Err(error);
                    }

                    if !self.is_retryable_error(&error) {
                        return Err(error);
                    }

                    last_error = Some(error);
                    let delay = self.calculate_backoff_delay(attempt);

                    debug!(
                        "Request failed, retrying in {:?} (attempt {})",
                        delay,
                        attempt + 1
                    );
                    sleep(delay).await;
                }
            }
        }

        Err(last_error.unwrap())
    }

    fn calculate_backoff_delay(&self, attempt: usize) -> Duration {
        let exponential_delay = self.base_delay * 2_u32.pow(attempt as u32);
        let jittered_delay =
            exponential_delay + Duration::from_millis((rand::random::<f64>() * 1000.0) as u64);

        std::cmp::min(jittered_delay, self.max_delay)
    }

    fn is_retryable_error(&self, error: &GitHubError) -> bool {
        match error {
            GitHubError::Network(reqwest_error) => {
                if let Some(status) = reqwest_error.status() {
                    // Retry on 429 (rate limited), 502, 503, 504
                    matches!(status.as_u16(), 429 | 502 | 503 | 504)
                } else {
                    // Retry on connection errors
                    reqwest_error.is_connect() || reqwest_error.is_timeout()
                }
            }
            GitHubError::RateLimit(_) => true,
            _ => false,
        }
    }

    /// Get retry-after duration from error response
    pub fn get_retry_after_duration(&self, _error: &GitHubError) -> Option<Duration> {
        // This would extract retry-after header information from the error
        // For now, return None and let exponential backoff handle it
        None
    }
}

impl Default for RetryManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_creation() {
        let limiter = GitHubRateLimiter::new();
        let status = limiter.get_rate_limit_status().await;

        assert_eq!(status.remaining, 5000);
        assert_eq!(status.queue_length, 0);
    }

    #[test]
    fn test_backoff_calculation() {
        let retry_manager = RetryManager::new();

        let delay_0 = retry_manager.calculate_backoff_delay(0);
        let delay_1 = retry_manager.calculate_backoff_delay(1);
        let delay_2 = retry_manager.calculate_backoff_delay(2);

        // Exponential backoff should increase delays
        assert!(delay_1 > delay_0);
        assert!(delay_2 > delay_1);

        // Should not exceed max delay
        let long_delay = retry_manager.calculate_backoff_delay(10);
        assert!(long_delay <= retry_manager.max_delay);
    }
}
