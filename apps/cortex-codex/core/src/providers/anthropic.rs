//! Anthropic provider (Claude) minimal implementation.
//!
//! Uses the Messages API (v1) for non-streaming completions. Streaming will be
//! added later; currently it falls back to converting the full response into a
//! synthetic stream for compatibility with the trait.

use super::ProviderError;
use super::traits::{
    BoxStream, CompletionRequest, CompletionResponse, ModelProvider, StreamResult, Usage,
    response_to_stream,
};
use crate::error::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const ANTHROPIC_BASE: &str = "https://api.anthropic.com/v1";

pub struct AnthropicProvider {
    client: Client,
    api_key: Option<String>,
}

impl AnthropicProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: std::env::var("ANTHROPIC_API_KEY").ok(),
        }
    }
    fn key(&self) -> Result<&str> {
        self.api_key
            .as_deref()
            .ok_or_else(|| ProviderError::AuthMissing.into())
    }
}

#[derive(Debug, Serialize)]
struct MsgInput<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: Vec<AnthropicMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Serialize)]
struct AnthropicMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct MsgContentBlock {
    text: String,
}

#[derive(Debug, Deserialize)]
struct MsgResponse {
    content: Vec<MsgContentBlock>,
    model: String,
    #[serde(default)]
    stop_reason: Option<String>,
    #[serde(default)]
    usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize, Default)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[async_trait]
impl ModelProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }
    fn display_name(&self) -> &str {
        "Anthropic"
    }
    async fn available_models(&self) -> Result<Vec<String>> {
        Ok(vec!["claude-3-5-sonnet".into(), "claude-3-haiku".into()])
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        let key = self.key()?;
        let url = format!("{}/messages", ANTHROPIC_BASE);
        let msgs: Vec<AnthropicMessage> = req
            .messages
            .iter()
            .map(|m| AnthropicMessage {
                role: m.role.as_str(),
                content: m.content.as_str(),
            })
            .collect();
        let payload = MsgInput {
            model: &req.model,
            // Provide a default; Anthropic requires explicit max_tokens output.
            max_tokens: req.max_tokens.unwrap_or(512),
            messages: msgs,
            temperature: req.temperature,
        };
        let resp = self
            .client
            .post(&url)
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
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
        let msg: MsgResponse = resp.json().await.map_err(ProviderError::from)?;
        let content = msg
            .content
            .into_iter()
            .map(|c| c.text)
            .collect::<Vec<_>>()
            .join("\n");
        let usage = msg
            .usage
            .map(|u| Usage {
                prompt_tokens: u.input_tokens,
                completion_tokens: u.output_tokens,
                total_tokens: u.input_tokens + u.output_tokens,
            })
            .unwrap_or_default();
        Ok(CompletionResponse {
            content,
            model: msg.model,
            usage,
            finish_reason: msg.stop_reason,
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        let key = self.key()?;
        let url = format!("{}/messages", ANTHROPIC_BASE);
        let msgs: Vec<AnthropicMessage> = req
            .messages
            .iter()
            .map(|m| AnthropicMessage {
                role: m.role.as_str(),
                content: m.content.as_str(),
            })
            .collect();
        let payload = MsgInput {
            model: &req.model,
            max_tokens: req.max_tokens.unwrap_or(512),
            messages: msgs,
            temperature: req.temperature,
        };
        let body = serde_json::to_string(&payload).map_err(ProviderError::unknown)?;
        let resp = self
            .client
            .post(&url)
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .header("accept", "text/event-stream")
            .header("content-type", "application/json")
            .body(body)
            .send()
            .await
            .map_err(ProviderError::from)?;
        if !resp.status().is_success() {
            return Err(ProviderError::Protocol {
                message: format!("status {}", resp.status()),
            }
            .into());
        }
        Ok(super::streaming::sse_into_stream(resp))
    }

    async fn validate_config(&self) -> Result<()> {
        if self.api_key.is_none() {
            return Err(ProviderError::AuthMissing.into());
        }
        Ok(())
    }
}
