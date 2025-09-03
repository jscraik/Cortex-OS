//! Test entry point for cortex-code
//!
//! Comprehensive test suite following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

pub mod unit;
pub mod integration;

// Re-export all test utilities for external consumers
pub use unit::{
    MockStorageBackend, create_test_conversation,
    MockProvider, MockStreamingResponse, create_test_config,
    create_temp_file, create_rust_test_code, create_typescript_test_code,
    ApprovalMode, MockCortexApp, create_approval_test_config
};

pub use integration::CliTestHelper;

/// Test configuration for the entire test suite
#[derive(Debug, Clone)]
pub struct TestConfig {
    pub enable_integration_tests: bool,
    pub mock_external_services: bool,
    pub test_data_path: Option<std::path::PathBuf>,
    pub log_level: String,
}

impl Default for TestConfig {
    fn default() -> Self {
        Self {
            enable_integration_tests: true,
            mock_external_services: true,
            test_data_path: None,
            log_level: "info".to_string(),
        }
    }
}

/// Initialize test environment with proper setup
pub fn init_test_environment() -> TestConfig {
    // Set test environment variables
    std::env::set_var("CORTEX_TEST_MODE", "true");
    std::env::set_var("RUST_LOG", "cortex_code=debug");

    // Initialize tracing for tests
    let _ = tracing_subscriber::fmt()
        .with_env_filter("cortex_code=debug")
        .try_init();

    TestConfig::default()
}

/// Clean up test environment
pub fn cleanup_test_environment() {
    // Clean up any temporary files or state
    if let Ok(temp_dir) = std::env::var("CORTEX_TEST_TEMP_DIR") {
        let _ = std::fs::remove_dir_all(temp_dir);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_environment_initialization() {
        let config = init_test_environment();
        assert!(config.enable_integration_tests);
        assert!(config.mock_external_services);

        cleanup_test_environment();
    }
}
