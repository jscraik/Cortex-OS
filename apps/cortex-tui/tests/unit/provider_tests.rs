use cortex_tui::config::Config;
use cortex_tui::providers::create_provider;
use cortex_tui::Error;
use futures::StreamExt;
use mockito::{Matcher, Server};

// RED - These tests will fail initially
#[tokio::test]
async fn test_provider_factory_creates_github_models() {
    // Given
    let mut config = Config::default();
    config.provider.default = "github-models".to_string();
    config.github_models.token = Some("test-token".to_string());

    // When
    let provider = create_provider(&config).unwrap();

    // Then
    assert_eq!(provider.provider_name(), "github-models");
}

#[tokio::test]
async fn test_provider_factory_creates_openai() {
    // Given
    let mut config = Config::default();
    config.provider.default = "openai".to_string();
    config.openai = Some(cortex_tui::config::OpenAIConfig {
        api_key: "test-key".to_string(),
        model: "gpt-4".to_string(),
        endpoint: None,
    });

    // When
    let provider = create_provider(&config).unwrap();

    // Then
    assert_eq!(provider.provider_name(), "openai");
}

#[tokio::test]
async fn test_provider_factory_fails_unknown_provider() {
    // Given
    let mut config = Config::default();
    config.provider.default = "unknown-provider".to_string();
    config.provider.fallback.clear();

    // When
    let result = create_provider(&config);

    // Then
    assert!(result.is_err());
    match result {
        Err(Error::Provider(cortex_tui::error::ProviderError::UnknownProvider(name))) => {
            assert_eq!(name, "unknown-provider");
        }
        _ => panic!("Expected ProviderError::UnknownProvider"),
    }
}

#[tokio::test]
async fn test_github_models_provider_complete() {
    // Given
    let mut server = Server::new();
    let _m = server
        .mock("POST", "/inference/chat/completions")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(r#"{"choices":[{"message":{"content":"Hello, world!"}}]}"#)
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = server.url();
    config.github_models.token = Some("test-token".to_string());
    config.provider.default = "github-models".to_string();

    let provider = create_provider(&config).unwrap();

    // When
    let response = provider.complete("Hello").await.unwrap();

    // Then
    assert_eq!(response, "Hello, world!");
}

#[tokio::test]
async fn test_github_models_provider_stream() {
    // Given
    let mut server = Server::new();
    let _m = server
        .mock("POST", "/inference/chat/completions")
        .with_status(200)
        .with_header("content-type", "text/event-stream")
        .with_body(
            r#"data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world!"}}]}
data: [DONE]
"#,
        )
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = server.url();
    config.github_models.token = Some("test-token".to_string());
    config.provider.default = "github-models".to_string();

    let provider = create_provider(&config).unwrap();

    // When
    let mut stream = provider.stream("Hello").await.unwrap();
    let mut result = String::new();
    while let Some(chunk) = stream.next().await {
        result.push_str(&chunk.unwrap());
    }

    // Then
    assert_eq!(result, "Hello world!");
}

#[tokio::test]
async fn test_provider_fallback_mechanism() {
    // Given
    let mut config = Config::default();
    config.provider.default = "openai".to_string();
    config.provider.fallback = vec!["github-models".to_string()];
    // Intentionally not providing OpenAI config to trigger fallback
    config.openai = None;
    config.github_models.token = Some("test-token".to_string());

    // When
    let provider = create_provider(&config).unwrap();

    // Then
    assert_eq!(provider.provider_name(), "github-models");
}

#[tokio::test]
async fn test_provider_handles_rate_limiting() {
    // Given
    let mut server = Server::new();
    let _m = server
        .mock("POST", "/inference/chat/completions")
        .with_status(429)
        .with_header("content-type", "application/json")
        .with_body(r#"{"error":{"message":"Rate limit exceeded"}}"#)
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = server.url();
    config.github_models.token = Some("test-token".to_string());
    config.provider.default = "github-models".to_string();

    let provider = create_provider(&config).unwrap();

    // When
    let result = provider.complete("Hello").await;

    // Then
    assert!(result.is_err());
    match result {
        Err(Error::Provider(cortex_tui::error::ProviderError::RateLimited)) => {}
        _ => panic!("Expected ProviderError::RateLimited"),
    }
}
