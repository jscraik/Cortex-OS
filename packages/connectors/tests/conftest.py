"""Test configuration for connectors package."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "connectors" / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
