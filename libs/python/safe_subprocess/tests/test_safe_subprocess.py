"""Tests for safe subprocess utilities (moved into tests/ for discovery).

We manually insert the parent `libs/python` directory onto `sys.path` so that
`import safe_subprocess` resolves without requiring an editable install.
"""

import sys
import tempfile
from pathlib import Path

import pytest

"""Adjust sys.path so that `import safe_subprocess` works without installation.

Expected layout: <repo>/libs/python/safe_subprocess/tests/test_safe_subprocess.py
We need `<repo>/libs/python` on sys.path. That is `parents[2]` from this file:
   parents[0] = tests
   parents[1] = safe_subprocess
   parents[2] = python   <-- desired
Using the previous calculation (parents[3]/libs/python) produced a duplicated
`.../libs/libs/python` path, causing ModuleNotFoundError.
"""

PYTHON_LIB_ROOT = Path(__file__).resolve().parents[2]
if PYTHON_LIB_ROOT.name == "python" and str(PYTHON_LIB_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_LIB_ROOT))

from safe_subprocess import (  # type: ignore  # noqa: E402
    SafeSubprocessError,
    safe_run,
    sanitize_args,
    validate_command,
    validate_system_command,
)


def test_validate_command_string() -> None:
    result = validate_command("echo hello")
    assert result[0].endswith("echo") or result[0] == "echo"
    assert result[1] == "hello"


def test_validate_command_list() -> None:
    result = validate_command(["echo", "hello"])
    assert result[0].endswith("echo") or result[0] == "echo"
    assert result[1] == "hello"


def test_validate_command_allowlist() -> None:
    allowed = {"echo"}
    result = validate_command("echo hello", allowed)
    assert len(result) == 2
    with pytest.raises(SafeSubprocessError, match="not in allowlist"):
        validate_command("rm -rf /", allowed)


def test_validate_command_empty() -> None:
    with pytest.raises(SafeSubprocessError, match="Empty command"):
        validate_command([])
    with pytest.raises(SafeSubprocessError, match="Empty command"):
        validate_command("")


def test_sanitize_args_basic() -> None:
    args = ["hello", "world", "123"]
    result = sanitize_args(args)
    assert result == args


def test_sanitize_args_dangerous() -> None:
    with pytest.raises(SafeSubprocessError, match="Potentially unsafe"):
        sanitize_args(["hello", "$(rm -rf /)"])
    with pytest.raises(SafeSubprocessError, match="Potentially unsafe"):
        sanitize_args(["hello", "world && rm -rf /"])


def test_sanitize_args_safe_metacharacters() -> None:
    result = sanitize_args(["command", "--version"])
    assert result == ["command", "--version"]


def test_safe_run_basic() -> None:
    result = safe_run(["echo", "hello"], timeout=5)
    assert result.returncode == 0
    assert "hello" in result.stdout


def test_safe_run_with_allowlist() -> None:
    allowed = {"echo"}
    result = safe_run("echo hello", allowed_commands=allowed, timeout=5)
    assert result.returncode == 0
    with pytest.raises(SafeSubprocessError, match="not in allowlist"):
        safe_run("rm -rf /", allowed_commands=allowed, timeout=5)


def test_safe_run_timeout() -> None:
    with pytest.raises(SafeSubprocessError, match="Command timeout"):
        safe_run(["sleep", "10"], timeout=0.1)


def test_safe_run_working_directory() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        result = safe_run(["pwd"], cwd=temp_dir, timeout=5)
        assert temp_dir in result.stdout
    with pytest.raises(SafeSubprocessError, match="does not exist"):
        safe_run(["echo", "hello"], cwd="/nonexistent/path", timeout=5)
    # Create a file and attempt to use as cwd (invalid directory)
    with (
        tempfile.NamedTemporaryFile() as tmp_file,
        pytest.raises(SafeSubprocessError, match="not a directory"),
    ):
        safe_run(["echo", "hello"], cwd=tmp_file.name, timeout=5)


def test_safe_run_environment() -> None:
    result = safe_run(
        ["printenv", "TEST_VAR"],
        env={"TEST_VAR": "test_value", "PATH": "/bin:/usr/bin"},
        timeout=5,
    )
    assert "test_value" in result.stdout


def test_safe_run_shell_disabled() -> None:
    # Expect sanitization to reject dangerous token '&&'
    with pytest.raises(SafeSubprocessError):
        safe_run("echo hello && echo world", timeout=5)


def test_command_injection_prevention() -> None:
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


def test_validate_system_command_factory_usage() -> None:
    # The validate_system_command is produced by create_allowlist_validator; ensure it works.
    parts = validate_system_command(["uname", "-v"])  # expect allowlist success
    assert parts[0].endswith("uname")
    # Disallowed command should raise
    with pytest.raises(SafeSubprocessError):
        validate_system_command(["echo", "hi"])  # not in SYSTEM_INFO_COMMANDS
