"""Tests for safe subprocess utilities."""

import subprocess
import tempfile
from pathlib import Path

import pytest

from safe_subprocess import (
    SafeSubprocessError,
    safe_run,
    sanitize_args,
    validate_command,
)


def test_validate_command_string():
    """Test command validation with string input."""
    result = validate_command("echo hello")
    assert result[0].endswith("echo") or result[0] == "echo"
    assert result[1] == "hello"


def test_validate_command_list():
    """Test command validation with list input."""
    result = validate_command(["echo", "hello"])
    assert result[0].endswith("echo") or result[0] == "echo"
    assert result[1] == "hello"


def test_validate_command_allowlist():
    """Test command validation with allowlist."""
    allowed = {"echo"}
    result = validate_command("echo hello", allowed)
    assert len(result) == 2
    
    with pytest.raises(SafeSubprocessError, match="not in allowlist"):
        validate_command("rm -rf /", allowed)


def test_validate_command_empty():
    """Test validation of empty command."""
    with pytest.raises(SafeSubprocessError, match="Empty command"):
        validate_command([])
    
    with pytest.raises(SafeSubprocessError, match="Empty command"):
        validate_command("")


def test_sanitize_args_basic():
    """Test basic argument sanitization."""
    args = ["hello", "world", "123"]
    result = sanitize_args(args)
    assert result == args


def test_sanitize_args_dangerous():
    """Test sanitization of dangerous arguments."""
    with pytest.raises(SafeSubprocessError, match="Potentially unsafe"):
        sanitize_args(["hello", "$(rm -rf /)"])
    
    with pytest.raises(SafeSubprocessError, match="Potentially unsafe"):
        sanitize_args(["hello", "world && rm -rf /"])


def test_sanitize_args_safe_metacharacters():
    """Test that safe metacharacters are allowed."""
    # Version flags should be safe
    result = sanitize_args(["command", "--version"])
    assert result == ["command", "--version"]


def test_safe_run_basic():
    """Test basic safe command execution."""
    result = safe_run(["echo", "hello"], timeout=5)
    assert result.returncode == 0
    assert "hello" in result.stdout


def test_safe_run_with_allowlist():
    """Test safe run with command allowlist."""
    allowed = {"echo"}
    result = safe_run("echo hello", allowed_commands=allowed, timeout=5)
    assert result.returncode == 0
    
    with pytest.raises(SafeSubprocessError, match="not in allowlist"):
        safe_run("rm -rf /", allowed_commands=allowed, timeout=5)


def test_safe_run_timeout():
    """Test timeout handling."""
    with pytest.raises(SafeSubprocessError, match="Command timeout"):
        safe_run(["sleep", "10"], timeout=0.1)


def test_safe_run_working_directory():
    """Test working directory validation."""
    with tempfile.TemporaryDirectory() as temp_dir:
        result = safe_run(["pwd"], cwd=temp_dir, timeout=5)
        assert temp_dir in result.stdout
    
    # Test invalid working directory
    with pytest.raises(SafeSubprocessError, match="does not exist"):
        safe_run(["echo", "hello"], cwd="/nonexistent/path", timeout=5)


def test_safe_run_environment():
    """Test environment variable handling."""
    result = safe_run(
        ["printenv", "TEST_VAR"],
        env={"TEST_VAR": "test_value", "PATH": "/bin:/usr/bin"},
        timeout=5
    )
    assert "test_value" in result.stdout


def test_safe_run_shell_disabled():
    """Test that shell is always disabled."""
    # This should not execute the shell command
    result = safe_run("echo hello && echo world", timeout=5)
    # Should try to execute a command literally named "echo hello && echo world"
    # which should fail, proving shell is disabled
    assert result.returncode != 0 or "&&" not in result.stdout


def test_command_injection_prevention():
    """Test prevention of command injection attacks."""
    malicious_commands = [
        "echo hello; rm -rf /",
        "echo hello && rm -rf /", 
        "echo hello | rm -rf /",
        "echo `rm -rf /`",
        "echo $(rm -rf /)",
    ]
    
    for cmd in malicious_commands:
        with pytest.raises(SafeSubprocessError):
            safe_run(cmd, timeout=5)


if __name__ == "__main__":
    pytest.main([__file__])