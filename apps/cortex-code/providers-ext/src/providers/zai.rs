//! Z.ai provider extracted to providers-ext.

use codex_core::providers::errors::ProviderError;
use codex_core::providers::traits::{
    BoxStream, CompletionRequest, CompletionResponse, ModelProvider, StreamResult, Usage,
    response_to_stream,
};
use codex_core::error::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const ZAI_BASE: &str = "https://api.z.ai/api/anthropic";

#[async_trait]
impl ModelProvider for ZaiProvider {
    fn name(&self) -> &str { "zai" }
    fn display_name(&self) -> &str { "Z.ai" }
    async fn available_models(&self) -> Result<Vec<String>> { Ok(vec!["glm-4-long".into(), "glm-4-flash".into()]) }
    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        let key = self.key()?;
        let url = format!("{}/messages", ZAI_BASE);
        let msgs: Vec<AnthropicMessage> = req.messages.iter().map(|m| AnthropicMessage { role: m.role.as_str(), content: m.content.as_str() }).collect();
        let payload = MsgInput { model: &req.model, max_tokens: req.max_tokens.unwrap_or(512), messages: msgs, temperature: req.temperature };
        let resp = Client::new().post(&url).header("x-api-key", key).header("anthropic-version", "2023-06-01").json(&payload).send().await.map_err(ProviderError::from)?;
        if !resp.status().is_success() {
            return Err(ProviderError::Protocol { message: format!("status {}", resp.status()) }.into());
        }
        let msg: MsgResponse = resp.json().await.map_err(ProviderError::from)?;
        let content = msg.content.into_iter().map(|c| c.text).collect::<Vec<_>>().join("\n");
        let usage = msg.usage.map(|u| Usage { prompt_tokens: u.input_tokens, completion_tokens: u.output_tokens, total_tokens: u.input_tokens + u.output_tokens }).unwrap_or_default();
        Ok(CompletionResponse { content, model: msg.model, usage, finish_reason: msg.stop_reason })
    }
    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>> {
        let key = self.key()?;
        let url = format!("{}/messages", ZAI_BASE);
        let msgs: Vec<AnthropicMessage> = req.messages.iter().map(|m| AnthropicMessage { role: m.role.as_str(), content: m.content.as_str() }).collect();
        let payload = MsgInput { model: &req.model, max_tokens: req.max_tokens.unwrap_or(512), messages: msgs, temperature: req.temperature };
        let body = serde_json::to_string(&payload).map_err(ProviderError::unknown)?;
        let resp = Client::new().post(&url)
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .header("accept", "text/event-stream")
            .header("content-type", "application/json")
            .body(body)
            .send().await.map_err(ProviderError::from)?;
        if !resp.status().is_success() {
            return Err(ProviderError::Protocol { message: format!("status {}", resp.status()) }.into());
        }
        Ok(codex_core::providers::streaming::sse_into_stream(resp))
    }
    async fn validate_config(&self) -> Result<()> {
        if self.api_key.is_none() { return Err(ProviderError::AuthMissing.into()); }
        Ok(())
    }
}

pub struct ZaiProvider {
    client: Client,
    api_key: Option<String>,
}

impl ZaiProvider {
    pub fn new() -> Self {
        Self { client: Client::new(), api_key: std::env::var("ZAI_API_KEY").ok() }
    }
    fn key(&self) -> Result<&str> {
        self.api_key.as_deref().ok_or_else(|| ProviderError::AuthMissing.into())
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
struct MsgContentBlock { text: String }

#[derive(Debug, Deserialize)]
struct MsgResponse {
    content: Vec<MsgContentBlock>,
    model: String,
    #[serde(default)] stop_reason: Option<String>,
    #[serde(default)] usage: Option<AnthropicUsage>,
}

#[derive(Debug, Deserialize, Default)]
struct AnthropicUsage { input_tokens: u32, output_tokens: u32 }
