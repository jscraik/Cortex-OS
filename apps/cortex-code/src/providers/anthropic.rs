use crate::config::AnthropicConfig;
use crate::error::{ProviderError, Result};
use crate::providers::{ModelProvider, ResponseStream};
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};

#[derive(Debug, Clone)]
pub struct AnthropicProvider {
    client: Client,
    config: AnthropicConfig,
}

impl AnthropicProvider {
    pub fn new(config: &AnthropicConfig) -> Result<Self> {
        let client = Client::new();
        Ok(Self {
            client,
            config: config.clone(),
        })
    }
}

#[async_trait]
impl ModelProvider for AnthropicProvider {
    fn provider_name(&self) -> &str {
        "anthropic"
    }

    async fn complete(&self, prompt: &str) -> Result<String> {
        let request_body = json!({
            "model": self.config.model,
            "max_tokens": 4000,
            "temperature": 0.7,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        });

        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ProviderError::Api(
                format!("Anthropic API error {}: {}", status, error_text)
            ).into());
        }

        let response_json: Value = response.json().await
            .map_err(|e| ProviderError::Api(format!("Invalid response format: {}", e)))?;

        let content = response_json
            .get("content")
            .and_then(|content_array| content_array.get(0))
            .and_then(|content_item| content_item.get("text"))
            .and_then(|text| text.as_str())
            .ok_or_else(|| ProviderError::Api("No content in response".to_string()))?;

        Ok(content.to_string())
    }

    async fn stream(&self, prompt: &str) -> Result<ResponseStream> {
        let request_body = json!({
            "model": self.config.model,
            "max_tokens": 4000,
            "temperature": 0.7,
            "stream": true,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        });

        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ProviderError::Api(
                format!("Anthropic API error {}: {}", status, error_text)
            ).into());
        }

        let stream = response.bytes_stream()
            .map(|chunk_result| {
                chunk_result
                    .map_err(|e| ProviderError::Api(format!("Stream error: {}", e)))
                    .and_then(|chunk| {
                        let text = String::from_utf8_lossy(&chunk);
                        // Parse SSE format: "data: {json}\n\n"
                        for line in text.lines() {
                            if let Some(json_str) = line.strip_prefix("data: ") {
                                if json_str == "[DONE]" {
                                    return Ok(None);
                                }

                                if let Ok(json_value) = serde_json::from_str::<Value>(json_str) {
                                    // Anthropic uses different event types
                                    if json_value.get("type") == Some(&json!("content_block_delta")) {
                                        if let Some(content) = json_value
                                            .get("delta")
                                            .and_then(|delta| delta.get("text"))
                                            .and_then(|text| text.as_str()) {
                                            return Ok(Some(content.to_string()));
                                        }
                                    }
                                }
                            }
                        }
                        Ok(None)
                    })
                    .map_err(|e: ProviderError| e.into())
            })
            .filter_map(|item| async {
                match item {
                    Ok(Some(content)) => Some(Ok(content)),
                    Ok(None) => None,
                    Err(e) => Some(Err(e)),
                }
            });

        Ok(Box::pin(stream))
    }

    fn supported_models(&self) -> Vec<String> {
        vec![
            "claude-3-5-sonnet".to_string(),
            "claude-3-opus".to_string(),
            "claude-3-haiku".to_string(),
        ]
    }
}
