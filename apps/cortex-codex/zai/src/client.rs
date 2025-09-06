//! Z.ai API client implementation
//!
//! This module provides a comprehensive client for the Z.ai API, following
//! the patterns established in openai/codex-rs for consistency and reliability.

use crate::error::ZaiError;
use crate::models::{
    ZaiChatCompletionRequest, ZaiChatCompletionResponse, ZaiModel, ZaiModelsResponse
};
use crate::streaming::ZaiStream;
use reqwest::{Client, RequestBuilder};
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, error, info, warn};

/// Default Z.ai API base URL
pub const DEFAULT_BASE_URL: &str = "https://api.z.ai/v1";

/// Default timeout for API requests
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(60);

/// Z.ai API client
#[derive(Debug, Clone)]
pub struct ZaiClient {
    /// HTTP client
    client: Client,
    /// API key for authentication
    api_key: String,
    /// Base URL for the API
    base_url: String,
    /// Organization ID (optional)
    organization: Option<String>,
    /// Default model to use
    default_model: Option<String>,
}

impl ZaiClient {
    /// Create a new Z.ai client
    pub fn new(api_key: impl Into<String>) -> Result<Self, ZaiError> {
        let api_key = api_key.into();
        if api_key.is_empty() {
            return Err(ZaiError::authentication_error("API key cannot be empty"));
        }

        let client = Client::builder()
            .timeout(DEFAULT_TIMEOUT)
            .user_agent("cortex-codex/1.0")
            .build()
            .map_err(ZaiError::HttpError)?;

        Ok(Self {
            client,
            api_key,
            base_url: DEFAULT_BASE_URL.to_string(),
            organization: None,
            default_model: None,
        })
    }

    /// Create a new Z.ai client with custom configuration
    pub fn with_config(
        api_key: impl Into<String>,
        base_url: Option<String>,
        timeout: Option<Duration>,
        organization: Option<String>,
    ) -> Result<Self, ZaiError> {
        let api_key = api_key.into();
        if api_key.is_empty() {
            return Err(ZaiError::authentication_error("API key cannot be empty"));
        }

        let mut client_builder = Client::builder()
            .user_agent("cortex-codex/1.0");

        if let Some(timeout) = timeout {
            client_builder = client_builder.timeout(timeout);
        } else {
            client_builder = client_builder.timeout(DEFAULT_TIMEOUT);
        }

        let client = client_builder
            .build()
            .map_err(ZaiError::HttpError)?;

        Ok(Self {
            client,
            api_key,
            base_url: base_url.unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
            organization,
            default_model: None,
        })
    }

    /// Set the default model
    pub fn with_default_model(mut self, model: impl Into<String>) -> Self {
        self.default_model = Some(model.into());
        self
    }

    /// Set the organization
    pub fn with_organization(mut self, organization: impl Into<String>) -> Self {
        self.organization = Some(organization.into());
        self
    }

    /// Get the default model
    pub fn default_model(&self) -> Option<&str> {
        self.default_model.as_deref()
    }

    /// Create a chat completion
    pub async fn chat_completion(
        &self,
        request: ZaiChatCompletionRequest,
    ) -> Result<ZaiChatCompletionResponse, ZaiError> {
        let url = format!("{}/chat/completions", self.base_url);
        
        debug!("Sending chat completion request to Z.ai: {:?}", request);
        
        let response = self
            .build_request_builder("POST", &url)?
            .json(&request)
            .send()
            .await
            .map_err(ZaiError::HttpError)?;

        self.handle_response(response).await
    }

    /// Create a streaming chat completion
    pub async fn chat_completion_stream(
        &self,
        mut request: ZaiChatCompletionRequest,
    ) -> Result<ZaiStream, ZaiError> {
        // Ensure streaming is enabled
        request.stream = Some(true);
        
        let url = format!("{}/chat/completions", self.base_url);
        
        debug!("Sending streaming chat completion request to Z.ai: {:?}", request);
        
        let response = self
            .build_request_builder("POST", &url)?
            .json(&request)
            .send()
            .await
            .map_err(ZaiError::HttpError)?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(ZaiError::api_error(
                status.to_string(),
                format!("Streaming request failed: {}", error_text),
            ));
        }

        Ok(ZaiStream::new(response))
    }

    /// List available models
    pub async fn list_models(&self) -> Result<ZaiModelsResponse, ZaiError> {
        let url = format!("{}/models", self.base_url);
        
        debug!("Fetching available models from Z.ai");
        
        let response = self
            .build_request_builder("GET", &url)?
            .send()
            .await
            .map_err(ZaiError::HttpError)?;

        self.handle_response(response).await
    }

    /// Get a specific model
    pub async fn get_model(&self, model_id: &str) -> Result<ZaiModel, ZaiError> {
        let url = format!("{}/models/{}", self.base_url, model_id);
        
        debug!("Fetching model details for: {}", model_id);
        
        let response = self
            .build_request_builder("GET", &url)?
            .send()
            .await
            .map_err(ZaiError::HttpError)?;

        self.handle_response(response).await
    }

    /// Build a request builder with authentication headers
    fn build_request_builder(&self, method: &str, url: &str) -> Result<RequestBuilder, ZaiError> {
        let mut builder = match method {
            "GET" => self.client.get(url),
            "POST" => self.client.post(url),
            "PUT" => self.client.put(url),
            "DELETE" => self.client.delete(url),
            _ => return Err(ZaiError::invalid_request(format!("Unsupported HTTP method: {}", method))),
        };

        // Add authentication header
        builder = builder.header("Authorization", format!("Bearer {}", self.api_key));

        // Add organization header if provided
        if let Some(org) = &self.organization {
            builder = builder.header("Z-Organization", org);
        }

        // Add content type for POST/PUT requests
        if matches!(method, "POST" | "PUT") {
            builder = builder.header("Content-Type", "application/json");
        }

        Ok(builder)
    }

    /// Handle API response and convert to typed result
    async fn handle_response<T>(&self, response: reqwest::Response) -> Result<T, ZaiError>
    where
        T: serde::de::DeserializeOwned,
    {
        let status = response.status();
        
        if status.is_success() {
            let text = response.text().await.map_err(ZaiError::HttpError)?;
            debug!("Z.ai API response: {}", text);
            
            serde_json::from_str(&text).map_err(ZaiError::JsonError)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Z.ai API error ({}): {}", status, error_text);

            // Try to parse as Z.ai error format
            if let Ok(error_json) = serde_json::from_str::<Value>(&error_text) {
                if let Some(error_obj) = error_json.get("error") {
                    let code = error_obj
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    let message = error_obj
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown error");

                    return match status.as_u16() {
                        401 => Err(ZaiError::authentication_error(message)),
                        429 => Err(ZaiError::rate_limit_error(message)),
                        404 => Err(ZaiError::model_not_found(message)),
                        _ => Err(ZaiError::api_error(code, message)),
                    };
                }
            }

            // Fallback to generic error
            Err(ZaiError::api_error(
                status.to_string(),
                format!("API request failed: {}", error_text),
            ))
        }
    }

    /// Validate API key format
    pub fn validate_api_key(api_key: &str) -> Result<(), ZaiError> {
        if api_key.is_empty() {
            return Err(ZaiError::authentication_error("API key cannot be empty"));
        }

        // Z.ai API keys typically start with "zai-"
        if !api_key.starts_with("zai-") {
            warn!("API key does not start with 'zai-', this may indicate an invalid key format");
        }

        // Check minimum length
        if api_key.len() < 10 {
            return Err(ZaiError::authentication_error(
                "API key appears to be too short",
            ));
        }

        Ok(())
    }

    /// Test the connection to Z.ai API
    pub async fn test_connection(&self) -> Result<(), ZaiError> {
        info!("Testing connection to Z.ai API");
        
        // Try to list models as a simple connectivity test
        let _models = self.list_models().await?;
        
        info!("Successfully connected to Z.ai API");
        Ok(())
    }

    /// Get API usage statistics (if supported by Z.ai)
    pub async fn get_usage(&self) -> Result<HashMap<String, Value>, ZaiError> {
        let url = format!("{}/usage", self.base_url);
        
        debug!("Fetching usage statistics from Z.ai");
        
        let response = self
            .build_request_builder("GET", &url)?
            .send()
            .await
            .map_err(ZaiError::HttpError)?;

        self.handle_response(response).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_key_validation() {
        // Valid key
        assert!(ZaiClient::validate_api_key("zai-1234567890abcdef").is_ok());
        
        // Empty key
        assert!(ZaiClient::validate_api_key("").is_err());
        
        // Too short
        assert!(ZaiClient::validate_api_key("zai-123").is_err());
    }

    #[test]
    fn test_client_creation() {
        let client = ZaiClient::new("zai-test-key").unwrap();
        assert_eq!(client.base_url, DEFAULT_BASE_URL);
        assert_eq!(client.api_key, "zai-test-key");
        assert!(client.organization.is_none());
        assert!(client.default_model.is_none());
    }

    #[test]
    fn test_client_with_config() {
        let client = ZaiClient::with_config(
            "zai-test-key",
            Some("https://custom.api.z.ai/v1".to_string()),
            Some(Duration::from_secs(30)),
            Some("org-123".to_string()),
        ).unwrap();

        assert_eq!(client.base_url, "https://custom.api.z.ai/v1");
        assert_eq!(client.organization, Some("org-123".to_string()));
    }

    #[test]
    fn test_default_model() {
        let client = ZaiClient::new("zai-test-key")
            .unwrap()
            .with_default_model("z-ai-large");
        
        assert_eq!(client.default_model(), Some("z-ai-large"));
    }
}
