use thiserror::Error;

/// GitHub-specific error types
#[derive(Error, Debug)]
pub enum GitHubError {
    #[error("Authentication failed: {0}")]
    Authentication(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimit(String),

    #[error("API error: {0}")]
    Api(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("A2A event error: {0}")]
    A2AEvent(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("URL parse error: {0}")]
    UrlParse(#[from] url::ParseError),

    #[error("Base64 decode error: {0}")]
    Base64Decode(#[from] base64::DecodeError),

    #[error("UTF-8 error: {0}")]
    Utf8(#[from] std::string::FromUtf8Error),

    #[error("Other error: {0}")]
    Other(#[from] anyhow::Error),
}

impl GitHubError {
    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            GitHubError::RateLimit(_) => true,
            GitHubError::Network(req_err) => {
                req_err.is_timeout() || req_err.is_connect()
            }
            GitHubError::Api(msg) => {
                // Retry on 5xx errors
                msg.contains("50") && (msg.contains("502") || msg.contains("503") || msg.contains("504"))
            }
            _ => false,
        }
    }

    /// Get HTTP status code if available
    pub fn status_code(&self) -> Option<u16> {
        match self {
            GitHubError::Network(req_err) => {
                req_err.status().map(|s| s.as_u16())
            }
            GitHubError::Authentication(_) => Some(401),
            GitHubError::PermissionDenied(_) => Some(403),
            GitHubError::NotFound(_) | GitHubError::RepositoryNotFound(_) => Some(404),
            GitHubError::RateLimit(_) => Some(429),
            _ => None,
        }
    }

    /// Convert to A2A event error
    pub fn to_a2a_error(&self) -> A2AEventError {
        A2AEventError {
            error_type: match self {
                GitHubError::Authentication(_) => "authentication_failed",
                GitHubError::RateLimit(_) => "rate_limit_exceeded",
                GitHubError::PermissionDenied(_) => "permission_denied",
                GitHubError::NotFound(_) => "not_found",
                GitHubError::Network(_) => "network_error",
                _ => "unknown_error",
            }.to_string(),
            message: self.to_string(),
            retryable: self.is_retryable(),
            status_code: self.status_code(),
        }
    }
}

/// A2A event error representation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct A2AEventError {
    pub error_type: String,
    pub message: String,
    pub retryable: bool,
    pub status_code: Option<u16>,
}

/// Result type for GitHub operations
pub type GitHubResult<T> = Result<T, GitHubError>;

// Map header construction errors to a GitHubError variant used by client
impl From<reqwest::header::InvalidHeaderValue> for GitHubError {
    fn from(err: reqwest::header::InvalidHeaderValue) -> Self {
        GitHubError::Api(format!("Invalid header value: {}", err))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_retryability() {
        assert!(GitHubError::RateLimit("test".to_string()).is_retryable());
        assert!(!GitHubError::Authentication("test".to_string()).is_retryable());
        assert!(!GitHubError::NotFound("test".to_string()).is_retryable());
    }

    #[test]
    fn test_status_codes() {
        assert_eq!(GitHubError::Authentication("test".to_string()).status_code(), Some(401));
        assert_eq!(GitHubError::PermissionDenied("test".to_string()).status_code(), Some(403));
        assert_eq!(GitHubError::NotFound("test".to_string()).status_code(), Some(404));
        assert_eq!(GitHubError::RateLimit("test".to_string()).status_code(), Some(429));
    }

    #[test]
    fn test_a2a_error_conversion() {
        let github_error = GitHubError::Authentication("Invalid token".to_string());
        let a2a_error = github_error.to_a2a_error();

        assert_eq!(a2a_error.error_type, "authentication_failed");
        assert_eq!(a2a_error.message, "Authentication failed: Invalid token");
        assert!(!a2a_error.retryable);
        assert_eq!(a2a_error.status_code, Some(401));
    }
}
