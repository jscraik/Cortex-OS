use codex_core::config::{Config, ConfigOverrides, ConfigToml};
use codex_core::config_types::Verbosity;
use codex_core::protocol::AskForApproval;
use codex_core::ModelClient;
use codex_protocol::config_types::{ReasoningEffort, ReasoningSummary};
use codex_protocol::models::{ContentItem, ResponseItem};
use tempfile::TempDir;
use std::sync::Arc;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};
use uuid::Uuid;

#[tokio::test]
async fn captures_posted_payload_and_validates_reasoning_and_text() {
    let server = MockServer::start().await;
    // Minimal SSE stream with a single response.completed event
    let sse = concat!(
        "event: response.completed\n",
        "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"r\",\"usage\":{\"input_tokens\":0,\"output_tokens\":0,\"total_tokens\":0}}}\n\n",
    );
    Mock::given(method("POST")).and(path("/v1/responses"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-type", "text/event-stream")
                .set_body_raw(sse, "text/event-stream"),
        )
        .expect(1)
        .mount(&server)
        .await;

    // Build a config that points openai base_url to our server
    let toml_raw = format!(
        r#"
model = "gpt-5"
approval_policy = "{}"

[model_providers.openai]
name = "OpenAI"
base_url = "{}/v1"
"#,
        AskForApproval::Never,
        server.uri()
    );
    let cfg_toml: ConfigToml = toml::from_str(&toml_raw).expect("toml");
    let codex_home = TempDir::new().unwrap();
    // Ensure built-in openai provider points to our mock server
    unsafe { std::env::set_var("OPENAI_BASE_URL", format!("{}/v1", server.uri())); }
    let overrides = ConfigOverrides {
        cwd: Some(std::env::current_dir().unwrap()),
        model_reasoning_effort: Some(ReasoningEffort::High),
        model_reasoning_summary: Some(ReasoningSummary::Concise),
        model_verbosity: Some(Verbosity::High),
        ..Default::default()
    };
    let config = Config::load_from_base_config_with_overrides(
        cfg_toml,
        overrides,
        codex_home.path().to_path_buf(),
    )
    .expect("config");
    // Clean up the env var to avoid cross-test interference
    unsafe { std::env::remove_var("OPENAI_BASE_URL"); }

    // Build client & prompt
    let auth_manager = None;
    let provider = config.model_provider.clone();
    let client = ModelClient::new(
        Arc::new(config.clone()),
        auth_manager,
        provider,
        config.model_reasoning_effort,
        config.model_reasoning_summary,
        Uuid::new_v4(),
    );

    let prompt = {
        let mut p = codex_core::Prompt::default();
        p.input.push(ResponseItem::Message {
            id: None,
            role: "user".to_string(),
            content: vec![ContentItem::InputText { text: "hi".to_string() }],
        });
        p
    };

    let mut stream = client.stream(&prompt).await.expect("stream");
    // Drain stream to completion to ensure request fully processed
    use futures::StreamExt;
    while let Some(_ev) = stream.next().await {
        // ignore events
    }

    // Validate captured POST body
    let reqs = server.received_requests().await.expect("requests");
    let body = String::from_utf8(reqs[0].body.clone()).expect("utf8 body");
    let v: serde_json::Value = serde_json::from_str(&body).expect("json body");
    // Reasoning present and matches overrides
    assert_eq!(
        v.get("reasoning").and_then(|r| r.get("effort")).and_then(|s| s.as_str()),
        Some("high")
    );
    assert_eq!(
        v.get("reasoning").and_then(|r| r.get("summary")).and_then(|s| s.as_str()),
        Some("concise")
    );
    // Text verbosity present for gpt-5
    assert_eq!(
        v.get("text").and_then(|t| t.get("verbosity")).and_then(|s| s.as_str()),
        Some("high")
    );
}
