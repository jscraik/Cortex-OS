from __future__ import annotations

import sys
from pathlib import Path

_workspace_root = Path(__file__).resolve().parents[2]
if str(_workspace_root) not in sys.path:
    sys.path.insert(0, str(_workspace_root))

from tools.python.tdd_coach_plugin import *  # noqa: F401,F403
