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
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
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

#[test]
fn mcp_doctor_prints_ok_json_and_exits_zero() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.arg("mcp").arg("doctor");
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn mcp_without_action_prints_help() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.arg("mcp");
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("list").and(predicate::str::contains("server")));
}

#[test]
fn mcp_get_prints_named_json_and_exits_zero() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "get", "demo"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("\"name\":\"demo\""));
}

#[test]
fn mcp_show_prints_named_json_and_exits_zero() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "show", "demo"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("\"name\":\"demo\""));
}

#[test]
fn mcp_add_accepts_name_and_optional_url_prints_json() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "add", "demo", "http://127.0.0.1:3000"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("\"name\":\"demo\"")
            .and(predicate::str::contains("\"added\":true")));
}

#[test]
fn mcp_remove_prints_removed_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "remove", "demo"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("\"name\":\"demo\"")
            .and(predicate::str::contains("\"removed\":true")));
}

#[test]
fn mcp_search_prints_results_array() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "search", "demo"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::starts_with("[")
            .and(predicate::str::contains("demo"))
            .and(predicate::str::contains("]")));
}

#[test]
fn mcp_bridge_prints_ok_json_and_exits_zero() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["mcp", "bridge"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn a2a_list_prints_json_array() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["a2a", "list"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::starts_with("[").and(predicate::str::contains("]")));
}

#[test]
fn a2a_send_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["a2a", "send", "event.health.v1"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn rag_ingest_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["rag", "ingest", "./docs"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn rag_query_prints_results_array() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["rag", "query", "hello"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::starts_with("[").and(predicate::str::contains("]")));
}

#[test]
fn rag_eval_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["rag", "eval"]);
    cmd.assert()
        .success()
        .stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn simlab_list_prints_array() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["simlab", "list"]);
    cmd.assert().success().stdout(predicate::str::starts_with("[").and(predicate::str::contains("]")));
}

#[test]
fn simlab_run_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["simlab", "run", "demo"]);
    cmd.assert().success().stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn simlab_bench_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["simlab", "bench", "demo"]);
    cmd.assert().success().stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn simlab_report_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["simlab", "report", "demo"]);
    cmd.assert().success().stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}

#[test]
fn ctl_check_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["ctl", "check"]);
    cmd.assert().success().stdout(predicate::str::contains("\"ok\":true"));
}

#[test]
fn eval_gate_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["eval", "gate"]);
    cmd.assert().success().stdout(predicate::str::contains("\"ok\":true"));
}

#[test]
fn agent_create_prints_ok_true() {
    let mut cmd = Command::cargo_bin("codex").expect("binary built");
    cmd.args(["agent", "create", "demo-agent"]);
    cmd.assert().success().stdout(predicate::str::is_match(r#"\"ok\":\s*true"#).unwrap());
}
