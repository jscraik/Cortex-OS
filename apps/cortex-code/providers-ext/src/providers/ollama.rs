use codex_core::providers::errors::ProviderError;
use codex_core::providers::traits::{
    BoxStream, CompletionRequest, CompletionResponse, Message, ModelProvider, StreamEvent, StreamResult, Usage,
    response_to_stream,
};
use codex_core::error::Result;
use async_trait::async_trait;
use futures::{StreamExt, TryStreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct OllamaProvider { base_url: String }
impl OllamaProvider { pub fn new() -> Self { Self { base_url: "http://localhost:11434".into() } } }

#[async_trait]
impl ModelProvider for OllamaProvider {
    fn name(&self) -> &str { "ollama" }
    fn display_name(&self) -> &str { "Ollama" }
    async fn available_models(&self) -> Result<Vec<String>> { Ok(vec!["llama3.1".into()]) }
    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        Ok(CompletionResponse { content: "".into(), model: req.model.clone(), usage: Usage::default(), finish_reason: Some("stop".into()) })
    }
    async fn complete_streaming(&self, req: &CompletionRequest) -> Result<BoxStream<'static, StreamResult>> {
        Ok(response_to_stream(self.complete(req).await?))
    }
}
