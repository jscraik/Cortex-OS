use assert_cmd::prelude::*;
use predicates::prelude::*;
use std::process::Command;

// TDD: Define expected behavior to drive implementation in codex CLI

#[test]
fn a2a_doctor_prints_ok_json_and_exits_zero() {
    // When implemented, `codex a2a doctor` should print a minimal JSON health payload
    // Example: {"ok":true,"service":"a2a","version":\"1\"}
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.arg("a2a").arg("doctor");
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match("\"ok\":\s*true").unwrap());
}

#[test]
fn mcp_list_prints_json_array_and_exits_zero() {
    // When implemented, `codex mcp list` should return a JSON array (empty is fine)
    // Example: [] or [ { name, url, transports } ]
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.arg("mcp").arg("list");
    cmd.assert()
        .success()
        .stdout(predicate::str::starts_with("[").and(predicate::str::contains("]")));
}

