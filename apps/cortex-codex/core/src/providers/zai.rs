//! Z.ai provider wrapper (reuses Anthropic-style messages semantics).
//!
//! For now this is a thin variant pointing at an alternate base URL and API
//! key environment variable (`ZAI_API_KEY`). Real divergences (model list,
//! streaming differences) can be introduced later behind the same trait.

use async_trait::async_trait;
use reqwest::Client;
use crate::error::Result;
use super::traits::{ModelProvider, CompletionRequest, CompletionResponse, BoxStream, StreamResult, response_to_stream};
use super::ProviderError;
use serde::{Deserialize, Serialize};

const ZAI_BASE: &str = "https://api.zai.example.com/v1"; // placeholder

pub struct ZaiProvider {
    client: Client,
    api_key: Option<String>,
}

impl ZaiProvider {
    pub fn new() -> Self { Self { client: Client::new(), api_key: std::env::var("ZAI_API_KEY").ok() } }
    fn key(&self) -> Result<&str> { self.api_key.as_deref().ok_or_else(|| ProviderError::AuthMissing.into()) }
}

#[derive(Debug, Serialize)]
struct MsgInput<'a> {
    model: &'a str,
    messages: &'a [super::traits::Message],
    #[serde(skip_serializing_if = "Option::is_none")] temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")] max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct MsgChoice { message: super::traits::Message, finish_reason: Option<String> }

#[derive(Debug, Deserialize)]
struct MsgResponse { choices: Vec<MsgChoice>, model: String }

#[async_trait]
impl ModelProvider for ZaiProvider {
    fn name(&self) -> &str { "zai" }
    fn display_name(&self) -> &str { "Z.ai" }
    async fn available_models(&self) -> Result<Vec<String>> { Ok(vec!["zai-sonnet".into()]) }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        let key = self.key()?;
        let url = format!("{}/chat/completions", ZAI_BASE);
        let payload = MsgInput { model: &req.model, messages: &req.messages, temperature: req.temperature, max_tokens: req.max_tokens };
        let resp = self.client.post(&url).bearer_auth(key).json(&payload).send().await.map_err(ProviderError::from)?;
        if !resp.status().is_success() { return Err(ProviderError::Protocol { message: format!("status {}", resp.status()) }.into()); }
        let parsed: MsgResponse = resp.json().await.map_err(ProviderError::from)?;
        let choice = parsed.choices.into_iter().next().ok_or_else(|| ProviderError::Protocol { message: "no choices".into() })?;
        Ok(CompletionResponse { content: choice.message.content, model: parsed.model, usage: Default::default(), finish_reason: choice.finish_reason })
    }

    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>> {
        Ok(response_to_stream(self.complete(req).await?))
    }

    async fn validate_config(&self) -> Result<()> { if self.api_key.is_none() { return Err(ProviderError::AuthMissing.into()); } Ok(()) }
}
