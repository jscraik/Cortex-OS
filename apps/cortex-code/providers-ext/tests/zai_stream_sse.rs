use codex_core::providers::traits::{CompletionRequest, Message, ModelProvider, StreamEvent};
use codex_providers_ext::providers::zai::ZaiProvider;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

// A minimal SSE stream emulating Z.ai (Anthropic-compatible) events
const SSE_BODY: &str = r#"id: evt_1
event: message_start
data: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant"}}

id: evt_2
event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

id: evt_3
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

id: evt_4
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}

id: evt_5
event: content_block_stop
data: {"type":"content_block_stop","index":0}

id: evt_6
event: message_stop
data: {"type":"message_stop"}

"#;

#[tokio::test]
async fn zai_streaming_emits_tokens_and_finished() {
    let server = MockServer::start().await;
    let stream_resp = ResponseTemplate::new(200)
        .insert_header("Content-Type", "text/event-stream")
        .set_body_string(SSE_BODY);
    Mock::given(method("POST"))
        .and(path("/v1/messages"))
        .respond_with(stream_resp)
        .mount(&server)
        .await;

    // Point provider at mock base URL
    unsafe {
        std::env::set_var("ZAI_BASE_URL", server.uri());
        std::env::set_var("ZAI_API_KEY", "test-key");
    }

    let provider = ZaiProvider::new();
    let req = CompletionRequest::new(
        vec![Message { role: "user".into(), content: "Hi".into() }],
        "glm-4-long",
    );
    let mut stream = provider.complete_streaming(&req).await.unwrap();

    let mut tokens = String::new();
    let mut saw_finished = false;
    use futures::StreamExt;
    while let Some(evt) = stream.next().await {
        match evt.unwrap() {
            StreamEvent::Token { text, .. } => tokens.push_str(&text),
            StreamEvent::Finished { .. } => saw_finished = true,
            _ => {}
        }
    }
    assert_eq!(tokens, "Hello world");
    assert!(saw_finished);
}
