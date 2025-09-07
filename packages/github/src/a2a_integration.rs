//! A2A Event Bus Integration for GitHub Operations
//!
//! This module provides integration with the Cortex-OS A2A event bus,
//! allowing GitHub operations to publish events for real-time updates
//! across the entire Cortex-OS ecosystem.

use crate::error::{GitHubError, GitHubResult, A2AEventError};
use crate::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info, warn, error, instrument};
use uuid::Uuid;

/// A2A event publisher for GitHub operations
#[derive(Clone)]
pub struct GitHubA2APublisher {
    publisher_id: String,
    event_bus: Option<Arc<dyn A2AEventBus + Send + Sync>>,
    config: A2AConfig,
}

/// GitHub event publisher interface
pub trait GitHubEventPublisher: Send + Sync {
    fn publish_repository_event(&self, event: RepositoryEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
    fn publish_pull_request_event(&self, event: PullRequestEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
    fn publish_issue_event(&self, event: IssueEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
    fn publish_workflow_event(&self, event: WorkflowEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
    fn publish_error_event(&self, event: ErrorEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
}

/// A2A event bus interface
pub trait A2AEventBus: Send + Sync {
    fn publish(&self, topic: &str, event: A2AEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
    fn subscribe(&self, topic: &str, handler: Box<dyn A2AEventHandler + Send + Sync>) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
}

/// A2A event handler interface
pub trait A2AEventHandler: Send + Sync {
    fn handle_event(&self, event: A2AEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>>;
}

/// Simple HTTP-based event bus using POST requests
pub struct HttpEventBus {
    client: reqwest::Client,
    endpoint: String,
}

impl HttpEventBus {
    pub fn new(endpoint: String) -> Self {
        Self { client: reqwest::Client::new(), endpoint }
    }
}

impl A2AEventBus for HttpEventBus {
    fn publish(&self, topic: &str, event: A2AEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let url = format!("{}/{}", self.endpoint.trim_end_matches('/'), topic);
        let client = self.client.clone();
        let url_for_err = url.clone();
        Box::pin(async move {
            client
                .post(&url)
                .json(&event)
                .send()
                .await
                .map_err(|e| {
                    // Try to extract status code if available
                    let status = if let Some(status) = e.status() {
                        format!("{}", status)
                    } else {
                        "unknown".to_string()
                    };
                    GitHubError::A2AEvent(format!(
                        "Failed to send HTTP request to {}: status: {}, error: {}",
                        url_for_err, status, e
                    ))
                })?;
            Ok(())
        })
    }

    fn subscribe(&self, _topic: &str, _handler: Box<dyn A2AEventHandler + Send + Sync>) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        Box::pin(async { Ok(()) })
    }
}

/// A2A configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2AConfig {
    pub enabled: bool,
    pub publisher_id: String,
    pub event_bus_url: Option<String>,
    pub retry_attempts: u32,
    pub retry_delay_ms: u64,
    pub batch_size: usize,
    pub flush_interval_ms: u64,
}

impl Default for A2AConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            publisher_id: "github-client".to_string(),
            event_bus_url: None,
            retry_attempts: 3,
            retry_delay_ms: 1000,
            batch_size: 10,
            flush_interval_ms: 5000,
        }
    }
}

/// CloudEvents-compliant A2A event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2AEvent {
    pub specversion: String,
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub source: String,
    pub time: chrono::DateTime<chrono::Utc>,
    #[serde(rename = "datacontenttype")]
    pub data_content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dataschema: Option<String>,
    pub data: serde_json::Value,
    #[serde(flatten)]
    pub metadata: HashMap<String, String>,
}

/// Repository-related events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryEvent {
    pub action: RepositoryAction,
    pub repository: Repository,
    pub actor: User,
    pub changes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RepositoryAction {
    Created,
    Updated,
    Deleted,
    Archived,
    Unarchived,
    Publicized,
    Privatized,
    Transferred,
}

/// Pull request events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestEvent {
    pub action: PullRequestAction,
    pub pull_request: PullRequest,
    pub repository: Repository,
    pub actor: User,
    pub changes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PullRequestAction {
    Opened,
    Closed,
    Merged,
    Reopened,
    Synchronized,
    ReadyForReview,
    ConvertedToDraft,
    Assigned,
    Unassigned,
    Labeled,
    Unlabeled,
    ReviewRequested,
    ReviewRequestRemoved,
}

/// Issue events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueEvent {
    pub action: IssueAction,
    pub issue: Issue,
    pub repository: Repository,
    pub actor: User,
    pub changes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueAction {
    Opened,
    Closed,
    Reopened,
    Assigned,
    Unassigned,
    Labeled,
    Unlabeled,
    Milestoned,
    Demilestoned,
    Edited,
}

/// Workflow events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEvent {
    pub action: WorkflowAction,
    pub workflow_run: WorkflowRun,
    pub repository: Repository,
    pub actor: User,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkflowAction {
    Started,
    Completed,
    Cancelled,
    Failed,
    Requested,
    InProgress,
}

/// Error events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEvent {
    pub operation: String,
    pub repository: Option<String>,
    pub error: A2AEventError,
    pub context: HashMap<String, String>,
}

impl GitHubA2APublisher {
    /// Create new A2A publisher
    pub fn new(config: A2AConfig, event_bus: Option<Arc<dyn A2AEventBus + Send + Sync>>) -> Self {
        Self {
            publisher_id: config.publisher_id.clone(),
            event_bus,
            config,
        }
    }

    /// Create A2A publisher from environment variables
    pub async fn from_env() -> GitHubResult<Self> {
        let config = A2AConfig {
            enabled: std::env::var("CORTEX_A2A_ENABLED").as_deref() != Ok("false"),
            publisher_id: std::env::var("CORTEX_A2A_PUBLISHER_ID")
                .unwrap_or_else(|_| "github-client".to_string()),
            event_bus_url: std::env::var("CORTEX_A2A_EVENT_BUS_URL").ok(),
            retry_attempts: std::env::var("CORTEX_A2A_RETRY_ATTEMPTS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3),
            retry_delay_ms: std::env::var("CORTEX_A2A_RETRY_DELAY_MS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1000),
            batch_size: std::env::var("CORTEX_A2A_BATCH_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            flush_interval_ms: std::env::var("CORTEX_A2A_FLUSH_INTERVAL_MS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5000),
        };

        let event_bus = if config.enabled {
            config
                .event_bus_url
                .as_ref()
                .map(|url| Arc::new(HttpEventBus::new(url.clone())) as Arc<dyn A2AEventBus + Send + Sync>)
        } else {
            None
        };

        Ok(Self::new(config, event_bus))
    }

    /// Create A2A event from GitHub event data
    fn create_a2a_event(&self, event_type: &str, payload: serde_json::Value) -> A2AEvent {
        let mut metadata = HashMap::new();
        metadata.insert("publisher_id".to_string(), self.publisher_id.clone());
        metadata.insert("correlation_id".to_string(), Uuid::new_v4().to_string());

        A2AEvent {
            specversion: "1.0".to_string(),
            id: Uuid::new_v4().to_string(),
            event_type: event_type.to_string(),
            source: self.publisher_id.clone(),
            time: chrono::Utc::now(),
            data_content_type: "application/json".to_string(),
            dataschema: None,
            data: payload,
            metadata,
        }
    }

    /// Publish event to A2A bus with retry logic
    #[instrument(name = "publish_a2a_event", skip(self, event), fields(event_type = %event.event_type, correlation_id = event.metadata.get("correlation_id")))]
    async fn publish_with_retry(&self, topic: &str, event: A2AEvent) -> GitHubResult<()> {
        if !self.config.enabled {
            debug!("A2A publishing disabled, skipping event: {}", event.event_type);
            return Ok(());
        }

        let Some(event_bus) = &self.event_bus else {
            debug!("No A2A event bus configured, logging event: {}", event.event_type);
            info!("GitHub A2A Event: {} -> {}", topic, serde_json::to_string(&event).unwrap_or_default());
            return Ok(());
        };

        let mut attempts = 0;
        let mut last_error = None;

        while attempts < self.config.retry_attempts {
            match event_bus.publish(topic, event.clone()).await {
                Ok(()) => {
                    debug!("Published A2A event: {} to topic: {}", event.event_type, topic);
                    return Ok(());
                }
                Err(err) => {
                    attempts += 1;
                    last_error = Some(err);

                    if attempts < self.config.retry_attempts {
                        warn!("Failed to publish A2A event (attempt {}), retrying...", attempts);
                        tokio::time::sleep(tokio::time::Duration::from_millis(
                            self.config.retry_delay_ms * attempts as u64
                        )).await;
                    }
                }
            }
        }

        let error_msg = format!(
            "Failed to publish A2A event after {} attempts: {:?}",
            self.config.retry_attempts,
            last_error.unwrap_or_else(|| GitHubError::A2AEvent("Unknown error".to_string()))
        );

        error!("{}", error_msg);
        Err(GitHubError::A2AEvent(error_msg))
    }
}

impl GitHubEventPublisher for GitHubA2APublisher {
    fn publish_repository_event(&self, event: RepositoryEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let this = self.clone();
        Box::pin(async move {
        let topic = match event.action {
            RepositoryAction::Created => "github.repository.created",
            RepositoryAction::Updated => "github.repository.updated",
            RepositoryAction::Deleted => "github.repository.deleted",
            RepositoryAction::Archived => "github.repository.archived",
            RepositoryAction::Unarchived => "github.repository.unarchived",
            RepositoryAction::Publicized => "github.repository.publicized",
            RepositoryAction::Privatized => "github.repository.privatized",
            RepositoryAction::Transferred => "github.repository.transferred",
        };

        let payload = serde_json::to_value(&event)?;
        let a2a_event = this.create_a2a_event(&format!("repository.{:?}", event.action).to_lowercase(), payload);
        this.publish_with_retry(topic, a2a_event).await
        })
    }

    fn publish_pull_request_event(&self, event: PullRequestEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let this = self.clone();
        Box::pin(async move {
        let topic = match event.action {
            PullRequestAction::Opened => "github.pullrequest.opened",
            PullRequestAction::Closed => "github.pullrequest.closed",
            PullRequestAction::Merged => "github.pullrequest.merged",
            PullRequestAction::Reopened => "github.pullrequest.reopened",
            PullRequestAction::Synchronized => "github.pullrequest.synchronized",
            PullRequestAction::ReadyForReview => "github.pullrequest.ready_for_review",
            PullRequestAction::ConvertedToDraft => "github.pullrequest.converted_to_draft",
            PullRequestAction::Assigned => "github.pullrequest.assigned",
            PullRequestAction::Unassigned => "github.pullrequest.unassigned",
            PullRequestAction::Labeled => "github.pullrequest.labeled",
            PullRequestAction::Unlabeled => "github.pullrequest.unlabeled",
            PullRequestAction::ReviewRequested => "github.pullrequest.review_requested",
            PullRequestAction::ReviewRequestRemoved => "github.pullrequest.review_request_removed",
        };

        let payload = serde_json::to_value(&event)?;
        let a2a_event = this.create_a2a_event(&format!("pullrequest.{:?}", event.action).to_lowercase(), payload);
        this.publish_with_retry(topic, a2a_event).await
        })
    }

    fn publish_issue_event(&self, event: IssueEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let this = self.clone();
        Box::pin(async move {
        let topic = match event.action {
            IssueAction::Opened => "github.issue.opened",
            IssueAction::Closed => "github.issue.closed",
            IssueAction::Reopened => "github.issue.reopened",
            IssueAction::Assigned => "github.issue.assigned",
            IssueAction::Unassigned => "github.issue.unassigned",
            IssueAction::Labeled => "github.issue.labeled",
            IssueAction::Unlabeled => "github.issue.unlabeled",
            IssueAction::Milestoned => "github.issue.milestoned",
            IssueAction::Demilestoned => "github.issue.demilestoned",
            IssueAction::Edited => "github.issue.edited",
        };

        let payload = serde_json::to_value(&event)?;
        let a2a_event = this.create_a2a_event(&format!("issue.{:?}", event.action).to_lowercase(), payload);
        this.publish_with_retry(topic, a2a_event).await
        })
    }

    fn publish_workflow_event(&self, event: WorkflowEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let this = self.clone();
        Box::pin(async move {
        let topic = match event.action {
            WorkflowAction::Started => "github.workflow.started",
            WorkflowAction::Completed => "github.workflow.completed",
            WorkflowAction::Cancelled => "github.workflow.cancelled",
            WorkflowAction::Failed => "github.workflow.failed",
            WorkflowAction::Requested => "github.workflow.requested",
            WorkflowAction::InProgress => "github.workflow.in_progress",
        };

        let payload = serde_json::to_value(&event)?;
        let a2a_event = this.create_a2a_event(&format!("workflow.{:?}", event.action).to_lowercase(), payload);
        this.publish_with_retry(topic, a2a_event).await
        })
    }

    fn publish_error_event(&self, event: ErrorEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> {
        let this = self.clone();
        Box::pin(async move {
        let topic = "github.error";
        let payload = serde_json::to_value(&event)?;
        let a2a_event = this.create_a2a_event("error", payload);
        this.publish_with_retry(topic, a2a_event).await
        })
    }
}

/// Null implementation for cases where A2A is disabled
pub struct NullEventPublisher;

impl GitHubEventPublisher for NullEventPublisher {
    fn publish_repository_event(&self, _event: RepositoryEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> { Box::pin(async { Ok(()) }) }
    fn publish_pull_request_event(&self, _event: PullRequestEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> { Box::pin(async { Ok(()) }) }
    fn publish_issue_event(&self, _event: IssueEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> { Box::pin(async { Ok(()) }) }
    fn publish_workflow_event(&self, _event: WorkflowEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> { Box::pin(async { Ok(()) }) }
    fn publish_error_event(&self, _event: ErrorEvent) -> std::pin::Pin<Box<dyn futures::Future<Output = GitHubResult<()>> + Send>> { Box::pin(async { Ok(()) }) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_null_event_publisher() {
        let publisher = NullEventPublisher;

        // Should not error on any event
        assert!(publisher.publish_repository_event(RepositoryEvent {
            action: RepositoryAction::Created,
            repository: Repository::default(),
            actor: User::default(),
            changes: None,
        }).await.is_ok());
    }

    #[test]
    fn test_a2a_config_from_env() {
        std::env::set_var("CORTEX_A2A_ENABLED", "true");
        std::env::set_var("CORTEX_A2A_PUBLISHER_ID", "test-publisher");
        std::env::set_var("CORTEX_A2A_RETRY_ATTEMPTS", "5");
        std::env::set_var("CORTEX_A2A_EVENT_BUS_URL", "http://example.com");

        let publisher = futures::executor::block_on(GitHubA2APublisher::from_env()).unwrap();
        assert_eq!(publisher.config.publisher_id, "test-publisher");
        assert_eq!(publisher.config.retry_attempts, 5);
        assert!(publisher.config.enabled);
        assert!(publisher.event_bus.is_some());

        // Cleanup
        std::env::remove_var("CORTEX_A2A_ENABLED");
        std::env::remove_var("CORTEX_A2A_PUBLISHER_ID");
        std::env::remove_var("CORTEX_A2A_RETRY_ATTEMPTS");
        std::env::remove_var("CORTEX_A2A_EVENT_BUS_URL");
    }

    #[test]
    fn test_a2a_event_creation() {
        let config = A2AConfig::default();
        let publisher = GitHubA2APublisher::new(config, None);

        let payload = serde_json::json!({ "test": "data" });
        let event = publisher.create_a2a_event("test.event", payload);

        assert_eq!(event.specversion, "1.0");
        assert_eq!(event.event_type, "test.event");
        assert_eq!(event.source, "github-client");
        assert_eq!(event.data["test"], "data");
        assert!(!event.id.is_empty());
        assert!(event.metadata.contains_key("publisher_id"));
        assert!(event.metadata.contains_key("correlation_id"));
    }

    #[tokio::test]
    async fn test_publish_repository_event_sends_cloudevent() {
        let mut server = mockito::Server::new_async().await;
        let url = server.url();

        let mut config = A2AConfig::default();
        config.event_bus_url = Some(url.clone());
        let publisher = GitHubA2APublisher::new(config, Some(Arc::new(HttpEventBus::new(url.clone()))));

        let _m = server
            .mock("POST", "/github.repository.created")
            .match_header("content-type", "application/json")
            .create_async()
            .await;

        let repo_event = RepositoryEvent {
            action: RepositoryAction::Created,
            repository: Repository::default(),
            actor: User::default(),
            changes: None,
        };

        publisher.publish_repository_event(repo_event).await.unwrap();
        _m.assert_async().await;
    }
}
