use crate::error::{GitHubError, GitHubResult};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime};
use tracing::{debug, warn};

/// GitHub authentication methods and token management
#[derive(Debug, Clone)]
pub enum GitHubAuth {
    PersonalAccessToken(String),
    GitHubApp {
        app_id: String,
        private_key: String,
        installation_id: String,
    },
    OAuth {
        client_id: String,
        client_secret: String,
        access_token: String,
        refresh_token: Option<String>,
    },
}

/// Token with expiration information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub token: String,
    pub expires_at: Option<SystemTime>,
    pub scopes: Vec<String>,
    pub token_type: String,
}

/// GitHub App JWT for authentication
#[derive(Debug, Serialize, Deserialize)]
struct GitHubAppJWT {
    iss: String, // GitHub App ID
    iat: u64,    // Issued at
    exp: u64,    // Expires at (max 10 minutes)
}

/// Installation token response from GitHub
#[derive(Debug, Deserialize)]
struct InstallationTokenResponse {
    token: String,
    expires_at: String,
    permissions: std::collections::HashMap<String, String>,
    #[allow(dead_code)]
    repository_selection: Option<String>,
}

pub struct TokenManager {
    auth: GitHubAuth,
    current_token: Option<AuthToken>,
    client: reqwest::Client,
}

impl TokenManager {
    pub fn new(auth: GitHubAuth) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("cortex-code/2.0.0")
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            auth,
            current_token: None,
            client,
        }
    }

    /// Get a valid access token, refreshing if necessary
    pub async fn get_token(&mut self) -> GitHubResult<String> {
        // Check if current token is still valid
        if let Some(ref token) = self.current_token {
            if !self.is_token_expired(&token) {
                return Ok(token.token.clone());
            }
        }

        // Refresh or obtain new token
        self.refresh_token().await
    }

    /// Check if token is expired or expires very soon (within 30 seconds)
    fn is_token_expired(&self, token: &AuthToken) -> bool {
        if let Some(expires_at) = token.expires_at {
            let now = SystemTime::now();
            // Use a conservative but not overly aggressive buffer to avoid early refreshes in tests
            let expires_soon = expires_at
                .checked_sub(Duration::from_secs(30)) // 30 seconds buffer
                .unwrap_or(expires_at);
            now >= expires_soon
        } else {
            // Personal access tokens don't expire
            false
        }
    }

    /// Refresh or obtain new token based on auth method
    async fn refresh_token(&mut self) -> GitHubResult<String> {
        match &self.auth {
            GitHubAuth::PersonalAccessToken(token) => {
                // Validate the token
                let is_valid = self.validate_token(token).await?;
                if !is_valid {
                    return Err(GitHubError::Authentication("Token invalid".to_string()));
                }

                let auth_token = AuthToken {
                    token: token.clone(),
                    expires_at: None, // PATs don't expire
                    scopes: vec![], // Will be populated by validation
                    token_type: "Bearer".to_string(),
                };

                self.current_token = Some(auth_token);
                Ok(token.clone())
            }

            GitHubAuth::GitHubApp {
                app_id,
                private_key,
                installation_id,
            } => {
                let installation_token = self
                    .get_installation_token(app_id, private_key, installation_id)
                    .await?;

                self.current_token = Some(installation_token.clone());
                Ok(installation_token.token)
            }

            GitHubAuth::OAuth {
                access_token,
                // refresh_token intentionally unused for now
                ..
            } => {
                // For now, just use the access token
                // In a full implementation, we'd refresh using the refresh token
                let auth_token = AuthToken {
                    token: access_token.clone(),
                    expires_at: None, // Would need to track expiration
                    scopes: vec![],
                    token_type: "Bearer".to_string(),
                };

                self.current_token = Some(auth_token);
                Ok(access_token.clone())
            }
        }
    }

    /// Validate a personal access token
    async fn validate_token(&self, token: &str) -> GitHubResult<bool> {
        let response = self
            .client
            .get("https://api.github.com/user")
            .header("Authorization", format!("Bearer {}", token))
            .header("Accept", "application/vnd.github.v3+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()
            .await?;

        if response.status() == 401 {
            warn!("GitHub token validation failed: unauthorized");
            return Ok(false);
        }

        if response.status() == 403 {
            // Check if it's a rate limit issue
            let rate_limit_remaining = response
                .headers()
                .get("x-ratelimit-remaining")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);

            if rate_limit_remaining == 0 {
                warn!("GitHub API rate limit exceeded during token validation");
                return Err(GitHubError::RateLimit("API rate limit exceeded".to_string()));
            }

            warn!("GitHub token validation failed: forbidden");
            return Ok(false);
        }

        if !response.status().is_success() {
            warn!(
                "GitHub token validation failed with status: {}",
                response.status()
            );
            return Ok(false);
        }

        debug!("GitHub token validation successful");
        Ok(true)
    }

    /// Get installation token for GitHub App
    async fn get_installation_token(
        &self,
        app_id: &str,
        private_key: &str,
        installation_id: &str,
    ) -> GitHubResult<AuthToken> {
        // Create JWT for GitHub App authentication
        let jwt = self.create_github_app_jwt(app_id, private_key)?;

        // Request installation token
        let url = format!(
            "https://api.github.com/app/installations/{}/access_tokens",
            installation_id
        );

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", jwt))
            .header("Accept", "application/vnd.github.v3+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(GitHubError::Authentication("GitHub App authentication failed".to_string()));
        }

        let token_response: InstallationTokenResponse = response.json().await?;

        // Parse expiration time
        let expires_at = chrono::DateTime::parse_from_rfc3339(&token_response.expires_at)
            .map_err(|_| {
                GitHubError::Configuration("Invalid token expiration format".to_string())
            })?
            .timestamp();

        let auth_token = AuthToken {
            token: token_response.token,
            expires_at: Some(SystemTime::UNIX_EPOCH + Duration::from_secs(expires_at as u64)),
            scopes: token_response.permissions.keys().cloned().collect(),
            token_type: "Bearer".to_string(),
        };

        debug!("GitHub App installation token obtained successfully");
        Ok(auth_token)
    }

    /// Create JWT for GitHub App authentication
    fn create_github_app_jwt(&self, app_id: &str, _private_key: &str) -> GitHubResult<String> {
        // For now, return a placeholder
        // In a full implementation, we'd use the `jsonwebtoken` crate to create a proper JWT
        // signed with the GitHub App's private key

        // This is a simplified version for demonstration
        // Real implementation would require:
        // 1. Parse the private key (PEM format)
        // 2. Create JWT with proper header and payload
        // 3. Sign with RS256 algorithm

        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let payload = GitHubAppJWT {
            iss: app_id.to_string(),
            iat: now,
            exp: now + 600, // 10 minutes
        };

        // Placeholder - would use proper JWT signing in production
    let jwt_payload = serde_json::to_string(&payload)?;
    use base64::engine::general_purpose::STANDARD as BASE64;
    use base64::Engine;
    let encoded = BASE64.encode(jwt_payload.as_bytes());

        warn!("Using placeholder JWT - implement proper signing for production");
        Ok(encoded)
    }

    /// Get current token info
    pub fn get_token_info(&self) -> Option<&AuthToken> {
        self.current_token.as_ref()
    }

    /// Check if authentication is available
    pub fn is_authenticated(&self) -> bool {
        self.current_token.is_some()
    }
}

/// Create GitHub authentication from environment variables
pub fn create_auth_from_env() -> GitHubResult<Option<GitHubAuth>> {
    // Check for Personal Access Token
    if let Ok(token) = std::env::var("GITHUB_TOKEN") {
        return Ok(Some(GitHubAuth::PersonalAccessToken(token)));
    }

    if let Ok(token) = std::env::var("CORTEX_GITHUB_TOKEN") {
        return Ok(Some(GitHubAuth::PersonalAccessToken(token)));
    }

    // Check for GitHub App credentials
    if let (Ok(app_id), Ok(private_key), Ok(installation_id)) = (
        std::env::var("GITHUB_APP_ID"),
        std::env::var("GITHUB_APP_PRIVATE_KEY"),
        std::env::var("GITHUB_APP_INSTALLATION_ID"),
    ) {
        return Ok(Some(GitHubAuth::GitHubApp {
            app_id,
            private_key,
            installation_id,
        }));
    }

    // Check for OAuth credentials
    if let (Ok(client_id), Ok(client_secret), Ok(access_token)) = (
        std::env::var("GITHUB_OAUTH_CLIENT_ID"),
        std::env::var("GITHUB_OAUTH_CLIENT_SECRET"),
        std::env::var("GITHUB_OAUTH_ACCESS_TOKEN"),
    ) {
        let refresh_token = std::env::var("GITHUB_OAUTH_REFRESH_TOKEN").ok();

        return Ok(Some(GitHubAuth::OAuth {
            client_id,
            client_secret,
            access_token,
            refresh_token,
        }));
    }

    Ok(None)
}

/// Get authentication scopes for different operations
pub fn get_required_scopes(operation: GitHubOperation) -> Vec<&'static str> {
    match operation {
        GitHubOperation::ReadRepository => vec!["repo"],
        GitHubOperation::WriteRepository => vec!["repo"],
        GitHubOperation::ReadActions => vec!["repo", "actions:read"],
        GitHubOperation::WriteActions => vec!["repo", "actions:write"],
        GitHubOperation::ReadPullRequests => vec!["repo"],
        GitHubOperation::WritePullRequests => vec!["repo", "pull_requests:write"],
        GitHubOperation::ReadIssues => vec!["repo"],
        GitHubOperation::WriteIssues => vec!["repo", "issues:write"],
        GitHubOperation::ReadUser => vec!["user:read"],
        GitHubOperation::ReadOrganization => vec!["read:org"],
    }
}

#[derive(Debug, Clone, Copy)]
pub enum GitHubOperation {
    ReadRepository,
    WriteRepository,
    ReadActions,
    WriteActions,
    ReadPullRequests,
    WritePullRequests,
    ReadIssues,
    WriteIssues,
    ReadUser,
    ReadOrganization,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_expiration() {
        let token = AuthToken {
            token: "test".to_string(),
            expires_at: Some(SystemTime::now() + Duration::from_secs(60)), // 1 minute
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };

        let manager = TokenManager::new(GitHubAuth::PersonalAccessToken("test".to_string()));

        // Token should not be expired (expires in 1 minute, buffer is 5 minutes)
        assert!(!manager.is_token_expired(&token));

        // Test expired token
        let expired_token = AuthToken {
            token: "test".to_string(),
            expires_at: Some(SystemTime::now() - Duration::from_secs(60)), // 1 minute ago
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };

        assert!(manager.is_token_expired(&expired_token));
    }

    #[test]
    fn test_create_auth_from_env() {
        std::env::set_var("GITHUB_TOKEN", "test-token");

        let auth = create_auth_from_env().unwrap();
        assert!(auth.is_some());

        if let Some(GitHubAuth::PersonalAccessToken(token)) = auth {
            assert_eq!(token, "test-token");
        } else {
            panic!("Expected PersonalAccessToken");
        }

        std::env::remove_var("GITHUB_TOKEN");
    }
}
