"""Tests for compute_mlx_available environment override precedence.

Scenarios covered:
1. Force disable overrides everything (even if force enable also set + components present).
2. Force enable returns True only if underlying components (mx, load) are non-None - platform independent.
3. Without overrides: requires Darwin + components present.
4. Without overrides: non-Darwin platform -> False even if components present.
5. Without overrides: components absent -> False regardless of platform.

We monkeypatch the module globals ``mx`` and ``load`` to simulate presence/absence of MLX components.
This is lighter than attempting to fabricate real submodules.
"""

from __future__ import annotations

import importlib
import sys
from types import SimpleNamespace
from typing import Any

import pytest

MODULE_PATH = "apps.cortex-py.src.mlx.embedding_generator".replace("/", ".")


def _reload_module() -> Any:
    # Remove from sys.modules to ensure a clean import (globals re-bound)
    if MODULE_PATH in sys.modules:
        del sys.modules[MODULE_PATH]
    return importlib.import_module(MODULE_PATH)


@pytest.fixture()
def eg_mod(monkeypatch):  # type: ignore[no-untyped-def]
    # Start from a fresh module each test
    mod = _reload_module()
    # Clear override envs for baseline unless test sets explicitly
    for k in ["CORTEX_FORCE_DISABLE_MLX", "CORTEX_FORCE_ENABLE_MLX"]:
        monkeypatch.delenv(k, raising=False)
    return mod


def _set_components(mod: Any, present: bool) -> None:
    if present:
        # Provide lightweight stand-ins
        mod.mx = SimpleNamespace(dummy=True)

        def _fake_load(*_args: object, **_kwargs: object) -> tuple[str, str]:
            return ("model", "tokenizer")

        mod.load = _fake_load
    else:
        mod.mx = None
        mod.load = None


def test_force_disable_overrides_all(eg_mod, monkeypatch):  # type: ignore[no-untyped-def]
    _set_components(eg_mod, present=True)
    monkeypatch.setenv("CORTEX_FORCE_DISABLE_MLX", "1")
    monkeypatch.setenv("CORTEX_FORCE_ENABLE_MLX", "1")  # conflicting enable
    # compute_mlx_available uses platform.system() internally; patch there
    import platform

    monkeypatch.setattr(platform, "system", lambda: "Darwin")
    assert eg_mod.compute_mlx_available() is False


def test_force_enable_requires_components_present(eg_mod, monkeypatch):  # type: ignore[no-untyped-def]
    # Force enable but components missing -> False
    _set_components(eg_mod, present=False)
    monkeypatch.setenv("CORTEX_FORCE_ENABLE_MLX", "1")
    import platform

    monkeypatch.setattr(platform, "system", lambda: "Linux")  # should be ignored
    assert eg_mod.compute_mlx_available() is False

    # Now provide components -> True regardless of platform
    _set_components(eg_mod, present=True)
    assert eg_mod.compute_mlx_available() is True


def test_no_overrides_darwin_and_components_required(eg_mod, monkeypatch):  # type: ignore[no-untyped-def]
    _set_components(eg_mod, present=True)
    import platform

    monkeypatch.setattr(platform, "system", lambda: "Darwin")
    assert eg_mod.compute_mlx_available() is True


def test_no_overrides_non_darwin_false_even_with_components(eg_mod, monkeypatch):  # type: ignore[no-untyped-def]
    _set_components(eg_mod, present=True)
    import platform

    monkeypatch.setattr(platform, "system", lambda: "Linux")
    assert eg_mod.compute_mlx_available() is False


def test_no_overrides_components_absent_false(eg_mod, monkeypatch):  # type: ignore[no-untyped-def]
    _set_components(eg_mod, present=False)
    import platform

    monkeypatch.setattr(platform, "system", lambda: "Darwin")
    assert eg_mod.compute_mlx_available() is False
