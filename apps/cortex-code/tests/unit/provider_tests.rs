use cortex_tui::config::Config;
use cortex_tui::providers::{create_provider, ModelProvider};
use cortex_tui::Error;
use mockito::{mock, Matcher, Mock};
use tokio_test;

// RED - These tests will fail initially
#[tokio::test]
async fn test_provider_factory_creates_github_models() {
    // Given
    let mut config = Config::default();
    config.provider.default = "github-models".to_string();

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

    // When
    let result = create_provider(&config);

    // Then
    assert!(result.is_err());
    match result.unwrap_err() {
        Error::Provider(cortex_tui::error::ProviderError::UnknownProvider(name)) => {
            assert_eq!(name, "unknown-provider");
        }
        _ => panic!("Expected ProviderError::UnknownProvider"),
    }
}

#[tokio::test]
async fn test_github_models_provider_complete() {
    // Given
    let _m = mock("POST", "/inference/chat/completions")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(r#"{"choices":[{"message":{"content":"Hello, world!"}}]}"#)
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = mockito::server_url();
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
    let _m = mock("POST", "/inference/chat/completions")
        .with_status(200)
        .with_header("content-type", "text/event-stream")
        .with_body("data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\" world!\"}}]}\n\ndata: [DONE]\n\n")
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = mockito::server_url();
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

    // When
    let provider = create_provider(&config).unwrap();

    // Then
    assert_eq!(provider.provider_name(), "github-models");
}

#[tokio::test]
async fn test_provider_handles_rate_limiting() {
    // Given
    let _m = mock("POST", "/inference/chat/completions")
        .with_status(429)
        .with_header("content-type", "application/json")
        .with_body(r#"{"error":{"message":"Rate limit exceeded"}}"#)
        .create();

    let mut config = Config::default();
    config.github_models.endpoint = mockito::server_url();
    config.provider.default = "github-models".to_string();

    let provider = create_provider(&config).unwrap();

    // When
    let result = provider.complete("Hello").await;

    // Then
    assert!(result.is_err());
    match result.unwrap_err() {
        Error::Provider(cortex_tui::error::ProviderError::RateLimited) => {
            // Expected
        }
        _ => panic!("Expected ProviderError::RateLimited"),
    }
}
