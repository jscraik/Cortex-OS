"""Input validation and output sanitization helpers.

Keep functions short to comply with CODESTYLE. Optional bleach dependency is
used when available; otherwise fall back to html.escape.
"""

from __future__ import annotations

import html
import re
from typing import Any

try:  # optional dependency
    import bleach  # type: ignore
except Exception:  # pragma: no cover - bleach not installed
    bleach = None  # type: ignore


def _has_dangerous_pattern(text: str) -> bool:
    patterns = [
        r";\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)",
        r"--",
        r"/\*.*\*/",
        r"xp_cmdshell",
        r"sp_executesql",
    ]
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def validate_search_query(query: str) -> str:
    q = (query or "").strip()
    if not q:
        raise ValueError("query must not be empty")
    if len(q) > 1000:
        raise ValueError("query exceeds maximum length")
    if _has_dangerous_pattern(q):
        raise ValueError("dangerous pattern detected in query")
    return html.escape(q)


def validate_resource_id(resource_id: str) -> str:
    rid = (resource_id or "").strip()
    if not rid:
        raise ValueError("resource_id must not be empty")
    if len(rid) > 100:
        raise ValueError("resource_id exceeds maximum length")
    if ".." in rid or "/" in rid or "\\" in rid:
        raise ValueError("invalid resource_id format")
    return rid


def sanitize_output(value: Any) -> Any:
    if isinstance(value, str):
        if bleach:
            return bleach.clean(value, tags=[], strip=True)  # type: ignore[no-any-return]
        return html.escape(value)
    if isinstance(value, dict):
        return {k: sanitize_output(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_output(v) for v in value]
    return value
