use crate::config::OpenAIConfig;
use crate::error::{ProviderError, Result};
use crate::providers::{ModelProvider, ResponseStream};
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use bytes::Bytes;

#[derive(Debug, Clone)]
pub struct OpenAIProvider {
    client: Client,
    config: OpenAIConfig,
}

impl OpenAIProvider {
    pub fn new(config: &OpenAIConfig) -> Result<Self> {
        let client = Client::new();
        Ok(Self {
            client,
            config: config.clone(),
        })
    }
}

#[async_trait]
impl ModelProvider for OpenAIProvider {
    fn provider_name(&self) -> &str {
        "openai"
    }

    async fn complete(&self, prompt: &str) -> Result<String> {
        let default_endpoint = "https://api.openai.com/v1/chat/completions".to_string();
        let endpoint = self.config.endpoint.as_ref().unwrap_or(&default_endpoint);

        let request_body = json!({
            "model": self.config.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4000,
            "stream": false
        });

        let response = self.client
            .post(endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
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
                format!("OpenAI API error {}: {}", status, error_text)
            ).into());
        }

        let response_json: Value = response.json().await
            .map_err(|e| ProviderError::Api(format!("Invalid response format: {}", e)))?;

        let content = response_json
            .get("choices")
            .and_then(|choices| choices.get(0))
            .and_then(|choice| choice.get("message"))
            .and_then(|message| message.get("content"))
            .and_then(|content| content.as_str())
            .ok_or_else(|| ProviderError::Api("No content in response".to_string()))?;

        Ok(content.to_string())
    }

    async fn stream(&self, prompt: &str) -> Result<ResponseStream> {
        let default_endpoint = "https://api.openai.com/v1/chat/completions".to_string();
        let endpoint = self.config.endpoint.as_ref().unwrap_or(&default_endpoint);

        let request_body = json!({
            "model": self.config.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4000,
            "stream": true
        });

        let response = self.client
            .post(endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
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
                format!("OpenAI API error {}: {}", status, error_text)
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
                                    if let Some(content) = json_value
                                        .get("choices")
                                        .and_then(|choices| choices.get(0))
                                        .and_then(|choice| choice.get("delta"))
                                        .and_then(|delta| delta.get("content"))
                                        .and_then(|content| content.as_str()) {
                                        return Ok(Some(content.to_string()));
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
            "gpt-4o".to_string(),
            "gpt-4o-mini".to_string(),
            "gpt-4".to_string(),
        ]
    }
}
