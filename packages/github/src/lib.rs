//! GitHub API Client Library for Cortex-OS
//!
//! This library provides comprehensive GitHub API integration with:
//! - Authentication and token management
//! - Rate limiting and error handling
//! - Repository, Actions, PR, and Issue operations
//! - A2A event bus integration for real-time updates
//! - MCP tool compatibility

pub mod auth;
pub mod client;
pub mod rate_limiter;
pub mod repository;
pub mod actions;
pub mod pull_requests;
pub mod events;
pub mod types;
pub mod error;
pub mod a2a_integration;

// Re-export core types and clients
pub use auth::{GitHubAuth, TokenManager, GitHubOperation};
pub use client::{GitHubClient, GitHubClientBuilder, TokenValidation};
pub use rate_limiter::{GitHubRateLimiter, RateLimitStatus, RetryManager};
pub use repository::{RepositoryAPI, RepositoryStats};
pub use actions::{ActionsAPI, WorkflowMonitor, WorkflowValidator, WorkflowTemplate};
pub use pull_requests::{PullRequestAPI, PRListOptions, IssueListOptions};
pub use events::{GitHubEventStream, GitHubEventData, GitHubEventType, ActivityStats};
pub use types::*;
pub use error::{GitHubError, GitHubResult};
pub use a2a_integration::{GitHubA2APublisher, GitHubEventPublisher};

/// Result type for GitHub operations
pub type Result<T> = std::result::Result<T, error::GitHubError>;

/// GitHub client builder with A2A integration
pub struct GitHubClientWithEvents {
    client: GitHubClient,
    event_publisher: Option<GitHubA2APublisher>,
}

impl GitHubClientWithEvents {
    /// Create a new GitHub client with optional A2A event publishing
    pub fn new(token_manager: TokenManager, event_publisher: Option<GitHubA2APublisher>) -> Result<Self> {
        let client = GitHubClient::new(token_manager)?;
        Ok(Self {
            client,
            event_publisher,
        })
    }

    /// Get the underlying GitHub client
    pub fn client(&self) -> &GitHubClient {
        &self.client
    }

    /// Get the A2A event publisher
    pub fn event_publisher(&self) -> Option<&GitHubA2APublisher> {
        self.event_publisher.as_ref()
    }

    /// Create repository API with event publishing
    pub fn repository_api(&self) -> repository::RepositoryAPI {
        repository::RepositoryAPI::with_events(
            self.client.clone(),
            self.event_publisher.clone(),
        )
    }

    /// Create actions API with event publishing
    pub fn actions_api(&self) -> actions::ActionsAPI {
        actions::ActionsAPI::with_events(
            self.client.clone(),
            self.event_publisher.clone(),
        )
    }

    /// Create pull request API with event publishing
    pub fn pull_requests_api(&self) -> pull_requests::PullRequestAPI {
        pull_requests::PullRequestAPI::with_events(
            self.client.clone(),
            self.event_publisher.clone(),
        )
    }

    /// Create event stream with A2A integration
    pub fn event_stream(&self) -> events::GitHubEventStream {
        events::GitHubEventStream::with_a2a_publisher(
            self.client.clone(),
            self.event_publisher.clone(),
        )
    }
}

/// Convenience function to create GitHub client from environment
pub async fn create_github_client_from_env() -> Result<GitHubClientWithEvents> {
    let auth = auth::create_auth_from_env()?.ok_or_else(|| {
        error::GitHubError::Configuration("No GitHub authentication found in environment".to_string())
    })?;

    let token_manager = TokenManager::new(auth);

    // Check if A2A integration is enabled
    let event_publisher = if std::env::var("CORTEX_A2A_ENABLED").as_deref() != Ok("false") {
        Some(GitHubA2APublisher::from_env().await?)
    } else {
        None
    };

    GitHubClientWithEvents::new(token_manager, event_publisher)
}

/// GitHub service factory for different use cases
pub struct GitHubServiceFactory;

impl GitHubServiceFactory {
    /// Create a GitHub client for TUI applications
    pub async fn create_for_tui() -> Result<GitHubClientWithEvents> {
        create_github_client_from_env().await
    }

    /// Create a GitHub client for CLI applications (no events)
    pub async fn create_for_cli() -> Result<GitHubClient> {
        let auth = auth::create_auth_from_env()?.ok_or_else(|| {
            error::GitHubError::Configuration("No GitHub authentication found in environment".to_string())
        })?;

        let token_manager = TokenManager::new(auth);
        GitHubClient::new(token_manager)
    }

    /// Create a GitHub client for MCP servers
    pub async fn create_for_mcp() -> Result<GitHubClientWithEvents> {
        let auth = auth::create_auth_from_env()?.ok_or_else(|| {
            error::GitHubError::Configuration("No GitHub authentication found in environment".to_string())
        })?;

        let token_manager = TokenManager::new(auth);
        let event_publisher = GitHubA2APublisher::from_env().await?;

        GitHubClientWithEvents::new(token_manager, Some(event_publisher))
    }
}
