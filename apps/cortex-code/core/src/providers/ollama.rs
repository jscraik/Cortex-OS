//! Ollama provider implementation for local models.
//!
//! This provider connects to a local Ollama instance to run open-source models
//! like Llama, CodeLlama, Mistral, etc. It supports both streaming and non-streaming
//! completions and automatically detects available models from the local instance.

use super::ProviderError;
use super::traits::{
    BoxStream, CompletionRequest, CompletionResponse, ModelProvider, StreamEvent, StreamResult,
    Usage, response_to_stream,
};
use crate::error::Result;
use async_trait::async_trait;
use futures::{StreamExt, TryStreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const DEFAULT_OLLAMA_BASE: &str = "http://localhost:11434";

pub struct OllamaProvider {
    client: Client,
    base_url: String,
}

impl OllamaProvider {
    pub fn new() -> Self {
        Self::with_base_url(
            std::env::var("OLLAMA_BASE_URL").unwrap_or_else(|_| DEFAULT_OLLAMA_BASE.to_string()),
        )
    }

    pub fn with_base_url(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(300)) // 5 minutes for model operations
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    async fn check_connection(&self) -> Result<()> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = self
            .client
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .map_err(|_| ProviderError::Network {
                message: "Could not connect to Ollama. Is it running? Try: ollama serve"
                    .to_string(),
            })?;

        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("Ollama server returned status: {}", resp.status()),
            }
            .into());
        }
        Ok(())
    }
}

#[derive(Debug, Serialize)]
struct OllamaRequest<'a> {
    model: &'a str,
    messages: &'a [super::traits::Message],
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>, // Ollama's equivalent to max_tokens
}

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: OllamaMessage,
    #[serde(default)]
    done: bool,
    #[serde(default)]
    total_duration: Option<u64>,
    #[serde(default)]
    load_duration: Option<u64>,
    #[serde(default)]
    prompt_eval_count: Option<u32>,
    #[serde(default)]
    eval_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    digest: Option<String>,
    #[serde(default)]
    details: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModel>,
}

#[async_trait]
impl ModelProvider for OllamaProvider {
    fn name(&self) -> &str {
        "ollama"
    }

    fn display_name(&self) -> &str {
        "Ollama (Local)"
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        self.check_connection().await?;

        let url = format!("{}/api/tags", self.base_url);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(ProviderError::from)?;

        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("Failed to fetch models: status {}", resp.status()),
            }
            .into());
        }

        let models_resp: OllamaModelsResponse = resp.json().await.map_err(ProviderError::from)?;
        Ok(models_resp.models.into_iter().map(|m| m.name).collect())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        self.check_connection().await?;

        let url = format!("{}/api/chat", self.base_url);
        let options = if req.temperature.is_some() || req.max_tokens.is_some() {
            Some(OllamaOptions {
                temperature: req.temperature,
                num_predict: req.max_tokens,
            })
        } else {
            None
        };

        let payload = OllamaRequest {
            model: &req.model,
            messages: &req.messages,
            stream: Some(false),
            options,
        };

        let resp = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(ProviderError::from)?;

        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("Ollama request failed: status {}", resp.status()),
            }
            .into());
        }

        let ollama_resp: OllamaResponse = resp.json().await.map_err(ProviderError::from)?;

        let usage = Usage {
            prompt_tokens: ollama_resp.prompt_eval_count.unwrap_or(0),
            completion_tokens: ollama_resp.eval_count.unwrap_or(0),
            total_tokens: ollama_resp.prompt_eval_count.unwrap_or(0)
                + ollama_resp.eval_count.unwrap_or(0),
        };

        Ok(CompletionResponse {
            content: ollama_resp.message.content,
            model: req.model.clone(),
            usage,
            finish_reason: if ollama_resp.done {
                Some("stop".into())
            } else {
                None
            },
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        self.check_connection().await?;

        let url = format!("{}/api/chat", self.base_url);
        let options = if req.temperature.is_some() || req.max_tokens.is_some() {
            Some(OllamaOptions {
                temperature: req.temperature,
                num_predict: req.max_tokens,
            })
        } else {
            None
        };

        let payload = OllamaRequest {
            model: &req.model,
            messages: &req.messages,
            stream: Some(true),
            options,
        };

        let resp = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(ProviderError::from)?;

        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("Ollama streaming request failed: status {}", resp.status()),
            }
            .into());
        }

        let stream = resp
            .bytes_stream()
            .map_err(|e| ProviderError::Network {
                message: e.to_string(),
            })
            .and_then(|chunk| async move {
                let text = String::from_utf8_lossy(&chunk);
                for line in text.lines() {
                    if line.trim().is_empty() {
                        continue;
                    }

                    match serde_json::from_str::<OllamaResponse>(line) {
                        Ok(ollama_resp) => {
                            if ollama_resp.done {
                                let usage = Usage {
                                    prompt_tokens: ollama_resp.prompt_eval_count.unwrap_or(0),
                                    completion_tokens: ollama_resp.eval_count.unwrap_or(0),
                                    total_tokens: ollama_resp.prompt_eval_count.unwrap_or(0)
                                        + ollama_resp.eval_count.unwrap_or(0),
                                };
                                return Ok(StreamEvent::Finished {
                                    full: ollama_resp.message.content,
                                    usage: Some(usage),
                                });
                            } else if !ollama_resp.message.content.is_empty() {
                                return Ok(StreamEvent::Token {
                                    text: ollama_resp.message.content,
                                    index: 0,
                                });
                            }
                        }
                        Err(e) => {
                            return Ok(StreamEvent::Error(format!(
                                "Failed to parse Ollama response: {}",
                                e
                            )));
                        }
                    }
                }
                Ok(StreamEvent::Heartbeat)
            })
            .map_err(Into::into) // Convert ProviderError to CodexErr
            .boxed();

        Ok(stream)
    }

    async fn validate_config(&self) -> Result<()> {
        self.check_connection().await?;

        // Try to fetch at least one model to verify Ollama is working
        let models = self.available_models().await?;
        if models.is_empty() {
            return Err(ProviderError::Protocol {
                message: "No models available in Ollama. Try: ollama pull llama2".to_string(),
            }
            .into());
        }

        Ok(())
    }
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::providers::traits::Message;

    #[tokio::test]
    async fn test_ollama_provider_creation() {
        let provider = OllamaProvider::new();
        assert_eq!(provider.name(), "ollama");
        assert_eq!(provider.display_name(), "Ollama (Local)");
        assert!(provider.supports_streaming());
    }

    #[tokio::test]
    async fn test_ollama_with_custom_url() {
        let provider = OllamaProvider::with_base_url("http://custom:11434".to_string());
        assert_eq!(provider.base_url, "http://custom:11434");
    }

    #[tokio::test]
    async fn test_completion_request_structure() {
        let provider = OllamaProvider::new();
        let req = CompletionRequest::new(
            vec![Message {
                role: "user".into(),
                content: "Hello".into(),
            }],
            "llama2",
        )
        .with_temperature(0.7)
        .with_max_tokens(100);

        // This test just verifies the request structure compiles
        assert_eq!(req.model, "llama2");
        assert_eq!(req.temperature, Some(0.7));
        assert_eq!(req.max_tokens, Some(100));
    }
}
