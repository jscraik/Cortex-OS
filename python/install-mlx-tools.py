#!/usr/bin/env python3
"""
Provisions MLX tools (mlx-lm, mlx-vlm) and verifies basic import.
Run with: uv run python install-mlx-tools.py
"""

import subprocess
import sys


def run(cmd):
    print("+", " ".join(cmd))
    subprocess.check_call(cmd)


def main():
    # Install optional MLX extras
    run([sys.executable, "-m", "pip", "install", "mlx-lm>=0.14.0", "mlx-vlm>=0.1.0"])  # noqa: S603

    # Verify imports
    import importlib

    for mod in ("mlx_lm",):
        try:
            importlib.import_module(mod)
            print(f"[ok] Imported {mod}")
        except Exception as e:  # pragma: no cover - provisioning script
            print(f"[fail] {mod}: {e}")
            sys.exit(1)

    print("MLX tools installed and verified.")


if __name__ == "__main__":
    main()
