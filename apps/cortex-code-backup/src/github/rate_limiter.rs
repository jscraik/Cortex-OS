use crate::Result;
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio::time::sleep;
use tracing::{debug, warn};

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

type RequestFuture = Box<dyn futures::Future<Output = Result<reqwest::Response>> + Send>;
type RequestFn = Box<dyn FnOnce() -> RequestFuture + Send>;
type QueuedRequest = (RequestFn, tokio::sync::oneshot::Sender<Result<reqwest::Response>>);

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
    pub async fn make_request<F, Fut>(&self, request_fn: F) -> Result<reqwest::Response>
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: futures::Future<Output = Result<reqwest::Response>> + Send + 'static,
    {
    let (tx, rx) = tokio::sync::oneshot::channel::<Result<reqwest::Response>>();

        {
            let mut state = self.state.lock().await;

            // Add request to queue
            state.queue.push_back((
                Box::new(move || {
                    let fut = request_fn();
                    Box::new(Box::pin(async move { fut.await })) as RequestFuture
                }),
                tx,
            ));

            // Start processing if not already processing
            if !state.processing {
                state.processing = true;
                let state_clone = self.state.clone();
                tokio::spawn(async move {
                    Self::process_queue(state_clone).await;
                });
            }
        }

        // Await the actual result from the executed request
        rx.await.map_err(|_| {
            crate::error::Error::Other(anyhow::anyhow!("Request cancelled"))
        })?
    }

    async fn process_queue(state: Arc<Mutex<RateLimiterState>>) {
        loop {
            let (request, tx) = {
                let mut state_guard = state.lock().await;
                if let Some(queued) = state_guard.queue.pop_front() {
                    queued
                } else {
                    state_guard.processing = false;
                    break;
                }
            };

            // Wait if rate limited
            Self::wait_for_rate_limit(&state).await;

            // Execute request
            let future = request();
            let future = Box::into_pin(future);
            match future.await {
                Ok(response) => {
                    Self::update_rate_limit_info(&state, &response).await;
                    let _ = tx.send(Ok(response));
                }
                Err(e) => {
                    warn!("Request failed: {:?}", e);
                    if Self::is_rate_limit_error(&e) {
                        Self::handle_rate_limit_error(&state, &e).await;
                    }
                    let _ = tx.send(Err(e));
                }
            }

            // Brief pause between requests
            sleep(Duration::from_millis(100)).await;
        }
    }

    async fn wait_for_rate_limit(state: &Arc<Mutex<RateLimiterState>>) {
        let should_wait = {
            let state_guard = state.lock().await;
            state_guard.remaining_requests == 0 && Instant::now() < state_guard.reset_time
        };

        if should_wait {
            let wait_time = {
                let state_guard = state.lock().await;
                state_guard.reset_time.saturating_duration_since(Instant::now())
            };

            debug!("Rate limit reached, waiting {:?}", wait_time);
            sleep(wait_time).await;
        }
    }

    async fn update_rate_limit_info(
        state: &Arc<Mutex<RateLimiterState>>,
        response: &reqwest::Response,
    ) {
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
            state_guard.reset_time =
                Instant::now() + Duration::from_secs(reset_timestamp.saturating_sub(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs()
                ));
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
                    Instant::now() + Duration::from_secs(timestamp.saturating_sub(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                    ))
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

    fn is_rate_limit_error(error: &crate::error::Error) -> bool {
        match error {
            crate::error::Error::Http(reqwest_error) => {
                reqwest_error
                    .status()
                    .map(|status| status == 403 || status == 429)
                    .unwrap_or(false)
            }
            crate::error::Error::Provider(provider_error) => {
                matches!(provider_error, crate::error::ProviderError::RateLimited)
            }
            _ => false,
        }
    }

    async fn handle_rate_limit_error(
        state: &Arc<Mutex<RateLimiterState>>,
        error: &crate::error::Error,
    ) {
        let mut state_guard = state.lock().await;

        // Set remaining requests to 0 to trigger waiting
        state_guard.remaining_requests = 0;

        // If we have retry-after header info, use it
        // This would need need to be extracted from the error
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

    /// Calculate delay based on rate limit state
    pub async fn calculate_delay(&self) -> Duration {
        let state = self.state.lock().await;

        if state.remaining_requests == 0 {
            // Wait until reset time
            state.reset_time.saturating_duration_since(Instant::now())
        } else if let Some(last_request) = state.last_request {
            // Ensure minimum spacing between requests
            let min_interval = Duration::from_millis(100);
            let since_last = Instant::now().saturating_duration_since(last_request);
            min_interval.saturating_sub(since_last)
        } else {
            Duration::from_millis(0)
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
    pub async fn execute_with_retry<F, Fut, T>(&self, mut f: F) -> Result<T>
    where
        F: FnMut() -> Fut,
        Fut: futures::Future<Output = Result<T>>,
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

                    debug!("Request failed, retrying in {:?} (attempt {})", delay, attempt + 1);
                    sleep(delay).await;
                }
            }
        }

        Err(last_error.unwrap())
    }

    fn calculate_backoff_delay(&self, attempt: usize) -> Duration {
        let exponential_delay = self.base_delay * 2_u32.pow(attempt as u32);
        let jittered_delay = exponential_delay + Duration::from_millis(
            (rand::random::<f64>() * 1000.0) as u64
        );

        std::cmp::min(jittered_delay, self.max_delay)
    }

    fn is_retryable_error(&self, error: &crate::error::Error) -> bool {
        match error {
            crate::error::Error::Http(reqwest_error) => {
                if let Some(status) = reqwest_error.status() {
                    // Retry on 429 (rate limited), 502, 503, 504
                    matches!(status.as_u16(), 429 | 502 | 503 | 504)
                } else {
                    // Retry on connection errors
                    reqwest_error.is_connect() || reqwest_error.is_timeout()
                }
            }
            crate::error::Error::Provider(provider_error) => {
                matches!(provider_error, crate::error::ProviderError::RateLimited)
            }
            _ => false,
        }
    }

    /// Get retry-after duration from error response
    pub fn get_retry_after_duration(&self, error: &crate::error::Error) -> Option<Duration> {
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
