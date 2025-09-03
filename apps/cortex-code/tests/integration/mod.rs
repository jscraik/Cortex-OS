//! Integration test module index for cortex-code
//!
//! Organizes integration tests following September 2025 standards:
//! - Comprehensive end-to-end testing
//! - CLI interface validation
//! - Feature integration verification

pub mod cli_tests;

// Re-exported test utilities for integration testing
pub use cli_tests::CliTestHelper;
