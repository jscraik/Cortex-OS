use cortex_code::app::{ApprovalMode, CortexApp};
use cortex_code::config::Config;

#[tokio::test]
async fn test_approval_mode_functionality() {
    // Create a minimal config for testing
    let config = Config::default();

    // Create app instance
    let mut app = CortexApp::new(config).await.unwrap();

    // Test default approval mode
    assert_eq!(app.get_approval_mode(), &ApprovalMode::Suggest);

    // Test setting approval mode to AutoEdit
    app.set_approval_mode(ApprovalMode::AutoEdit).await.unwrap();
    assert_eq!(app.get_approval_mode(), &ApprovalMode::AutoEdit);

    // Test setting approval mode to FullAuto
    app.set_approval_mode(ApprovalMode::FullAuto).await.unwrap();
    assert_eq!(app.get_approval_mode(), &ApprovalMode::FullAuto);

    // Test setting approval mode to Plan
    app.set_approval_mode(ApprovalMode::Plan).await.unwrap();
    assert_eq!(app.get_approval_mode(), &ApprovalMode::Plan);

    // Test requires_approval for different modes
    app.set_approval_mode(ApprovalMode::Suggest).await.unwrap();
    assert!(app.requires_approval("any_action"));

    app.set_approval_mode(ApprovalMode::AutoEdit).await.unwrap();
    assert!(!app.requires_approval("regular_edit"));
    assert!(app.requires_approval("shell_command"));

    app.set_approval_mode(ApprovalMode::FullAuto).await.unwrap();
    assert!(!app.requires_approval("any_action"));

    app.set_approval_mode(ApprovalMode::Plan).await.unwrap();
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
    app.set_approval_mode(ApprovalMode::Plan).await.unwrap();
    assert!(app.is_plan_mode());

    app.set_approval_mode(ApprovalMode::Suggest).await.unwrap();
    assert!(!app.is_plan_mode());

    // Test is_full_auto_mode
    app.set_approval_mode(ApprovalMode::FullAuto).await.unwrap();
    assert!(app.is_full_auto_mode());

    app.set_approval_mode(ApprovalMode::Suggest).await.unwrap();
    assert!(!app.is_full_auto_mode());
}
