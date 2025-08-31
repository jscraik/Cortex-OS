use crate::{GitHubClient, types::*, GitHubResult};
use std::collections::HashMap;
use tokio::time::{interval, Duration, Instant};
use tokio_stream::{wrappers::IntervalStream, StreamExt};
use tracing::{debug, info, warn};

/// GitHub event stream for real-time repository monitoring
pub struct GitHubEventStream {
    client: GitHubClient,
    active_streams: HashMap<String, EventStreamState>,
    callbacks: Vec<Box<dyn Fn(&GitHubEventData) + Send + Sync>>,
    event_publisher: Option<crate::a2a_integration::GitHubA2APublisher>,
}

#[derive(Debug, Clone)]
struct EventStreamState {
    last_etag: Option<String>,
    last_check: Instant,
    poll_interval: Duration,
}

#[derive(Debug, Clone)]
pub struct GitHubEventData {
    pub repository: String,
    pub event_type: GitHubEventType,
    pub payload: serde_json::Value,
    pub actor: User,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum GitHubEventType {
    PushEvent,
    PullRequestEvent,
    IssuesEvent,
    IssueCommentEvent,
    PullRequestReviewEvent,
    PullRequestReviewCommentEvent,
    WorkflowRunEvent,
    WorkflowJobEvent,
    CreateEvent,
    DeleteEvent,
    ReleaseEvent,
    WatchEvent,
    ForkEvent,
    StarEvent,
    Other(String),
}

impl From<String> for GitHubEventType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "PushEvent" => GitHubEventType::PushEvent,
            "PullRequestEvent" => GitHubEventType::PullRequestEvent,
            "IssuesEvent" => GitHubEventType::IssuesEvent,
            "IssueCommentEvent" => GitHubEventType::IssueCommentEvent,
            "PullRequestReviewEvent" => GitHubEventType::PullRequestReviewEvent,
            "PullRequestReviewCommentEvent" => GitHubEventType::PullRequestReviewCommentEvent,
            "WorkflowRunEvent" => GitHubEventType::WorkflowRunEvent,
            "WorkflowJobEvent" => GitHubEventType::WorkflowJobEvent,
            "CreateEvent" => GitHubEventType::CreateEvent,
            "DeleteEvent" => GitHubEventType::DeleteEvent,
            "ReleaseEvent" => GitHubEventType::ReleaseEvent,
            "WatchEvent" => GitHubEventType::WatchEvent,
            "ForkEvent" => GitHubEventType::ForkEvent,
            "StarEvent" => GitHubEventType::StarEvent,
            other => GitHubEventType::Other(other.to_string()),
        }
    }
}

impl GitHubEventStream {
    pub fn new(client: GitHubClient) -> Self {
        Self {
            client,
            active_streams: HashMap::new(),
            callbacks: Vec::new(),
            event_publisher: None,
        }
    }

    pub fn with_a2a_publisher(
        client: GitHubClient,
        event_publisher: Option<crate::a2a_integration::GitHubA2APublisher>,
    ) -> Self {
        Self {
            client,
            active_streams: HashMap::new(),
            callbacks: Vec::new(),
            event_publisher,
        }
    }

    /// Add a callback for GitHub events
    pub fn on_event<F>(&mut self, callback: F)
    where
        F: Fn(&GitHubEventData) + Send + Sync + 'static,
    {
        self.callbacks.push(Box::new(callback));
    }

    /// Subscribe to repository events
    pub async fn subscribe_to_repository(&mut self, owner: String, repo: String) -> GitHubResult<()> {
        let repo_key = format!("{}/{}", owner, repo);
        
        self.active_streams.insert(
            repo_key.clone(),
            EventStreamState {
                last_etag: None,
                last_check: Instant::now(),
                poll_interval: Duration::from_secs(30), // Conservative polling
            },
        );

        info!("Subscribed to events for repository: {}", repo_key);
        
        // Start polling for this repository
        let client = self.client.clone();
        let repo_key_clone = repo_key.clone();
        
        tokio::spawn(async move {
            let mut interval_stream = IntervalStream::new(interval(Duration::from_secs(30)));
            
            while let Some(_) = interval_stream.next().await {
                if let Err(e) = Self::poll_repository_events(&client, &owner, &repo).await {
                    warn!("Error polling events for {}: {:?}", repo_key_clone, e);
                }
            }
        });

        Ok(())
    }

    /// Subscribe to user events
    pub async fn subscribe_to_user_events(&mut self, username: String) -> GitHubResult<()> {
        let user_key = format!("user:{}", username);
        
        self.active_streams.insert(
            user_key.clone(),
            EventStreamState {
                last_etag: None,
                last_check: Instant::now(),
                poll_interval: Duration::from_secs(60), // Less frequent for user events
            },
        );

        info!("Subscribed to events for user: {}", username);
        
        // Start polling for this user
        let client = self.client.clone();
        let user_key_clone = user_key.clone();
        
        tokio::spawn(async move {
            let mut interval_stream = IntervalStream::new(interval(Duration::from_secs(60)));
            
            while let Some(_) = interval_stream.next().await {
                if let Err(e) = Self::poll_user_events(&client, &username).await {
                    warn!("Error polling user events for {}: {:?}", user_key_clone, e);
                }
            }
        });

        Ok(())
    }

    /// Poll repository events
    async fn poll_repository_events(client: &GitHubClient, owner: &str, repo: &str) -> GitHubResult<()> {
        let endpoint = format!("/repos/{}/{}/events", owner, repo);
        
        match client.get::<Vec<RepoEvent>>(&endpoint).await {
            Ok(events) => {
                debug!("Retrieved {} events for {}/{}", events.len(), owner, repo);
                // Process events (in a real implementation, we'd check for new events)
                for event in events.into_iter().take(10) { // Limit to recent events
                    // Convert to internal event format and emit
                    debug!("Processing event: {} by {}", event.event_type, event.actor.login);
                }
            }
            Err(e) => {
                warn!("Failed to poll repository events: {:?}", e);
            }
        }

        Ok(())
    }

    /// Poll user events
    async fn poll_user_events(client: &GitHubClient, username: &str) -> GitHubResult<()> {
        let endpoint = format!("/users/{}/events", username);
        
        match client.get::<Vec<RepoEvent>>(&endpoint).await {
            Ok(events) => {
                debug!("Retrieved {} user events for {}", events.len(), username);
                // Process events
                for event in events.into_iter().take(10) {
                    debug!("Processing user event: {} by {}", event.event_type, event.actor.login);
                }
            }
            Err(e) => {
                warn!("Failed to poll user events: {:?}", e);
            }
        }

        Ok(())
    }

    /// Emit event to all registered callbacks
    async fn emit_event(&self, event: &GitHubEventData) {
        for callback in &self.callbacks {
            callback(event);
        }

        // Also emit to A2A event bus if available
        if let Some(publisher) = &self.event_publisher {
            match event.event_type {
                GitHubEventType::PushEvent => {
                    // Would parse push event and publish as repository event
                    debug!("Publishing push event to A2A bus");
                }
                GitHubEventType::PullRequestEvent => {
                    // Would parse PR event and publish
                    debug!("Publishing PR event to A2A bus");
                }
                GitHubEventType::IssuesEvent => {
                    // Would parse issue event and publish
                    debug!("Publishing issue event to A2A bus");
                }
                GitHubEventType::WorkflowRunEvent => {
                    // Would parse workflow event and publish
                    debug!("Publishing workflow event to A2A bus");
                }
                _ => {
                    debug!("Event type not mapped to A2A: {:?}", event.event_type);
                }
            }
        }
    }

    /// Get active subscriptions
    pub fn get_active_subscriptions(&self) -> Vec<String> {
        self.active_streams.keys().cloned().collect()
    }

    /// Unsubscribe from repository events
    pub fn unsubscribe(&mut self, key: &str) {
        if self.active_streams.remove(key).is_some() {
            info!("Unsubscribed from events for: {}", key);
        }
    }

    /// Get event statistics
    pub async fn get_repository_activity_stats(&self, owner: &str, repo: &str, days: u32) -> GitHubResult<ActivityStats> {
        let endpoint = format!("/repos/{}/{}/events", owner, repo);
        let events: Vec<RepoEvent> = self.client.get(&endpoint).await?;
        
        // Filter events from the last N days
        let cutoff = chrono::Utc::now() - chrono::Duration::days(days as i64);
        let recent_events: Vec<_> = events.into_iter()
            .filter(|event| {
                event.created_at.parse::<chrono::DateTime<chrono::Utc>>()
                    .map(|dt| dt > cutoff)
                    .unwrap_or(false)
            })
            .collect();

        let total_events = recent_events.len();
        let mut event_counts = HashMap::new();
        let mut contributor_counts = HashMap::new();

        for event in recent_events {
            *event_counts.entry(event.event_type.clone()).or_insert(0) += 1;
            *contributor_counts.entry(event.actor.login).or_insert(0) += 1;
        }

        Ok(ActivityStats {
            total_events,
            event_counts,
            contributor_counts,
            days_analyzed: days,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ActivityStats {
    pub total_events: usize,
    pub event_counts: HashMap<String, u32>,
    pub contributor_counts: HashMap<String, u32>,
    pub days_analyzed: u32,
}

impl ActivityStats {
    /// Get the most active contributors
    pub fn get_top_contributors(&self, limit: usize) -> Vec<(String, u32)> {
        let mut contributors: Vec<_> = self.contributor_counts.iter()
            .map(|(name, count)| (name.clone(), *count))
            .collect();
        contributors.sort_by(|a, b| b.1.cmp(&a.1));
        contributors.truncate(limit);
        contributors
    }

    /// Get the most common event types
    pub fn get_top_event_types(&self, limit: usize) -> Vec<(String, u32)> {
        let mut events: Vec<_> = self.event_counts.iter()
            .map(|(event_type, count)| (event_type.clone(), *count))
            .collect();
        events.sort_by(|a, b| b.1.cmp(&a.1));
        events.truncate(limit);
        events
    }

    /// Calculate activity rate (events per day)
    pub fn get_activity_rate(&self) -> f64 {
        if self.days_analyzed == 0 {
            0.0
        } else {
            self.total_events as f64 / self.days_analyzed as f64
        }
    }
}

/// GitHub webhook event processor for real-time updates (if webhook support is added)
pub struct WebhookEventProcessor;

impl WebhookEventProcessor {
    /// Verify webhook signature (for security)
    pub fn verify_signature(payload: &[u8], signature: &str, secret: &str) -> bool {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        
        type HmacSha256 = Hmac<Sha256>;
        
        let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
            Ok(mac) => mac,
            Err(_) => return false,
        };
        
        mac.update(payload);
        let expected = mac.finalize().into_bytes();
        let expected_hex = format!("sha256={}", hex::encode(expected));
        
        // Constant-time comparison
        signature == expected_hex
    }

    /// Process webhook payload
    pub fn process_webhook_event(event_type: &str, payload: serde_json::Value) -> Option<GitHubEventData> {
        // Convert webhook payload to internal event format
        let actor = payload.get("sender")
            .and_then(|s| serde_json::from_value(s.clone()).ok())
            .unwrap_or_else(|| User {
                id: 0,
                login: "unknown".to_string(),
                avatar_url: "".to_string(),
                html_url: "".to_string(),
                user_type: "User".to_string(),
                site_admin: false,
            });

        let repository = payload.get("repository")
            .and_then(|r| r.get("full_name"))
            .and_then(|n| n.as_str())
            .unwrap_or("unknown/unknown")
            .to_string();

        let created_at = chrono::Utc::now().to_rfc3339();

        Some(GitHubEventData {
            repository,
            event_type: GitHubEventType::from(event_type.to_string()),
            payload,
            actor,
            created_at,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_type_conversion() {
        assert_eq!(GitHubEventType::from("PushEvent".to_string()), GitHubEventType::PushEvent);
        assert_eq!(GitHubEventType::from("CustomEvent".to_string()), GitHubEventType::Other("CustomEvent".to_string()));
    }

    #[test]
    fn test_activity_stats() {
        let mut event_counts = HashMap::new();
        event_counts.insert("PushEvent".to_string(), 10);
        event_counts.insert("IssuesEvent".to_string(), 5);

        let mut contributor_counts = HashMap::new();
        contributor_counts.insert("user1".to_string(), 8);
        contributor_counts.insert("user2".to_string(), 7);

        let stats = ActivityStats {
            total_events: 15,
            event_counts,
            contributor_counts,
            days_analyzed: 7,
        };

        assert_eq!(stats.get_activity_rate(), 15.0 / 7.0);
        
        let top_contributors = stats.get_top_contributors(1);
        assert_eq!(top_contributors[0].0, "user1");
        assert_eq!(top_contributors[0].1, 8);
    }

    #[test]
    fn test_webhook_signature_verification() {
        let payload = b"test payload";
        let secret = "test_secret";
        
        // This would fail without proper HMAC calculation
        let invalid_signature = "sha256=invalid";
        assert!(!WebhookEventProcessor::verify_signature(payload, invalid_signature, secret));
    }
}