//! OpenAI provider implementation (basic HTTP + SSE streaming).
//!
//! NOTE: This is a minimal pragmatic implementation focused on tasks 2.2 / 2.3.
//! It currently targets the Chat Completions style API. Advanced features like
//! tool calls, parallel function invocation, and structured responses can be
//! layered on later without breaking the trait contract.

use super::traits::{
    BoxStream, CompletionRequest, CompletionResponse, ModelProvider, StreamResult, Usage,
    response_to_stream,
};
use super::{ProviderError, sse_into_stream, start_sse};
use crate::error::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const OPENAI_BASE: &str = "https://api.openai.com/v1";

pub struct OpenAIProvider {
    client: Client,
    api_key: Option<String>,
}

impl OpenAIProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: std::env::var("OPENAI_API_KEY").ok(),
        }
    }

    fn key(&self) -> Result<&str> {
        self.api_key
            .as_deref()
            .ok_or_else(|| ProviderError::AuthMissing.into())
    }
}

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: &'a [super::traits::Message],
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: super::traits::Message,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
    usage: Option<ChatUsage>,
    model: String,
}

#[async_trait]
impl ModelProvider for OpenAIProvider {
    fn name(&self) -> &str {
        "openai"
    }
    fn display_name(&self) -> &str {
        "OpenAI"
    }
    async fn available_models(&self) -> Result<Vec<String>> {
        Ok(vec!["gpt-4.1".into(), "gpt-4o-mini".into()])
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        // If no key present, provide a deterministic echo-style fallback so
        // tests and local dev without secrets can still exercise the higher
        // level plumbing without real network I/O.
        if self.api_key.is_none() {
            let joined: String = req
                .messages
                .iter()
                .map(|m| m.content.clone())
                .collect::<Vec<_>>()
                .join(" ");
            return Ok(CompletionResponse {
                content: format!("[echo:fallback] {joined}"),
                model: req.model.clone(),
                usage: Usage {
                    prompt_tokens: joined.split_whitespace().count() as u32,
                    completion_tokens: 0,
                    total_tokens: joined.split_whitespace().count() as u32,
                },
                finish_reason: Some("stop".into()),
            });
        }
        let key = self.key()?;
        let url = format!("{}/chat/completions", OPENAI_BASE);
        let payload = ChatRequest {
            model: &req.model,
            messages: &req.messages,
            temperature: req.temperature,
            max_tokens: req.max_tokens,
            stream: None,
        };
        let resp = self
            .client
            .post(&url)
            .bearer_auth(key)
            .json(&payload)
            .send()
            .await
            .map_err(ProviderError::from)?;

        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("status {}", resp.status()),
            }
            .into());
        }

        let chat: ChatResponse = resp.json().await.map_err(ProviderError::from)?;
        let choice = chat
            .choices
            .into_iter()
            .next()
            .ok_or_else(|| ProviderError::Protocol {
                message: "no choices".into(),
            })?;
        let usage = chat
            .usage
            .map(|u| Usage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            })
            .unwrap_or_default();
        Ok(CompletionResponse {
            content: choice.message.content,
            model: chat.model,
            usage,
            finish_reason: choice.finish_reason,
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        // If no API key, fallback to non-streaming echo implemented above.
        if self.api_key.is_none() {
            return Ok(response_to_stream(self.complete(req).await?));
        }
        let key = self.key()?;
        let url = format!("{}/chat/completions", OPENAI_BASE);
        let payload = ChatRequest {
            model: &req.model,
            messages: &req.messages,
            temperature: req.temperature,
            max_tokens: req.max_tokens,
            stream: Some(true),
        };
        let body = serde_json::to_string(&payload).map_err(ProviderError::unknown)?;
        let resp = start_sse(super::streaming::SseConfig {
            url: &url,
            api_key: Some(key),
            json_body: Some(body),
        })
        .await?;
        Ok(sse_into_stream(resp))
    }

    async fn validate_config(&self) -> Result<()> {
        if self.api_key.is_none() {
            return Err(ProviderError::AuthMissing.into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    // NOTE: We keep a simple echo style test when no key is present to ensure
    // logic doesn't panic; real HTTP tests should be added with wiremock.
    #[tokio::test]
    async fn test_complete_without_key_fallback() {
        // Temporarily remove key for test isolation.
        unsafe {
            std::env::remove_var("OPENAI_API_KEY");
        }
        let provider = OpenAIProvider::new();
        let req = CompletionRequest::new(
            vec![super::super::traits::Message {
                role: "user".into(),
                content: "Hello".into(),
            }],
            "gpt-4.1",
        );
        let resp = provider.complete(&req).await.unwrap();
        assert!(resp.content.contains("Hello"));
    }
}
