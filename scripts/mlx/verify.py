#!/usr/bin/env python3
"""
Lightweight MLX availability verifier.
Checks that core MLX packages can import and simple ops work.
Exits with non-zero status if unavailable.
Robust against environments that shadow stdlib importlib.
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        # Try importing MLX core directly (avoids importlib.util issues)
        try:
            import mlx.core as mx  # type: ignore
        except Exception as e:
            print(f"mlx.core import failed: {e}", file=sys.stderr)
            return 2

        # Run a trivial op
        _ = mx.array([1, 2, 3])  # type: ignore[attr-defined]

        # Optional: check mlx_lm importability without importlib.util
        try:
            import mlx_lm  # type: ignore  # noqa: F401

            lm_ok = True
        except Exception:
            lm_ok = False

        print("MLX core: OK; MLX-LM:", "OK" if lm_ok else "missing")
        return 0
    except Exception as e:  # pragma: no cover - safety path
        print(f"MLX verification failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
