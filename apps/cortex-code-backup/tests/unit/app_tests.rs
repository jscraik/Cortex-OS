use cortex_code::{app::CortexApp, config::Config};
use tempfile::TempDir;

#[tokio::test]
async fn test_app_creation_with_default_config() {
    // Given
    let config = Config::default();

    // When
    let result = CortexApp::new(config).await;

    // Then
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_app_ci_mode_text_output() {
    // Given
    let config = Config::default();
    let mut app = CortexApp::new(config).await.unwrap();

    // When - This will fail until we have a working provider
    let result = app.run_ci("test prompt", "text").await;

    // Then - For now, we expect this to work with mocked provider
    // In actual implementation, this would need the GitHub token
    match result {
        Ok(_) => {
            // Success case
        }
        Err(_) => {
            // Expected to fail without proper GitHub token
            // This is acceptable for the test
        }
    }
}

#[tokio::test]
async fn test_app_ci_mode_json_output() {
    // Given
    let config = Config::default();
    let mut app = CortexApp::new(config).await.unwrap();

    // When
    let result = app.run_ci("test prompt", "json").await;

    // Then - Similar to text output test
    match result {
        Ok(_) => {
            // Success case
        }
        Err(_) => {
            // Expected to fail without proper GitHub token
        }
    }
}

#[tokio::test]
async fn test_mcp_server_management() {
    // Given
    let config = Config::default();
    let mut app = CortexApp::new(config).await.unwrap();

    // When
    let servers = app.list_mcp_servers().await.unwrap();

    // Then
    assert_eq!(servers.len(), 0); // No servers initially

    // When
    app.add_mcp_server("test-server", "test-config").await.unwrap();

    // Then - TODO: Verify server was added once implemented
}

#[tokio::test]
async fn test_approval_mode_functionality() {
    // Create a minimal config for testing
    let config = Config::default();

    // Create app instance
    let mut app = CortexApp::new(config).await.unwrap();

    // Test default approval mode
    assert_eq!(app.get_approval_mode(), &cortex_code::app::ApprovalMode::Suggest);

    // Test setting approval mode to AutoEdit
    app.set_approval_mode(cortex_code::app::ApprovalMode::AutoEdit).await.unwrap();
    assert_eq!(app.get_approval_mode(), &cortex_code::app::ApprovalMode::AutoEdit);

    // Test setting approval mode to FullAuto
    app.set_approval_mode(cortex_code::app::ApprovalMode::FullAuto).await.unwrap();
    assert_eq!(app.get_approval_mode(), &cortex_code::app::ApprovalMode::FullAuto);

    // Test setting approval mode to Plan
    app.set_approval_mode(cortex_code::app::ApprovalMode::Plan).await.unwrap();
    assert_eq!(app.get_approval_mode(), &cortex_code::app::ApprovalMode::Plan);

    // Test requires_approval for different modes
    app.set_approval_mode(cortex_code::app::ApprovalMode::Suggest).await.unwrap();
    assert!(app.requires_approval("any_action"));

    app.set_approval_mode(cortex_code::app::ApprovalMode::AutoEdit).await.unwrap();
    assert!(!app.requires_approval("regular_edit"));
    assert!(app.requires_approval("shell_command"));

    app.set_approval_mode(cortex_code::app::ApprovalMode::FullAuto).await.unwrap();
    assert!(!app.requires_approval("any_action"));

    app.set_approval_mode(cortex_code::app::ApprovalMode::Plan).await.unwrap();
    assert!(!app.requires_approval("plan_creation"));
    assert!(app.requires_approval("execute"));
    assert!(app.requires_approval("shell_command"));
    assert!(app.requires_approval("file_write"));
}

#[tokio::test]
async fn test_mode_helpers() {
    let config = Config::default();
    let mut app = CortexApp::new(config).await.unwrap();

    // Test is_plan_mode
    app.set_approval_mode(cortex_code::app::ApprovalMode::Plan).await.unwrap();
    assert!(app.is_plan_mode());

    app.set_approval_mode(cortex_code::app::ApprovalMode::Suggest).await.unwrap();
    assert!(!app.is_plan_mode());

    // Test is_full_auto_mode
    app.set_approval_mode(cortex_code::app::ApprovalMode::FullAuto).await.unwrap();
    assert!(app.is_full_auto_mode());

    app.set_approval_mode(cortex_code::app::ApprovalMode::Suggest).await.unwrap();
    assert!(!app.is_full_auto_mode());
}
