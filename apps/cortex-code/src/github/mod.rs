//! GitHub Native Agent - Comprehensive GitHub integration for Cortex TUI
//!
//! This module provides production-ready GitHub API integration with:
//! - Authentication and token management
//! - Rate limiting and error handling
//! - Repository operations and file management
//! - GitHub Actions workflow integration
//! - Pull request and issue management
//! - Real-time monitoring capabilities

pub mod auth;
pub mod client;
pub mod rate_limiter;
pub mod repository;
pub mod actions;
pub mod pull_requests;
pub mod events;
pub mod types;

pub use auth::{GitHubAuth, TokenManager};
pub use client::GitHubClient;
pub use rate_limiter::GitHubRateLimiter;
pub use repository::RepositoryAPI;
pub use actions::ActionsAPI;
pub use pull_requests::PullRequestAPI;
pub use events::GitHubEventStream;
pub use types::*;
