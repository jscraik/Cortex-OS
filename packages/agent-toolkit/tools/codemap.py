#!/usr/bin/env python3
"""Thin wrapper that executes the canonical codemap script from the repository."""
from __future__ import annotations

from pathlib import Path
import runpy
import sys

REPO_ROOT = Path(__file__).resolve().parents[2]
TARGET_SCRIPT = REPO_ROOT / 'scripts' / 'codemap.py'

if not TARGET_SCRIPT.exists():
    sys.stderr.write(f"[codemap-wrapper] Unable to locate canonical codemap script at {TARGET_SCRIPT}\n")
    sys.exit(1)

if __name__ == '__main__':
    runpy.run_path(TARGET_SCRIPT, run_name='__main__')
