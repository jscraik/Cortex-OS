//! Comprehensive TDD tests for provider system following codex-rs patterns
//!
//! Tests provider trait, registry behavior, streaming events, and request builders.

use async_trait::async_trait;
use codex_core::error::Result;
use codex_core::providers::traits::{StreamAssembler, provider_error_event, response_to_stream};
use codex_core::providers::{
    BoxStream, CompletionRequest, CompletionResponse, Message, ModelProvider, ProviderError,
    ProviderRegistry, StreamEvent, StreamResult, Usage,
};
use futures::{StreamExt, stream};
use std::sync::Arc;

/// Mock Provider (kept minimal, no network). Mirrors current trait surface.
struct MockProvider {
    name: String,
    models: Vec<String>,
    fail: bool,
    streaming: bool,
}

impl MockProvider {
    fn new(name: &str) -> Self {
        Self {
            name: name.into(),
            models: vec!["test-model".into()],
            fail: false,
            streaming: true,
        }
    }
    fn with_models(mut self, models: Vec<&str>) -> Self {
        self.models = models.into_iter().map(|s| s.to_string()).collect();
        self
    }
    fn failing(mut self) -> Self {
        self.fail = true;
        self
    }
    fn no_stream(mut self) -> Self {
        self.streaming = false;
        self
    }
}

#[async_trait]
impl ModelProvider for MockProvider {
    fn name(&self) -> &str {
        &self.name
    }
    fn display_name(&self) -> &str {
        &self.name
    }
    fn supports_streaming(&self) -> bool {
        self.streaming
    }

    async fn available_models(&self) -> Result<Vec<String>> {
        if self.fail {
            return Err(ProviderError::Network {
                message: "fail list".into(),
            }
            .into());
        }
        Ok(self.models.clone())
    }

    async fn complete(&self, req: &CompletionRequest) -> Result<CompletionResponse> {
        if self.fail {
            return Err(ProviderError::Network {
                message: "fail complete".into(),
            }
            .into());
        }
        Ok(CompletionResponse {
            content: format!(
                "RESP:{}",
                req.messages
                    .first()
                    .map(|m| &m.content)
                    .unwrap_or(&"".into())
            ),
            model: req.model.clone(),
            usage: Usage {
                prompt_tokens: 5,
                completion_tokens: 3,
                total_tokens: 8,
            },
            finish_reason: Some("stop".into()),
        })
    }

    async fn complete_streaming(
        &self,
        req: &CompletionRequest,
    ) -> Result<BoxStream<'static, StreamResult>> {
        if self.fail {
            return Err(ProviderError::Network {
                message: "fail stream".into(),
            }
            .into());
        }
        if !self.streaming {
            // fallback emulate non-streaming
            let full = self.complete(req).await?;
            return Ok(response_to_stream(full));
        }
        let base = req
            .messages
            .first()
            .map(|m| m.content.clone())
            .unwrap_or_default();
        let events = vec![
            Ok(StreamEvent::Token {
                text: base.clone(),
                index: 0,
            }),
            Ok(StreamEvent::Token {
                text: " ++".into(),
                index: 1,
            }),
            Ok(StreamEvent::Finished {
                full: format!("{} ++", base),
                usage: Some(Usage {
                    prompt_tokens: 2,
                    completion_tokens: 2,
                    total_tokens: 4,
                }),
            }),
        ];
        Ok(Box::pin(stream::iter(events)))
    }

    async fn validate_config(&self) -> Result<()> {
        if self.fail {
            Err(ProviderError::AuthMissing.into())
        } else {
            Ok(())
        }
    }
}

// ----------------------------------------------------------------------------------
// Trait + basic operations
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn trait_basic_operations() {
    let p = MockProvider::new("mp");
    assert_eq!(p.name(), "mp");
    assert!(p.supports_streaming());
    let models = p.available_models().await.unwrap();
    assert_eq!(models, vec!["test-model"]);

    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "Hello".into(),
        }],
        "test-model",
    )
    .with_temperature(0.5)
    .with_max_tokens(64);
    let resp = p.complete(&req).await.unwrap();
    assert!(resp.content.starts_with("RESP:Hello"));
    assert_eq!(resp.model, "test-model");
    assert_eq!(resp.usage.total_tokens, 8);
    assert!(p.validate_config().await.is_ok());
}

// ----------------------------------------------------------------------------------
// Streaming behavior
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn streaming_happy_path() {
    let p = MockProvider::new("streamer");
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "Chunk".into(),
        }],
        "test-model",
    );
    let mut s = p.complete_streaming(&req).await.unwrap();
    let mut collected = vec![];
    while let Some(evt) = s.next().await {
        collected.push(evt.unwrap());
    }
    assert_eq!(collected.len(), 3);
    matches!(collected[0], StreamEvent::Token { .. });
    matches!(collected[1], StreamEvent::Token { .. });
    if let StreamEvent::Finished {
        ref full,
        usage: Some(ref u),
    } = collected[2]
    {
        assert_eq!(full, "Chunk ++");
        assert_eq!(u.total_tokens, 4);
    } else {
        panic!("Expected Finished event");
    }
}

#[tokio::test]
async fn streaming_fallback_non_streaming_provider() {
    let p = MockProvider::new("nostream").no_stream();
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "Hi".into(),
        }],
        "test-model",
    );
    let mut s = p.complete_streaming(&req).await.unwrap();
    let evts: Vec<_> = s
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();
    // Fallback returns token + finished
    assert_eq!(evts.len(), 2);
    assert!(matches!(evts[0], StreamEvent::Token { .. }));
    assert!(matches!(evts[1], StreamEvent::Finished { .. }));
}

// ----------------------------------------------------------------------------------
// Error handling paths
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn error_paths() {
    let p = MockProvider::new("failer").failing();
    let req = CompletionRequest::new(
        vec![Message {
            role: "user".into(),
            content: "X".into(),
        }],
        "test-model",
    );
    assert!(p.available_models().await.is_err());
    assert!(p.complete(&req).await.is_err());
    assert!(p.complete_streaming(&req).await.is_err());
    assert!(p.validate_config().await.is_err());
}

// ----------------------------------------------------------------------------------
// Registry behavior
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn registry_basic() {
    let mut reg = ProviderRegistry::new();
    let a = Arc::new(MockProvider::new("a"));
    let b = Arc::new(MockProvider::new("b"));
    reg.register_arc(a.clone());
    reg.register_arc(b.clone());
    let list = reg.list_providers();
    eprintln!("DEBUG providers list: {:?}", list);
    assert_eq!(list.len(), 2, "providers list = {:?}", list);
    assert!(list.contains(&"a".into()));
    assert!(list.contains(&"b".into()));
    assert!(
        reg.get("a").is_some(),
        "expected provider 'a' accessible via get()"
    );
    assert!(
        reg.get_arc("a").is_some(),
        "expected provider 'a' accessible via get_arc()"
    );
    reg.set_default("a".into()).unwrap();
    assert_eq!(reg.get_default().unwrap().name(), "a");
    // Remove provider 'a' (should remove arc entry and clear default)
    let removed = reg.remove("a");
    assert!(
        removed.is_some(),
        "Arc-based removal should return the removed provider"
    );
    assert!(reg.get("a").is_none(), "provider 'a' should be removed");
    assert!(
        reg.get_arc("a").is_none(),
        "provider 'a' arc should be removed"
    );
    assert!(
        reg.get_default().is_none(),
        "default should be cleared when removed"
    );
    let post_list = reg.list_providers();
    assert!(
        !post_list.contains(&"a".into()),
        "'a' should no longer be listed: {:?}",
        post_list
    );
    assert!(
        post_list.contains(&"b".into()),
        "'b' should remain registered"
    );
}

#[tokio::test]
async fn registry_remove_boxed() {
    let mut reg = ProviderRegistry::new();
    // Register Arc-based provider (new unified approach)
    let provider = Arc::new(MockProvider::new("c"));
    reg.register_arc(provider);
    assert!(reg.has_provider("c"));
    let removed = reg.remove("c");
    assert!(removed.is_some());
    assert!(!reg.has_provider("c"));
}

// ----------------------------------------------------------------------------------
// StreamEvent variant integrity
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn stream_event_variants() {
    let t = StreamEvent::Token {
        text: "hello".into(),
        index: 0,
    };
    if let StreamEvent::Token { text, index } = t {
        assert_eq!(text, "hello");
        assert_eq!(index, 0);
    } else {
        panic!();
    }
    let sys = StreamEvent::System("meta".into());
    matches!(sys, StreamEvent::System(_));
    let fin = StreamEvent::Finished {
        full: "done".into(),
        usage: Some(Usage {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
        }),
    };
    if let StreamEvent::Finished {
        full,
        usage: Some(u),
    } = fin
    {
        assert_eq!(full, "done");
        assert_eq!(u.total_tokens, 2);
    } else {
        panic!();
    }
    let err = StreamEvent::Error("e".into());
    matches!(err, StreamEvent::Error(_));
    let hb = StreamEvent::Heartbeat;
    matches!(hb, StreamEvent::Heartbeat);
}

// ----------------------------------------------------------------------------------
// CompletionRequest builder utilities
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn completion_request_builder() {
    let messages = vec![Message {
        role: "user".into(),
        content: "Hi".into(),
    }];
    let base = CompletionRequest::new(messages.clone(), "m1");
    assert!(base.temperature.is_none());
    let tuned = base.clone().with_temperature(0.6).with_max_tokens(128);
    assert_eq!(tuned.temperature, Some(0.6));
    assert_eq!(tuned.max_tokens, Some(128));
    assert_eq!(tuned.messages.len(), 1);
}

// ----------------------------------------------------------------------------------
// StreamAssembler & helper utilities
// ----------------------------------------------------------------------------------
#[tokio::test]
async fn stream_assembler_and_helpers() {
    // Helpers already imported from traits at top
    let mut asm = StreamAssembler::new();
    assert_eq!(asm.partial(), "");
    // ingest token
    asm.ingest(&StreamEvent::Token {
        text: "Hello".into(),
        index: 0,
    });
    assert_eq!(asm.partial(), "Hello");
    // ingest finished
    let finished_resp = asm.ingest(&StreamEvent::Finished {
        full: "Hello".into(),
        usage: Some(Usage {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
        }),
    });
    assert!(finished_resp.is_some());
    let comp = finished_resp.unwrap();
    assert_eq!(comp.content, "Hello");
    assert_eq!(comp.usage.total_tokens, 2);

    // test response_to_stream helper for non-streaming providers
    let resp = CompletionResponse {
        content: "OneShot".into(),
        model: "m".into(),
        usage: Usage {
            prompt_tokens: 1,
            completion_tokens: 1,
            total_tokens: 2,
        },
        finish_reason: Some("stop".into()),
    };
    let mut helper_stream = response_to_stream(resp);
    let collected: Vec<_> = helper_stream
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();
    assert_eq!(collected.len(), 2);
    assert!(matches!(collected[0], StreamEvent::Token { .. }));
    assert!(matches!(collected[1], StreamEvent::Finished { .. }));

    // provider_error_event returns an Error variant wrapped in Ok
    let err_evt = provider_error_event(ProviderError::Timeout).unwrap();
    if let StreamEvent::Error(msg) = err_evt {
        assert!(msg.contains("timeout") || msg.contains("Timeout"));
    } else {
        panic!("Expected error event");
    }
}
