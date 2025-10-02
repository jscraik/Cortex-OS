"""Pytest plugin bridging results into TDD Coach telemetry."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

_TEST_RESULTS: List[Dict[str, Any]] = []


def _workspace_root() -> Path:
    override = os.getenv("TDD_COACH_WORKSPACE")
    if override:
        return Path(override).resolve()
    # tools/python/tdd_coach_plugin.py -> repo root is two levels up
    return Path(__file__).resolve().parents[2]


def _output_path() -> Path:
    root = _workspace_root()
    out_dir = root / "reports" / "tdd-coach"
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / "pytest-session.json"


def pytest_sessionstart(session: Any) -> None:  # pragma: no cover - pytest hook
    _TEST_RESULTS.clear()


def pytest_runtest_logreport(report: Any) -> None:  # pragma: no cover - pytest hook
    if getattr(report, "when", "") != "call":
        return
    _TEST_RESULTS.append(
        {
            "nodeid": getattr(report, "nodeid", "unknown"),
            "outcome": getattr(report, "outcome", "unknown"),
            "duration": float(getattr(report, "duration", 0.0) or 0.0),
        }
    )


def pytest_sessionfinish(session: Any, exitstatus: int) -> None:  # pragma: no cover - pytest hook
    output = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "exitstatus": exitstatus,
        "summary": {
            "total": len(_TEST_RESULTS),
            "passed": sum(1 for result in _TEST_RESULTS if result["outcome"] == "passed"),
            "failed": sum(1 for result in _TEST_RESULTS if result["outcome"] == "failed"),
            "skipped": sum(1 for result in _TEST_RESULTS if result["outcome"] == "skipped"),
        },
        "results": _TEST_RESULTS,
    }

    try:
        _output_path().write_text(json.dumps(output, indent=2), encoding="utf-8")
    except OSError as error:
        import warnings

        warnings.warn(
            f"Unable to persist TDD Coach telemetry: {error}",
            RuntimeWarning,
            stacklevel=0,
        )
