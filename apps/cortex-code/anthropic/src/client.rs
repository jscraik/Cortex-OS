//! Anthropic client implementation

use crate::error::AnthropicError;
use crate::models::{AnthropicMessage, AnthropicRequest, AnthropicResponse, MessageRole};
use crate::streaming::AnthropicStream;
use crate::{ANTHROPIC_API_BASE, ANTHROPIC_BETA, ANTHROPIC_VERSION};
use reqwest::Client;
use std::time::Duration;
use tracing::{debug, error, info};

/// Anthropic API client
#[derive(Clone, Debug)]
pub struct AnthropicClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AnthropicClient {
    /// Create a new Anthropic client with the given API key
    pub fn new(api_key: String) -> Result<Self, AnthropicError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(AnthropicError::HttpError)?;

        Ok(Self {
            client,
            api_key,
            base_url: ANTHROPIC_API_BASE.to_string(),
        })
    }

    /// Create a new client with custom base URL (for testing)
    pub fn with_base_url(api_key: String, base_url: String) -> Result<Self, AnthropicError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(AnthropicError::HttpError)?;

        Ok(Self {
            client,
            api_key,
            base_url: base_url.trim_end_matches('/').to_string(),
        })
    }

    /// Send a non-streaming completion request
    pub async fn complete(
        &self,
        messages: Vec<AnthropicMessage>,
        model: &str,
        max_tokens: Option<u32>,
        temperature: Option<f32>,
    ) -> Result<AnthropicResponse, AnthropicError> {
        let request = AnthropicRequest {
            model: model.to_string(),
            max_tokens: max_tokens.unwrap_or(4096),
            messages,
            temperature,
            stream: None,
        };

        debug!("Sending Anthropic request: {:?}", request);

        let url = format!("{}/messages", self.base_url);
        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("anthropic-beta", ANTHROPIC_BETA)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(AnthropicError::HttpError)?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("Anthropic API error: {} - {}", status, error_text);
            return Err(AnthropicError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        let anthropic_response: AnthropicResponse =
            response.json().await.map_err(AnthropicError::HttpError)?;

        info!("Received Anthropic response for model: {}", model);
        Ok(anthropic_response)
    }

    /// Send a streaming completion request
    pub async fn complete_streaming(
        &self,
        messages: Vec<AnthropicMessage>,
        model: &str,
        max_tokens: Option<u32>,
        temperature: Option<f32>,
    ) -> Result<AnthropicStream, AnthropicError> {
        let request = AnthropicRequest {
            model: model.to_string(),
            max_tokens: max_tokens.unwrap_or(4096),
            messages,
            temperature,
            stream: Some(true),
        };

        debug!("Sending Anthropic streaming request: {:?}", request);

        let url = format!("{}/messages", self.base_url);
        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("anthropic-beta", ANTHROPIC_BETA)
            .header("content-type", "application/json")
            .header("accept", "text/event-stream")
            .json(&request)
            .send()
            .await
            .map_err(AnthropicError::HttpError)?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("Anthropic streaming API error: {} - {}", status, error_text);
            return Err(AnthropicError::ApiError {
                status: status.as_u16(),
                message: error_text,
            });
        }

        Ok(AnthropicStream::new(response))
    }

    /// Test the API connection
    pub async fn test_connection(&self) -> Result<(), AnthropicError> {
        let test_messages = vec![AnthropicMessage {
            role: MessageRole::User,
            content: "Hello".to_string(),
        }];

        let response = self
            .complete(test_messages, "claude-3-haiku-20240307", Some(10), None)
            .await?;

        if response.content.is_empty() {
            return Err(AnthropicError::ApiError {
                status: 500,
                message: "Empty response from API".to_string(),
            });
        }

        info!("Anthropic connection test successful");
        Ok(())
    }

    /// Get the API key (for debugging, returns masked version)
    pub fn api_key_masked(&self) -> String {
        if self.api_key.len() > 8 {
            format!(
                "{}...{}",
                &self.api_key[..4],
                &self.api_key[self.api_key.len() - 4..]
            )
        } else {
            "***".to_string()
        }
    }

    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}
