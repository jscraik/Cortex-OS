use codex_core::ModelProvider;
use codex_core::ModelProviderInfo;
use codex_core::WireApi;
use pretty_assertions::assert_eq;

#[tokio::test]
async fn creates_request_builder_with_env_api_key() {
    std::env::set_var("TEST_KEY", "secret");
    let provider = ModelProviderInfo {
        name: "Mock".into(),
        base_url: Some("http://example.com".into()),
        env_key: Some("TEST_KEY".into()),
        env_key_instructions: None,
        wire_api: WireApi::Chat,
        query_params: None,
        http_headers: None,
        env_http_headers: None,
        request_max_retries: None,
        stream_max_retries: None,
        stream_idle_timeout_ms: None,
        requires_openai_auth: false,
    };
    let client = reqwest::Client::new();
    let prov: &dyn ModelProvider = &provider;
    let builder = prov.create_request_builder(&client, &None).await.unwrap();
    let request = builder.build().unwrap();
    assert_eq!(
        request.headers().get("authorization").unwrap(),
        "Bearer secret"
    );
}
