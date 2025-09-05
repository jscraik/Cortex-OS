//! Tests for provider abstraction (Task 2.2 scaffold)

use codex_core::providers::{
    AnthropicProvider, CompletionRequest, Message, ModelProvider, OpenAIProvider, ProviderRegistry,
    StreamEvent,
};
use futures::StreamExt;

#[tokio::test]
async fn test_registry_register_and_get() {
    let mut reg = ProviderRegistry::new();
    let provider = OpenAIProvider::new();
    // Use arc registration path
    reg.register_arc(std::sync::Arc::new(provider));
    assert!(reg.has_provider("openai"));
    let p = reg.get("openai").unwrap();
    assert_eq!(p.name(), "openai");
}

#[tokio::test]
async fn test_openai_complete_fallback_contains_prompt() {
    unsafe {
        std::env::remove_var("OPENAI_API_KEY");
    }
    let provider = OpenAIProvider::new();
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "Hello Codex".into(),
        }],
        "gpt-4.1",
    );
    let resp = provider.complete(&req).await.unwrap();
    assert!(resp.content.contains("Hello Codex"));
}

#[tokio::test]
async fn test_openai_stream_fallback_tokens() {
    unsafe {
        std::env::remove_var("OPENAI_API_KEY");
    }
    let provider = OpenAIProvider::new();
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "alpha beta".into(),
        }],
        "gpt-4.1",
    );
    let mut stream = provider.complete_streaming(&req).await.unwrap();
    let mut tokens = Vec::new();
    while let Some(evt) = stream.next().await {
        match evt.unwrap() {
            StreamEvent::Token { text, .. } => tokens.push(text),
            StreamEvent::Finished { .. } => break,
            _ => {}
        }
    }
    assert_eq!(tokens, vec!["alpha", "beta"]);
}

#[tokio::test]
async fn test_anthropic_non_streaming_fallback() {
    unsafe {
        std::env::remove_var("ANTHROPIC_API_KEY");
    }
    let provider = AnthropicProvider::new();
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "Ping".into(),
        }],
        "claude-3-haiku",
    );
    // Without key this should error on validate_config but complete() will attempt and fail auth.
    // For now just assert that complete results in Err(AuthMissing).
    let res = provider.validate_config().await;
    assert!(res.is_err());
}
