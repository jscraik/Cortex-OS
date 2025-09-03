use crate::github::{GitHubRateLimiter, TokenManager};
use crate::Result;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};
use reqwest::{Client, Method, Response};
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, warn};
use url::Url;

/// Main GitHub API client with authentication, rate limiting, and error handling
#[derive(Clone)]
pub struct GitHubClient {
    http_client: Client,
    token_manager: Arc<Mutex<TokenManager>>,
    rate_limiter: GitHubRateLimiter,
    base_url: Url,
}

impl GitHubClient {
    /// Create a new GitHub client
    pub fn new(token_manager: TokenManager) -> Result<Self> {
        let http_client = Client::builder()
            .user_agent("cortex-code/2.0.0")
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let base_url = Url::parse("https://api.github.com")?;
        let rate_limiter = GitHubRateLimiter::new();

        Ok(Self {
            http_client,
            token_manager: Arc::new(Mutex::new(token_manager)),
            rate_limiter,
            base_url,
        })
    }

    /// Make a GET request
    pub async fn get<T>(&self, endpoint: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let response = self.request(Method::GET, endpoint, None::<()>).await?;
        self.parse_response(response).await
    }

    /// Make a POST request
    pub async fn post<B, T>(&self, endpoint: &str, body: Option<B>) -> Result<T>
    where
        B: Serialize + Clone + Send + 'static,
        T: DeserializeOwned,
    {
        let response = self.request(Method::POST, endpoint, body).await?;
        self.parse_response(response).await
    }

    /// Make a PUT request
    pub async fn put<B, T>(&self, endpoint: &str, body: Option<B>) -> Result<T>
    where
        B: Serialize + Clone + Send + 'static,
        T: DeserializeOwned,
    {
        let response = self.request(Method::PUT, endpoint, body).await?;
        self.parse_response(response).await
    }

    /// Make a PATCH request
    pub async fn patch<B, T>(&self, endpoint: &str, body: Option<B>) -> Result<T>
    where
        B: Serialize + Clone + Send + 'static,
        T: DeserializeOwned,
    {
        let response = self.request(Method::PATCH, endpoint, body).await?;
        self.parse_response(response).await
    }

    /// Make a DELETE request
    pub async fn delete(&self, endpoint: &str) -> Result<()> {
        let response = self.request(Method::DELETE, endpoint, None::<()>).await?;
        if response.status().is_success() {
            Ok(())
        } else {
            Err(self.create_error_from_response(response).await)
        }
    }

    /// Make a raw request and return the response
    pub async fn request_raw<B>(&self, method: Method, endpoint: &str, body: Option<B>) -> Result<Response>
    where
        B: Serialize + Clone + Send + 'static,
    {
        self.request(method, endpoint, body).await
    }

    /// Internal request method
    async fn request<B>(&self, method: Method, endpoint: &str, body: Option<B>) -> Result<Response>
    where
        B: Serialize + Clone + Send + 'static,
    {
        let url = self.build_url(endpoint)?;
        let client = self.clone();

        self.rate_limiter
            .make_request(move || {
                let client = client.clone();
                let method = method.clone();
                let url = url.clone();
                let body = body.clone();
                Box::pin(async move {
                    let mut headers = client.build_headers().await?;

                    let mut request_builder = client.http_client.request(method.clone(), url.clone());

                    if let Some(body) = &body {
                        let json_body = serde_json::to_string(body).map_err(crate::error::Error::Serialization)?;
                        headers.insert("content-type", HeaderValue::from_static("application/json"));
                        request_builder = request_builder.body(json_body);
                    }

                    request_builder = request_builder.headers(headers);

                    let request = request_builder.build().map_err(crate::error::Error::Http)?;
                    debug!("Making GitHub API request: {} {}", method, url);

                    let response = client.http_client.execute(request).await.map_err(crate::error::Error::Http)?;

                    if response.status().is_success() {
                        Ok(response)
                    } else {
                        Err(client.create_error_from_response(response).await)
                    }
                }) as std::pin::Pin<Box<dyn futures::Future<Output = Result<reqwest::Response>> + Send>>
            })
            .await
    }

    /// Build the complete URL for an endpoint
    fn build_url(&self, endpoint: &str) -> Result<Url> {
        let endpoint = endpoint.strip_prefix('/').unwrap_or(endpoint);
        Ok(self.base_url.join(endpoint)?)
    }

    /// Build request headers with authentication
    async fn build_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();

        // Get authentication token
        let token = {
            let mut token_manager = self.token_manager.lock().await;
            token_manager.get_token().await?
        };

        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", token)).map_err(|e| crate::error::Error::Other(anyhow::anyhow!(e.to_string())))?);
        headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github.v3+json"));
        headers.insert(USER_AGENT, HeaderValue::from_static("cortex-code/2.0.0"));
        headers.insert("X-GitHub-Api-Version", HeaderValue::from_static("2022-11-28"));

        Ok(headers)
    }

    /// Parse a successful response
    async fn parse_response<T>(&self, response: Response) -> Result<T>
    where
        T: DeserializeOwned,
    {
        // If T is unit type (()), return unit on 204 or empty body
        let status = response.status();
        let text = response.text().await?;

        if text.trim().is_empty() {
            if status.as_u16() == 204 || std::mem::size_of::<T>() == 0 {
                // SAFETY: Instead of unsafe zeroed, downcast via serde from an empty JSON value
                // For unit type, deserializing `null` yields ()
                let v = serde_json::Value::Null;
                return serde_json::from_value(v).map_err(crate::error::Error::Serialization);
            }
            return Err(crate::error::Error::Serialization(
                serde_json::Error::io(std::io::Error::new(
                    std::io::ErrorKind::UnexpectedEof,
                    "Empty response body",
                )))
            );
        }

        serde_json::from_str(&text).map_err(|e| {
            warn!("Failed to parse GitHub API response: {}", text);
            crate::error::Error::Serialization(e)
        })
    }

    /// Create an error from a failed response
    async fn create_error_from_response(&self, response: Response) -> crate::error::Error {
    let status_code = response.status().as_u16();

        match response.text().await {
            Ok(text) => {
                // Try to parse GitHub error response
                if let Ok(github_error) = serde_json::from_str::<crate::github::types::GitHubError>(&text) {
                    match status_code {
                        401 => crate::error::Error::Provider(crate::error::ProviderError::AuthFailed),
                        403 | 429 => crate::error::Error::Provider(crate::error::ProviderError::RateLimited),
                        404 => crate::error::Error::Provider(crate::error::ProviderError::Api(
                            format!("Resource not found: {}", github_error.message)
                        )),
                        422 => crate::error::Error::Provider(crate::error::ProviderError::Api(
                            format!("Validation failed: {}", github_error.message)
                        )),
                        _ => crate::error::Error::Provider(crate::error::ProviderError::Api(
                            github_error.message
                        )),
                    }
                } else {
                    crate::error::Error::Provider(crate::error::ProviderError::Api(
                        format!("HTTP {} - {}", status_code, text)
                    ))
                }
            }
            Err(_) => {
                crate::error::Error::Provider(crate::error::ProviderError::Api(
                    format!("HTTP {}", status_code)
                ))
            }
        }
    }

    /// Get paginated results
    pub async fn get_paginated<T>(&self, endpoint: &str) -> Result<Vec<T>>
    where
        T: DeserializeOwned,
    {
        let mut all_items = Vec::new();
        let mut next_url = Some(endpoint.to_string());

        while let Some(url) = next_url {
            let response = self.request_raw(Method::GET, &url, None::<()>).await?;

            // Parse link header for pagination
            next_url = self.parse_next_link(response.headers());

            let items: Vec<T> = self.parse_response(response).await?;
            all_items.extend(items);
        }

        Ok(all_items)
    }

    /// Parse Link header for pagination
    fn parse_next_link(&self, headers: &HeaderMap) -> Option<String> {
        headers
            .get("link")
            .and_then(|header| header.to_str().ok())
            .and_then(|link_header| {
                // Parse Link header format: <https://api.github.com/resource?page=2>; rel="next"
                for link in link_header.split(',') {
                    let parts: Vec<&str> = link.trim().split(';').collect();
                    if parts.len() >= 2 {
                        let url_part = parts[0].trim();
                        let rel_part = parts[1].trim();

                        if url_part.starts_with('<') && url_part.ends_with('>') && rel_part.contains("next") {
                            let url = &url_part[1..url_part.len()-1];
                            // Convert full URL to relative endpoint
                            if let Ok(parsed_url) = Url::parse(url) {
                                return Some(format!("{}?{}", parsed_url.path(), parsed_url.query().unwrap_or("")));
                            }
                        }
                    }
                }
                None
            })
    }

    /// Download binary content (for artifacts, etc.)
    pub async fn download(&self, url: &str) -> Result<bytes::Bytes> {
        let response = self.rate_limiter
            .make_request({
                let client = self.clone();
                let url = url.to_string();
                move || {
                    let client = client.clone();
                    let url = url.clone();
                    Box::pin(async move {
                        let headers = client.build_headers().await?;

                        let request = client.http_client
                            .get(&url)
                            .headers(headers)
                            .build()
                            .map_err(crate::error::Error::Http)?;

                        debug!("Downloading from GitHub: {}", url);
                        let response = client.http_client.execute(request).await.map_err(crate::error::Error::Http)?;

                        if response.status().is_success() {
                            Ok(response)
                        } else {
                            Err(client.create_error_from_response(response).await)
                        }
                    }) as std::pin::Pin<Box<dyn futures::Future<Output = Result<reqwest::Response>> + Send>>
                }
            })
            .await?;

        let bytes = response.bytes().await.map_err(crate::error::Error::Http)?;
        Ok(bytes)
    }

    /// Check if client is authenticated
    pub async fn is_authenticated(&self) -> bool {
        let token_manager = self.token_manager.lock().await;
        token_manager.is_authenticated()
    }

    /// Get rate limit status
    pub async fn get_rate_limit_status(&self) -> crate::github::rate_limiter::RateLimitStatus {
        self.rate_limiter.get_rate_limit_status().await
    }

    /// Validate API token and scopes
    pub async fn validate_token(&self) -> Result<TokenValidation> {
        let response = self.request_raw(Method::GET, "/user", None::<()>).await?;

        let scopes = response
            .headers()
            .get("x-oauth-scopes")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.split(',').map(|scope| scope.trim().to_string()).collect())
            .unwrap_or_default();

        let rate_limit = response
            .headers()
            .get("x-ratelimit-limit")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse().ok())
            .unwrap_or(60); // Unauthenticated limit

        let user: serde_json::Value = self.parse_response(response).await?;

        Ok(TokenValidation {
            valid: true,
            scopes,
            rate_limit,
            user_login: user.get("login").and_then(|v| v.as_str()).map(|s| s.to_string()),
            user_type: user.get("type").and_then(|v| v.as_str()).map(|s| s.to_string()),
        })
    }
}

#[derive(Debug, Clone)]
pub struct TokenValidation {
    pub valid: bool,
    pub scopes: Vec<String>,
    pub rate_limit: u64,
    pub user_login: Option<String>,
    pub user_type: Option<String>,
}

/// GitHub API client builder for configuration
pub struct GitHubClientBuilder {
    token_manager: Option<TokenManager>,
    base_url: Option<String>,
    timeout: Option<std::time::Duration>,
    user_agent: Option<String>,
}

impl GitHubClientBuilder {
    pub fn new() -> Self {
        Self {
            token_manager: None,
            base_url: None,
            timeout: None,
            user_agent: None,
        }
    }

    pub fn with_token_manager(mut self, token_manager: TokenManager) -> Self {
        self.token_manager = Some(token_manager);
        self
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = Some(base_url.into());
        self
    }

    pub fn with_timeout(mut self, timeout: std::time::Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn with_user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = Some(user_agent.into());
        self
    }

    pub fn build(self) -> Result<GitHubClient> {
        let token_manager = self.token_manager
            .ok_or_else(|| crate::error::Error::Config(
                crate::error::ConfigError::MissingField("token_manager".to_string())
            ))?;

        let mut client = GitHubClient::new(token_manager)?;

        if let Some(base_url) = self.base_url {
            client.base_url = Url::parse(&base_url)?;
        }

        // Rebuild HTTP client with custom settings if needed
        if self.timeout.is_some() || self.user_agent.is_some() {
            let mut client_builder = Client::builder();

            if let Some(timeout) = self.timeout {
                client_builder = client_builder.timeout(timeout);
            }

            if let Some(user_agent) = self.user_agent {
                client_builder = client_builder.user_agent(user_agent);
            } else {
                client_builder = client_builder.user_agent("cortex-code/2.0.0");
            }

            client.http_client = client_builder.build()?;
        }

        Ok(client)
    }
}

impl Default for GitHubClientBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::auth::GitHubAuth;

    #[test]
    fn test_url_building() {
        let token_manager = TokenManager::new(GitHubAuth::PersonalAccessToken("test".to_string()));
        let client = GitHubClient::new(token_manager).unwrap();

        let url = client.build_url("/repos/owner/repo").unwrap();
        assert_eq!(url.as_str(), "https://api.github.com/repos/owner/repo");

        let url2 = client.build_url("repos/owner/repo").unwrap();
        assert_eq!(url2.as_str(), "https://api.github.com/repos/owner/repo");
    }

    #[test]
    fn test_link_header_parsing() {
        let token_manager = TokenManager::new(GitHubAuth::PersonalAccessToken("test".to_string()));
        let client = GitHubClient::new(token_manager).unwrap();

        let mut headers = HeaderMap::new();
        headers.insert(
            "link",
            HeaderValue::from_static(r#"<https://api.github.com/repos/owner/repo/issues?page=2>; rel="next", <https://api.github.com/repos/owner/repo/issues?page=5>; rel="last""#)
        );

        let next_link = client.parse_next_link(&headers);
        assert_eq!(next_link, Some("/repos/owner/repo/issues?page=2".to_string()));
    }

    #[tokio::test]
    async fn test_client_builder() {
        let token_manager = TokenManager::new(GitHubAuth::PersonalAccessToken("test".to_string()));

        let client = GitHubClientBuilder::new()
            .with_token_manager(token_manager)
            .with_timeout(std::time::Duration::from_secs(60))
            .with_user_agent("test-agent/1.0.0")
            .build()
            .unwrap();

        assert!(!client.is_authenticated().await); // Token not validated yet
    }
}
