//! Approval mode tests adapted for current cortex-code structure
//!
//! Tests for approval mode functionality following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

use cortex_core::config::Config;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use tokio::test as tokio_test;

/// Approval mode for AI actions - simplified for testing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ApprovalMode {
    /// Apply edits automatically, require approval for shell commands (default)
    AutoEdit,
    /// Suggest edits, await user approval
    Suggest,
    /// Completely autonomous (sandboxed, network-disabled)
    FullAuto,
    /// Plan mode - generate a plan but don't execute
    Plan,
}

impl Default for ApprovalMode {
    fn default() -> Self {
        Self::Suggest
    }
}

/// Test app state for approval modes
#[derive(Debug, Clone)]
pub struct TestAppState {
    pub approval_mode: ApprovalMode,
    pub is_active: bool,
}

impl Default for TestAppState {
    fn default() -> Self {
        Self {
            approval_mode: ApprovalMode::default(),
            is_active: false,
        }
    }
}

/// Mock cortex app for testing approval modes
#[derive(Debug)]
pub struct MockCortexApp {
    config: Config,
    state: TestAppState,
}

impl MockCortexApp {
    pub async fn new(config: Config) -> Result<Self> {
        Ok(Self {
            config,
            state: TestAppState::default(),
        })
    }

    pub async fn set_approval_mode(&mut self, mode: ApprovalMode) -> Result<()> {
        self.state.approval_mode = mode;
        Ok(())
    }

    pub fn get_approval_mode(&self) -> &ApprovalMode {
        &self.state.approval_mode
    }

    pub fn requires_approval(&self, action_type: &str) -> bool {
        match self.state.approval_mode {
            ApprovalMode::Suggest => true,
            ApprovalMode::AutoEdit => action_type == "shell_command",
            ApprovalMode::FullAuto => false,
            ApprovalMode::Plan => {
                matches!(action_type, "execute" | "shell_command" | "file_write")
            }
        }
    }

    pub fn is_plan_mode(&self) -> bool {
        self.state.approval_mode == ApprovalMode::Plan
    }

    pub fn is_full_auto_mode(&self) -> bool {
        self.state.approval_mode == ApprovalMode::FullAuto
    }

    pub fn is_auto_edit_mode(&self) -> bool {
        self.state.approval_mode == ApprovalMode::AutoEdit
    }

    pub fn is_suggest_mode(&self) -> bool {
        self.state.approval_mode == ApprovalMode::Suggest
    }
}

/// Create test config for approval mode tests
pub fn create_approval_test_config() -> Config {
    // Use builder pattern or create minimal config for testing
    Config::default()
}

#[tokio_test]
async fn test_approval_mode_initialization() -> Result<()> {
    // Given
    let config = create_approval_test_config();

    // When
    let app = MockCortexApp::new(config).await?;

    // Then
    assert_eq!(app.get_approval_mode(), &ApprovalMode::Suggest);
    Ok(())
}

#[tokio_test]
async fn test_approval_mode_transitions() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;

    // When/Then - test all transitions
    app.set_approval_mode(ApprovalMode::AutoEdit).await?;
    assert_eq!(app.get_approval_mode(), &ApprovalMode::AutoEdit);

    app.set_approval_mode(ApprovalMode::FullAuto).await?;
    assert_eq!(app.get_approval_mode(), &ApprovalMode::FullAuto);

    app.set_approval_mode(ApprovalMode::Plan).await?;
    assert_eq!(app.get_approval_mode(), &ApprovalMode::Plan);

    app.set_approval_mode(ApprovalMode::Suggest).await?;
    assert_eq!(app.get_approval_mode(), &ApprovalMode::Suggest);

    Ok(())
}

#[tokio_test]
async fn test_suggest_mode_approval_logic() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;
    app.set_approval_mode(ApprovalMode::Suggest).await?;

    // When/Then - all actions require approval in suggest mode
    assert!(app.requires_approval("file_write"));
    assert!(app.requires_approval("shell_command"));
    assert!(app.requires_approval("execute"));
    assert!(app.requires_approval("any_action"));

    Ok(())
}

#[tokio_test]
async fn test_auto_edit_mode_approval_logic() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;
    app.set_approval_mode(ApprovalMode::AutoEdit).await?;

    // When/Then - only shell commands require approval
    assert!(!app.requires_approval("file_write"));
    assert!(app.requires_approval("shell_command"));
    assert!(!app.requires_approval("regular_edit"));
    assert!(!app.requires_approval("text_modification"));

    Ok(())
}

#[tokio_test]
async fn test_full_auto_mode_approval_logic() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;
    app.set_approval_mode(ApprovalMode::FullAuto).await?;

    // When/Then - no actions require approval in full auto
    assert!(!app.requires_approval("file_write"));
    assert!(!app.requires_approval("shell_command"));
    assert!(!app.requires_approval("execute"));
    assert!(!app.requires_approval("any_action"));

    Ok(())
}

#[tokio_test]
async fn test_plan_mode_approval_logic() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;
    app.set_approval_mode(ApprovalMode::Plan).await?;

    // When/Then - execution actions require approval, planning doesn't
    assert!(!app.requires_approval("plan_creation"));
    assert!(!app.requires_approval("analysis"));
    assert!(app.requires_approval("execute"));
    assert!(app.requires_approval("shell_command"));
    assert!(app.requires_approval("file_write"));

    Ok(())
}

#[tokio_test]
async fn test_mode_helper_methods() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;

    // When/Then - test plan mode helpers
    app.set_approval_mode(ApprovalMode::Plan).await?;
    assert!(app.is_plan_mode());
    assert!(!app.is_full_auto_mode());
    assert!(!app.is_auto_edit_mode());
    assert!(!app.is_suggest_mode());

    // When/Then - test full auto mode helpers
    app.set_approval_mode(ApprovalMode::FullAuto).await?;
    assert!(!app.is_plan_mode());
    assert!(app.is_full_auto_mode());
    assert!(!app.is_auto_edit_mode());
    assert!(!app.is_suggest_mode());

    // When/Then - test auto edit mode helpers
    app.set_approval_mode(ApprovalMode::AutoEdit).await?;
    assert!(!app.is_plan_mode());
    assert!(!app.is_full_auto_mode());
    assert!(app.is_auto_edit_mode());
    assert!(!app.is_suggest_mode());

    // When/Then - test suggest mode helpers
    app.set_approval_mode(ApprovalMode::Suggest).await?;
    assert!(!app.is_plan_mode());
    assert!(!app.is_full_auto_mode());
    assert!(!app.is_auto_edit_mode());
    assert!(app.is_suggest_mode());

    Ok(())
}

#[tokio_test]
async fn test_approval_mode_serialization() -> Result<()> {
    // Given
    let modes = vec![
        ApprovalMode::Suggest,
        ApprovalMode::AutoEdit,
        ApprovalMode::FullAuto,
        ApprovalMode::Plan,
    ];

    // When/Then - test serialization roundtrip
    for mode in modes {
        let serialized = serde_json::to_string(&mode)?;
        let deserialized: ApprovalMode = serde_json::from_str(&serialized)?;
        assert_eq!(mode, deserialized);
    }

    Ok(())
}

#[tokio_test]
async fn test_concurrent_mode_access() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let app = std::sync::Arc::new(
        tokio::sync::Mutex::new(MockCortexApp::new(config).await?)
    );

    let app1 = app.clone();
    let app2 = app.clone();

    // When - concurrent mode checking
    let (result1, result2) = tokio::join!(
        async move {
            let app = app1.lock().await;
            app.requires_approval("test_action")
        },
        async move {
            let app = app2.lock().await;
            app.get_approval_mode().clone()
        }
    );

    // Then
    assert!(result1); // Suggest mode requires approval for all actions
    assert_eq!(result2, ApprovalMode::Suggest);

    Ok(())
}

#[tokio_test]
async fn test_approval_edge_cases() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;

    // When/Then - test edge cases
    app.set_approval_mode(ApprovalMode::AutoEdit).await?;

    // Empty action string
    assert!(!app.requires_approval(""));

    // Unusual action types
    assert!(!app.requires_approval("unknown_action"));
    assert!(!app.requires_approval("UPPERCASE_ACTION"));
    assert!(!app.requires_approval("action_with_numbers_123"));

    // Case sensitivity
    assert!(!app.requires_approval("Shell_Command")); // Case sensitive
    assert!(app.requires_approval("shell_command"));

    Ok(())
}

#[tokio_test]
async fn test_approval_workflow_scenarios() -> Result<()> {
    // Given
    let config = create_approval_test_config();
    let mut app = MockCortexApp::new(config).await?;

    // Scenario 1: Development workflow (auto-edit)
    app.set_approval_mode(ApprovalMode::AutoEdit).await?;
    assert!(!app.requires_approval("file_write")); // Code edits are automatic
    assert!(app.requires_approval("shell_command")); // But shell needs approval

    // Scenario 2: Review workflow (suggest)
    app.set_approval_mode(ApprovalMode::Suggest).await?;
    assert!(app.requires_approval("file_write")); // Everything needs approval
    assert!(app.requires_approval("shell_command"));

    // Scenario 3: Planning workflow (plan)
    app.set_approval_mode(ApprovalMode::Plan).await?;
    assert!(!app.requires_approval("plan_creation")); // Planning is automatic
    assert!(app.requires_approval("execute")); // Execution needs approval

    // Scenario 4: Autonomous workflow (full-auto)
    app.set_approval_mode(ApprovalMode::FullAuto).await?;
    assert!(!app.requires_approval("file_write")); // Everything is automatic
    assert!(!app.requires_approval("shell_command")); // Even shell commands

    Ok(())
}
