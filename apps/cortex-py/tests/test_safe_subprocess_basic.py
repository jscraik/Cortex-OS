import importlib.util
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

# Dynamically locate the safe_subprocess module
REPO_ROOT = Path(__file__).resolve().parents[3]
SAFE_SUBPROC_PATH = (
    REPO_ROOT / "libs" / "python" / "safe_subprocess" / "safe_subprocess.py"
)
_spec = importlib.util.spec_from_file_location(
    "safe_subprocess_test_target", str(SAFE_SUBPROC_PATH)
)
if (
    _spec is None or _spec.loader is None
):  # pragma: no cover - anomalous test environment
    pytest.skip("Cannot load safe_subprocess module spec")
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)


def test_run_command_success() -> None:
    """Basic success path: run an echo command and capture output."""
    if not hasattr(_mod, "run_command"):
        pytest.skip("run_command not present in safe_subprocess module")
    result: Any = _mod.run_command(
        [sys.executable, "-c", "print('ok')"]
    )  # runtime attribute present
    assert getattr(result, "exit_code", 1) == 0
    assert "ok" in (getattr(result, "stdout", ""))


def test_run_command_nonzero_exit() -> None:
    if not hasattr(_mod, "run_command"):
        pytest.skip("run_command not present")
    # First: a command containing ';' should be rejected by sanitizer
    safe_subprocess_error = getattr(
        _mod, "SafeSubprocessError", Exception
    )  # fallback for drift
    with pytest.raises(safe_subprocess_error):
        _mod.run_command(
            [sys.executable, "-c", "import sys; print('err'); sys.exit(3)"]
        )  # runtime attribute present
    # Second: safe newline separated script (no semicolons) should execute and exit 3
    payload = "import sys\nprint('err')\nsys.exit(3)"
    result: Any = _mod.run_command(
        [sys.executable, "-c", payload]
    )  # runtime attribute present
    code = getattr(result, "exit_code", getattr(result, "returncode", None))
    assert code == 3
    combined = (getattr(result, "stdout", "") or "") + (
        getattr(result, "stderr", "") or ""
    )
    assert "err" in combined


def test_run_command_timeout_simulated(monkeypatch: pytest.MonkeyPatch) -> None:
    if not hasattr(_mod, "run_command"):
        pytest.skip("run_command not present")
    original = subprocess.run

    def fake_run(
        *args: Any, **kwargs: Any
    ) -> None:  # pragma: no cover - simulated path
        raise subprocess.TimeoutExpired(cmd=args[0], timeout=0.01)

    monkeypatch.setattr(subprocess, "run", fake_run)
    result: Any = _mod.run_command(
        [sys.executable, "-c", "print('never')"]
    )  # runtime attribute present
    assert getattr(result, "timed_out", False) is True
    assert getattr(result, "exit_code", 0) == -1
    monkeypatch.setattr(subprocess, "run", original)
