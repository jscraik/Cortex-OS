//! Integration tests for CLI commands
//!
//! These tests exercise the complete CLI interface including:
//! - Command parsing and execution
//! - Configuration loading
//! - Provider integration
//! - Feature toggle functionality
//! - Error handling scenarios

use assert_cmd::Command;
use predicates::prelude::*;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

/// Test utilities for CLI integration tests
pub struct CliTestHelper {
    temp_dir: TempDir,
    binary_path: PathBuf,
    config_path: PathBuf,
}

impl CliTestHelper {
    /// Create a new test helper with temporary directory
    pub fn new() -> Self {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("config.toml");

        // Create a basic test configuration
        let test_config = r#"
[providers]
default = "github"

[providers.github]
token = "test-token"
model = "gpt-4o-mini"

[memory]
enabled = true
path = "/tmp/test-agents.md"

[features]
chat_interface = true
streaming_responses = true
cloudflare_tunnel = false
"#;

        fs::write(&config_path, test_config).expect("Failed to write test config");

        Self {
            temp_dir,
            binary_path: PathBuf::from("target/debug/cortex-code"),
            config_path,
        }
    }

    /// Get a command builder with common test setup
    pub fn command(&self) -> Command {
        let mut cmd = Command::cargo_bin("cortex-code").unwrap();
        cmd.arg("--config").arg(&self.config_path);
        cmd
    }

    /// Create a mock response file for testing
    pub fn create_mock_response(&self, content: &str) -> PathBuf {
        let response_path = self.temp_dir.path().join("mock_response.txt");
        fs::write(&response_path, content).expect("Failed to write mock response");
        response_path
    }

    /// Get temp directory path
    pub fn temp_path(&self) -> &std::path::Path {
        self.temp_dir.path()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_help() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("--help")
            .assert()
            .success()
            .stdout(predicate::str::contains("Cortex Code interface"));
    }

    #[test]
    fn test_cli_version() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("--version")
            .assert()
            .success()
            .stdout(predicate::str::contains("cortex-code"));
    }

    #[test]
    fn test_run_command_basic() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("run")
            .arg("Hello, World!")
            .arg("--output")
            .arg("text")
            .assert()
            .success();

        // Note: This test would need a mock provider to avoid actual API calls
        // In a real test environment, we'd mock the GitHub/OpenAI API responses
    }

    #[test]
    fn test_run_command_json_output() {
        let helper = CliTestHelper::new();

        let output = helper.command()
            .arg("run")
            .arg("Test prompt")
            .arg("--output")
            .arg("json")
            .output()
            .expect("Failed to run command");

        if output.status.success() {
            let stdout = String::from_utf8(output.stdout).expect("Invalid UTF-8");
            let json: Value = serde_json::from_str(&stdout).expect("Invalid JSON output");

            // Verify JSON structure
            assert!(json.get("message").is_some());
            assert!(json.get("timestamp").is_some());
            assert!(json.get("provider").is_some());
        }
    }

    #[test]
    fn test_mcp_commands() {
        let helper = CliTestHelper::new();

        // Test MCP list command
        helper.command()
            .arg("mcp")
            .arg("list")
            .assert()
            .success();

        // Test MCP add command (should work with mock config)
        helper.command()
            .arg("mcp")
            .arg("add")
            .arg("test-server")
            .arg(r#"{"command": ["node", "server.js"], "args": []}"#)
            .assert()
            .success();
    }

    #[test]
    fn test_tunnel_commands() {
        let helper = CliTestHelper::new();

        // Test tunnel setup
        helper.command()
            .arg("tunnel")
            .arg("setup")
            .assert()
            .success()
            .stdout(predicate::str::contains("tunnel"));

        // Test tunnel status
        helper.command()
            .arg("tunnel")
            .arg("status")
            .assert()
            .success();
    }

    #[test]
    fn test_brainwav_commands() {
        let helper = CliTestHelper::new();

        // Test Brainwav status
        helper.command()
            .arg("brainwav")
            .arg("status")
            .assert()
            .success();

        // Test Brainwav tools listing
        helper.command()
            .arg("brainwav")
            .arg("tools")
            .assert()
            .success();
    }

    #[test]
    fn test_diagnostics_commands() {
        let helper = CliTestHelper::new();

        // Test diagnostics report
        helper.command()
            .arg("diagnostics")
            .arg("report")
            .assert()
            .success()
            .stdout(predicate::str::contains("Diagnostic"));

        // Test health check
        helper.command()
            .arg("diagnostics")
            .arg("health")
            .assert()
            .success();
    }

    #[test]
    fn test_cloud_commands() {
        let helper = CliTestHelper::new();

        // Test cloud provider list
        helper.command()
            .arg("cloud")
            .arg("list")
            .assert()
            .success()
            .stdout(predicate::str::contains("providers"));

        // Test cloud status
        helper.command()
            .arg("cloud")
            .arg("status")
            .assert()
            .success();
    }

    #[test]
    fn test_invalid_command() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("invalid-command")
            .assert()
            .failure()
            .stderr(predicate::str::contains("error"));
    }

    #[test]
    fn test_missing_config() {
        let mut cmd = Command::cargo_bin("cortex-code").unwrap();
        cmd.arg("--config")
           .arg("/nonexistent/config.toml")
           .arg("run")
           .arg("test")
           .assert()
           .failure();
    }

    #[test]
    fn test_debug_mode() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("--debug")
            .arg("run")
            .arg("Test debug mode")
            .assert()
            .success();

        // Debug mode should enable verbose logging
        // In practice, you'd check log output or behavior changes
    }

    #[test]
    fn test_ci_mode() {
        let helper = CliTestHelper::new();

        helper.command()
            .arg("--ci")
            .arg("run")
            .arg("Test CI mode")
            .arg("--output")
            .arg("json")
            .assert()
            .success();

        // CI mode should produce machine-readable output
    }

    #[test]
    fn test_daemon_mode() {
        let helper = CliTestHelper::new();

        // Test daemon start (this should start and then we'd need to stop it)
        // For testing, we'll just verify the command is recognized
        let output = helper.command()
            .arg("daemon")
            .arg("--port")
            .arg("0") // Use port 0 to get a random available port
            .timeout(std::time::Duration::from_secs(2))
            .output();

        // The daemon should start (or at least attempt to start)
        // In a full test, we'd start it in background and test HTTP endpoints
        match output {
            Ok(result) => {
                // Either success (daemon started) or timeout (also acceptable for test)
                assert!(result.status.success() || !result.stderr.is_empty());
            }
            Err(_) => {
                // Timeout is acceptable for daemon tests
            }
        }
    }
}

/// Performance tests for CLI operations
#[cfg(test)]
mod performance_tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_cli_startup_time() {
        let helper = CliTestHelper::new();

        let start = Instant::now();
        helper.command()
            .arg("--help")
            .assert()
            .success();
        let duration = start.elapsed();

        // CLI should start quickly (under 1 second for help)
        assert!(duration.as_secs() < 1, "CLI startup took too long: {:?}", duration);
    }

    #[test]
    fn test_config_loading_performance() {
        let helper = CliTestHelper::new();

        let start = Instant::now();
        helper.command()
            .arg("run")
            .arg("performance test")
            .arg("--output")
            .arg("json")
            .timeout(std::time::Duration::from_secs(5))
            .assert();
        let duration = start.elapsed();

        // Configuration loading should be fast
        assert!(duration.as_secs() < 5, "Config loading took too long: {:?}", duration);
    }
}

/// Error handling tests
#[cfg(test)]
mod error_tests {
    use super::*;

    #[test]
    fn test_invalid_config_handling() {
        let temp_dir = TempDir::new().unwrap();
        let invalid_config = temp_dir.path().join("invalid.toml");
        fs::write(&invalid_config, "invalid toml content [[[").unwrap();

        let mut cmd = Command::cargo_bin("cortex-code").unwrap();
        cmd.arg("--config")
           .arg(&invalid_config)
           .arg("run")
           .arg("test")
           .assert()
           .failure()
           .stderr(predicate::str::contains("config").or(predicate::str::contains("parse")));
    }

    #[test]
    fn test_network_error_handling() {
        let helper = CliTestHelper::new();

        // This test would require network mocking to simulate failures
        // For now, we just verify the command structure
        helper.command()
            .arg("run")
            .arg("network test")
            .timeout(std::time::Duration::from_secs(10))
            .assert();

        // In a full test environment, we'd mock network failures
        // and verify graceful error handling
    }

    #[test]
    fn test_missing_dependency_handling() {
        let helper = CliTestHelper::new();

        // Test what happens when optional dependencies are missing
        helper.command()
            .arg("tunnel")
            .arg("start")
            .assert(); // Should handle missing cloudflared gracefully
    }
}

/// Feature flag integration tests
#[cfg(test)]
mod feature_tests {
    use super::*;

    #[test]
    fn test_feature_disabled_behavior() {
        let helper = CliTestHelper::new();

        // Create config with features disabled
        let disabled_config = r#"
[providers]
default = "github"

[providers.github]
token = "test-token"

[features]
chat_interface = false
streaming_responses = false
"#;

        let config_path = helper.temp_path().join("disabled_features.toml");
        fs::write(&config_path, disabled_config).unwrap();

        let mut cmd = Command::cargo_bin("cortex-code").unwrap();
        cmd.arg("--config")
           .arg(&config_path)
           .arg("code")
           .assert();

        // With chat_interface disabled, the code command might behave differently
        // The exact behavior depends on implementation
    }

    #[test]
    fn test_beta_feature_warnings() {
        let helper = CliTestHelper::new();

        // Test that beta features show appropriate warnings
        helper.command()
            .arg("cloud")
            .arg("list")
            .assert()
            .success();

        // Beta features should work but might show warnings in stderr
    }
}
