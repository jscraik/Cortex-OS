"""Extended coverage tests for safe_subprocess utilities.

Targets uncovered branches:
- validate_command: empty list, allowlist rejection, relative resolution (shutil.which path substitution).
- sanitize_args: rejection of unsafe metacharacters, acceptance of safe patterns (-v, --version), null byte stripping.
- safe_run: cwd validation (non-existent / not a dir), custom env propagation, check=False non-zero exit path.
- run_command: SAFE_SUBPROC_ALLOW_ENV propagation and timeout classification already partly covered; here test allowed env pass-through and security error propagation (non-timeout).
- stream_command: line iteration path.
"""

from __future__ import annotations

import os

import pytest
from libs.python.safe_subprocess.safe_subprocess import (
    SafeSubprocessError,
    create_allowlist_validator,
    run_command,
    safe_run,
    sanitize_args,
    stream_command,
    validate_command,
)


def test_validate_command_empty_list():  # type: ignore[no-untyped-def]
    with pytest.raises(SafeSubprocessError):
        validate_command([])


def test_validate_command_allowlist_rejection(tmp_path):  # type: ignore[no-untyped-def]
    validator = create_allowlist_validator({"echo"})
    with pytest.raises(SafeSubprocessError):
        validator("uname -a")


def test_validate_command_path_resolution(monkeypatch):  # type: ignore[no-untyped-def]
    # Pick a command that certainly exists: 'echo'
    parts = validate_command("echo hello")
    # First part should now be absolute path (resolution via shutil.which)
    assert os.path.isabs(parts[0])
    assert parts[1] == "hello"


def test_sanitize_args_rejects_unsafe():  # type: ignore[no-untyped-def]
    with pytest.raises(SafeSubprocessError):
        sanitize_args(["rm", "-rf", ";echo", "x"])  # semicolon triggers rejection


def test_sanitize_args_allows_safe_patterns():  # type: ignore[no-untyped-def]
    out = sanitize_args(["tool", "--version", "-v"])  # both safe patterns
    assert out[-2:] == ["--version", "-v"]


def test_sanitize_args_null_byte_strip():  # type: ignore[no-untyped-def]
    out = sanitize_args(["he\0llo"])  # embedded null removed
    assert out[0] == "hello"


def test_safe_run_cwd_validation(tmp_path):  # type: ignore[no-untyped-def]
    bad_dir = tmp_path / "missing"
    with pytest.raises(SafeSubprocessError):
        safe_run(["echo", "hi"], cwd=str(bad_dir))
    not_a_dir = tmp_path / "file.txt"
    not_a_dir.write_text("content", encoding="utf-8")
    with pytest.raises(SafeSubprocessError):
        safe_run(["echo", "hi"], cwd=str(not_a_dir))


def test_safe_run_custom_env_and_nonzero_exit():  # type: ignore[no-untyped-def]
    env = {"CUSTOM_FLAG": "1"}
    # Use code without semicolons (sanitize forbids ';')
    code = "import sys\nraise SystemExit(2)"
    res = safe_run(["python", "-c", code], env=env, capture_output=True, text=True)
    assert res.returncode == 2
    code_read = "import os\nprint(os.getenv('CUSTOM_FLAG',''))"
    res2 = safe_run(["python", "-c", code_read], env=env)
    assert res2.stdout.strip() == "1"


def test_run_command_env_allowlist(monkeypatch):  # type: ignore[no-untyped-def]
    monkeypatch.setenv("SAFE_SUBPROC_ALLOW_ENV", "EXTRA_ONE,EXTRA_TWO")
    monkeypatch.setenv("EXTRA_ONE", "A")
    monkeypatch.setenv("EXTRA_TWO", "B")
    code = "import os\nprint(os.getenv('EXTRA_ONE')+os.getenv('EXTRA_TWO'))"
    out = run_command(["python", "-c", code]).stdout.strip()
    assert out == "AB"


def test_run_command_security_error_propagates():  # type: ignore[no-untyped-def]
    # sanitize_args should raise -> propagated by run_command
    with pytest.raises(SafeSubprocessError):
        run_command(["echo", ";bad"])  # semicolon


def test_stream_command_basic():  # type: ignore[no-untyped-def]
    # Create a small script printing lines
    lines = list(stream_command(["python", "-c", "[print(i) for i in range(3)]"]))
    assert lines == ["0", "1", "2"]
