//! Test module index for cortex-code
//!
//! Organizes all test modules following September 2025 standards:
//! - Comprehensive test coverage
//! - Named exports only
//! - Explicit module structure

pub mod memory_tests;
pub mod provider_tests;
pub mod analysis_tests;
pub mod approval_mode_tests;

// Re-exported test utilities for workspace consumers
pub use memory_tests::{MockStorageBackend, create_test_conversation};
pub use provider_tests::{MockProvider, MockStreamingResponse, create_test_config};
pub use analysis_tests::{create_temp_file, create_rust_test_code, create_typescript_test_code};
pub use approval_mode_tests::{ApprovalMode, MockCortexApp, create_approval_test_config};
