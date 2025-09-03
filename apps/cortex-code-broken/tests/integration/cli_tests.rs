//! CLI integration tests
//!
//! Integration tests for cortex-code CLI interface following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

use assert_cmd::Command;
use predicates::prelude::*;
use anyhow::Result;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

/// CLI test helper with temporary workspace setup
pub struct CliTestHelper {
    temp_dir: TempDir,
    config_path: PathBuf,
    binary_name: String,
}

impl CliTestHelper {
    /// Create new CLI test helper with isolated environment
    pub fn new() -> Self {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("test_config.toml");

        // Create minimal test configuration
        let test_config = r#"
[model]
# Test configuration for cortex-code
provider = "mock"
model = "test-model"

[memory]
enabled = true
storage_path = "./test_memory"

[features]
enhanced_provider_support = true
rag_integration = true
a2a_pipeline_integration = true
ast_grep_integration = true

[providers.mock]
type = "mock"
api_key = "test-key-123"
base_url = "https://api.test.example.com"
model = "mock-model-v1"
max_tokens = 1000
temperature = 0.7
"#;

        fs::write(&config_path, test_config).expect("Failed to write test config");

        Self {
            temp_dir,
            config_path,
            binary_name: "cortex-code".to_string(),
        }
    }

    /// Create command with test configuration
    pub fn command(&self) -> Command {
        let mut cmd = Command::cargo_bin(&self.binary_name).unwrap();
        cmd.arg("--config").arg(&self.config_path);
        cmd.env("CORTEX_TEST_MODE", "true");
        cmd
    }

    /// Create test input file
    pub fn create_test_file(&self, name: &str, content: &str) -> PathBuf {
        let file_path = self.temp_dir.path().join(name);
        fs::write(&file_path, content).expect("Failed to write test file");
        file_path
    }

    /// Get temporary directory path
    pub fn temp_path(&self) -> &std::path::Path {
        self.temp_dir.path()
    }

    /// Create mock project structure
    pub fn create_mock_project(&self) -> PathBuf {
        let project_dir = self.temp_dir.path().join("mock_project");
        fs::create_dir_all(&project_dir).expect("Failed to create project dir");

        // Create basic Rust project structure
        let src_dir = project_dir.join("src");
        fs::create_dir_all(&src_dir).expect("Failed to create src dir");

        let main_rs = src_dir.join("main.rs");
        fs::write(&main_rs, r#"
fn main() {
    println!("Hello, World!");
}
"#).expect("Failed to write main.rs");

        let cargo_toml = project_dir.join("Cargo.toml");
        fs::write(&cargo_toml, r#"
[package]
name = "mock-project"
version = "0.1.0"
edition = "2021"

[dependencies]
"#).expect("Failed to write Cargo.toml");

        project_dir
    }
}

#[test]
fn test_cli_help_command() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then
    helper.command()
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("cortex-code"))
        .stdout(predicate::str::contains("Usage:"));
}

#[test]
fn test_cli_version_command() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then
    helper.command()
        .arg("--version")
        .assert()
        .success()
        .stdout(predicate::str::contains("cortex-code"));
}

#[test]
fn test_config_file_validation() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - config should be valid
    helper.command()
        .arg("config")
        .arg("validate")
        .assert()
        .success();
}

#[test]
fn test_config_file_creation() {
    // Given
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let new_config_path = temp_dir.path().join("new_config.toml");

    // When/Then
    Command::cargo_bin("cortex-code")
        .unwrap()
        .arg("config")
        .arg("init")
        .arg("--path")
        .arg(&new_config_path)
        .assert()
        .success();

    assert!(new_config_path.exists());
}

#[test]
fn test_memory_system_commands() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test memory commands
    helper.command()
        .arg("memory")
        .arg("status")
        .assert()
        .success();
}

#[test]
fn test_provider_list_command() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - should list available providers
    helper.command()
        .arg("providers")
        .arg("list")
        .assert()
        .success()
        .stdout(predicate::str::contains("Available providers:"));
}

#[test]
fn test_analysis_command_basic() {
    // Given
    let helper = CliTestHelper::new();
    let project_dir = helper.create_mock_project();

    // When/Then - analyze project structure
    helper.command()
        .arg("analyze")
        .arg("--path")
        .arg(&project_dir)
        .arg("--pattern")
        .arg("fn $NAME($$$PARAMS) { $$$BODY }")
        .assert()
        .success();
}

#[test]
fn test_interactive_mode_initialization() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test TUI mode (with timeout to avoid hanging)
    helper.command()
        .arg("tui")
        .arg("--test-mode")
        .timeout(std::time::Duration::from_secs(2))
        .assert()
        .success();
}

#[test]
fn test_batch_processing_mode() {
    // Given
    let helper = CliTestHelper::new();
    let input_file = helper.create_test_file("batch_input.txt", "Test batch processing");

    // When/Then
    helper.command()
        .arg("batch")
        .arg("--input")
        .arg(&input_file)
        .arg("--output")
        .arg("json")
        .assert()
        .success();
}

#[test]
fn test_error_handling_invalid_config() {
    // Given
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let invalid_config = temp_dir.path().join("invalid.toml");
    fs::write(&invalid_config, "invalid toml content [[[").expect("Failed to write invalid config");

    // When/Then
    Command::cargo_bin("cortex-code")
        .unwrap()
        .arg("--config")
        .arg(&invalid_config)
        .arg("--help")
        .assert()
        .failure()
        .stderr(predicate::str::contains("config"));
}

#[test]
fn test_verbose_logging_mode() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then
    helper.command()
        .arg("--verbose")
        .arg("providers")
        .arg("list")
        .assert()
        .success()
        .stderr(predicate::str::contains("DEBUG").or(predicate::str::contains("INFO")));
}

#[test]
fn test_json_output_format() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then
    helper.command()
        .arg("providers")
        .arg("list")
        .arg("--output")
        .arg("json")
        .assert()
        .success()
        .stdout(predicate::str::starts_with("{").or(predicate::str::starts_with("[")));
}

#[test]
fn test_feature_toggles_command() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test feature management
    helper.command()
        .arg("features")
        .arg("list")
        .assert()
        .success()
        .stdout(predicate::str::contains("enhanced_provider_support"));
}

#[test]
fn test_approval_mode_commands() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test approval mode management
    helper.command()
        .arg("approval")
        .arg("get")
        .assert()
        .success();

    helper.command()
        .arg("approval")
        .arg("set")
        .arg("suggest")
        .assert()
        .success();
}

#[test]
fn test_workspace_analysis() {
    // Given
    let helper = CliTestHelper::new();
    let project_dir = helper.create_mock_project();

    // When/Then - analyze entire workspace
    helper.command()
        .arg("workspace")
        .arg("analyze")
        .arg("--path")
        .arg(&project_dir)
        .assert()
        .success()
        .stdout(predicate::str::contains("Analysis complete"));
}

#[test]
fn test_streaming_mode() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test streaming responses
    helper.command()
        .arg("chat")
        .arg("--stream")
        .arg("--message")
        .arg("Hello, test streaming")
        .assert()
        .success();
}

#[test]
fn test_context_management() {
    // Given
    let helper = CliTestHelper::new();
    let context_file = helper.create_test_file("context.md", "# Test Context\nThis is test context.");

    // When/Then - test context loading
    helper.command()
        .arg("context")
        .arg("load")
        .arg("--file")
        .arg(&context_file)
        .assert()
        .success();
}

#[test]
fn test_plugin_system() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test plugin management
    helper.command()
        .arg("plugins")
        .arg("list")
        .assert()
        .success();
}

#[test]
fn test_security_validation() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test security checks
    helper.command()
        .arg("security")
        .arg("check")
        .assert()
        .success()
        .stdout(predicate::str::contains("Security check"));
}

#[test]
fn test_concurrent_operations() -> Result<()> {
    // Given
    let helper = CliTestHelper::new();

    // When - simulate concurrent CLI operations
    let handles: Vec<_> = (0..3).map(|i| {
        let helper_cmd = helper.command();
        std::thread::spawn(move || {
            helper_cmd
                .arg("providers")
                .arg("list")
                .arg("--output")
                .arg("json")
                .output()
                .expect("Failed to execute command")
        })
    }).collect();

    // Then - all operations should succeed
    for handle in handles {
        let output = handle.join().expect("Thread panicked");
        assert!(output.status.success());
    }

    Ok(())
}

#[test]
fn test_performance_benchmarking() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test performance measurement
    let start = std::time::Instant::now();

    helper.command()
        .arg("providers")
        .arg("list")
        .assert()
        .success();

    let duration = start.elapsed();

    // Should complete within reasonable time
    assert!(duration.as_secs() < 10);
}

#[test]
fn test_signal_handling() {
    // Given
    let helper = CliTestHelper::new();

    // When/Then - test graceful shutdown
    let mut cmd = helper.command();
    cmd.arg("tui").arg("--test-mode");

    let child = cmd.spawn().expect("Failed to spawn process");

    // Note: In a real test, we'd send SIGTERM and verify graceful shutdown
    // For now, just verify the process can be started
    assert!(child.id() > 0);
}
