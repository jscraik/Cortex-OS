"""Additional tests for safe_subprocess to raise coverage.

Exercises:
 - Successful command execution
 - Non-zero exit with captured stderr
 - Timeout handling (short sleep)
 - Environment allowlist filtering
 - Streaming output line by line
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[4]
SRC = ROOT / "libs" / "python" / "safe_subprocess"
if str(SRC) not in sys.path:  # pragma: no cover - path wiring
    sys.path.insert(0, str(SRC))

from safe_subprocess import run_command, stream_command  # noqa: E402


def test_run_command_success() -> None:
    result = run_command([sys.executable, "-c", "print('hello')"])
    assert result.exit_code == 0
    assert result.stdout.strip() == "hello"
    assert result.stderr == ""


def test_run_command_non_zero() -> None:
    py_code = "import sys\nprint('oops', file=sys.stderr)\nsys.exit(3)"
    result = run_command([sys.executable, "-c", py_code])
    assert result.exit_code == 3
    assert "oops" in result.stderr


def test_run_command_timeout(tmp_path: Path) -> None:
    start = time.time()
    # Use a command that sleeps longer than timeout; portable via Python
    result = run_command([sys.executable, "-c", "import time\nimport time as _t\n_t.sleep(2)"] , timeout=0.2)
    elapsed = time.time() - start
    assert result.timed_out is True
    assert elapsed < 1.5  # ensure timeout triggered early


def test_run_command_env_allowlist(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SAFE_SUBPROC_ALLOW_ENV", "KEEP_ME")
    monkeypatch.setenv("KEEP_ME", "yes")
    monkeypatch.setenv("DROP_ME", "no")
    code = (
        "import os, json\n"
        "print(json.dumps({'has_keep': 'KEEP_ME' in os.environ, 'has_drop': 'DROP_ME' in os.environ}))"
    )
    result = run_command([sys.executable, "-c", code])
    assert '"has_keep": true' in result.stdout
    assert '"has_drop": false' in result.stdout


def test_stream_command_lines() -> None:
    # Emit three lines with flush to ensure they are captured separately
    code = (
        "for i in range(3):\n"
        "    print(f'L{i}')\n"
    )
    lines = list(stream_command([sys.executable, "-u", "-c", code]))
    assert [line.strip() for line in lines if line.strip()] == ["L0", "L1", "L2"]
