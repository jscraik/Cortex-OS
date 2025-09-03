//! Integration tests for project build system
//!
//! These tests verify that the entire workspace can be built
//! and all components work together correctly.

use std::process::Command;

/// Test that the entire workspace compiles successfully
#[test]
fn test_workspace_compiles() {
    let output = Command::new("cargo")
        .args(&["check", "--workspace", "--all-features"])
        .output()
        .expect("Failed to execute cargo check");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Workspace compilation failed. See stderr above for details."
    );
}

/// Test that all tests in the workspace pass
#[test]
fn test_workspace_tests_pass() {
    let output = Command::new("cargo")
        .args(&["test", "--workspace", "--all-features", "--", "--test-threads=1"])
        .output()
        .expect("Failed to execute cargo test");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Workspace tests failed. See stderr above for details."
    );
}

/// Test that clippy passes with no warnings
#[test]
fn test_clippy_passes() {
    let output = Command::new("cargo")
        .args(&["clippy", "--workspace", "--all-features", "--", "-D", "warnings"])
        .output()
        .expect("Failed to execute cargo clippy");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Clippy found warnings or errors. See stderr above for details."
    );
}

/// Test that code formatting is correct
#[test]
fn test_formatting_check() {
    let output = Command::new("cargo")
        .args(&["fmt", "--check"])
        .output()
        .expect("Failed to execute cargo fmt");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Code formatting check failed. Run 'cargo fmt' to fix."
    );
}

/// Test that all binaries can be built
#[test]
fn test_binaries_build() {
    let output = Command::new("cargo")
        .args(&["build", "--workspace", "--bins", "--all-features"])
        .output()
        .expect("Failed to execute cargo build");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Binary compilation failed. See stderr above for details."
    );
}

/// Test that documentation can be built
#[test]
fn test_docs_build() {
    let output = Command::new("cargo")
        .args(&["doc", "--workspace", "--all-features", "--no-deps"])
        .output()
        .expect("Failed to execute cargo doc");

    if !output.status.success() {
        eprintln!("STDOUT: {}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR: {}", String::from_utf8_lossy(&output.stderr));
    }

    assert!(
        output.status.success(),
        "Documentation build failed. See stderr above for details."
    );
}

/// Test workspace dependency tree for conflicts
#[test]
fn test_dependency_tree() {
    let output = Command::new("cargo")
        .args(&["tree", "--workspace", "--duplicates"])
        .output()
        .expect("Failed to execute cargo tree");

    // Note: This test checks if cargo tree runs successfully
    // In a real scenario, you might want to parse the output
    // to ensure no problematic duplicate dependencies exist
    assert!(
        output.status.success(),
        "Dependency tree analysis failed. There may be dependency conflicts."
    );
}
