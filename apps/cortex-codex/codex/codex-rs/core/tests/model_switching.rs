use codex_core::ModelProviderInfo;
use codex_core::ProviderRegistry;
use codex_core::WireApi;
use pretty_assertions::assert_eq;

#[test]
fn switches_between_providers() {
    let mut registry = ProviderRegistry::new();
    registry.insert(
        "one".to_string(),
        Box::new(ModelProviderInfo {
            name: "One".into(),
            base_url: Some("http://one".into()),
            env_key: None,
            env_key_instructions: None,
            wire_api: WireApi::Chat,
            query_params: None,
            http_headers: None,
            env_http_headers: None,
            request_max_retries: None,
            stream_max_retries: None,
            stream_idle_timeout_ms: None,
            requires_openai_auth: false,
        }),
    );
    registry.insert(
        "two".to_string(),
        Box::new(ModelProviderInfo {
            name: "Two".into(),
            base_url: Some("http://two".into()),
            env_key: None,
            env_key_instructions: None,
            wire_api: WireApi::Chat,
            query_params: None,
            http_headers: None,
            env_http_headers: None,
            request_max_retries: None,
            stream_max_retries: None,
            stream_idle_timeout_ms: None,
            requires_openai_auth: false,
        }),
    );
    let provider = registry.get("two").unwrap();
    assert_eq!(provider.info().name, "Two");
}
