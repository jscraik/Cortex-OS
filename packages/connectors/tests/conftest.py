from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import pytest

from cortex_connectors.settings import Settings


@pytest.fixture
def manifest_payload() -> Dict[str, object]:
    now = datetime(2025, 1, 1, tzinfo=timezone.utc)
    return {
        "metadata": {"version": "2025.01", "generatedAt": now.isoformat()},
        "connectors": [
            {
                "id": "alpha",
                "name": "Alpha",
                "description": "Enabled connector",
                "enabled": True,
                "scopes": ["tasks:read"],
                "auth": {"headerName": "X-Alpha-Key", "scheme": "Bearer", "locations": ["header"]},
                "endpoints": {"http": "https://alpha.example/api", "sse": "https://alpha.example/sse"},
                "metadata": {"owner": "core"},
                "quotaPerMinute": 120,
                "ttlSeconds": 3600,
            },
            {
                "id": "beta",
                "name": "Beta",
                "description": "Disabled connector",
                "enabled": False,
                "scopes": ["tasks:write"],
                "auth": {"headerName": "X-Beta-Key", "scheme": "Bearer", "locations": ["header"]},
                "endpoints": {"http": "https://beta.example/api"},
                "metadata": {},
            },
        ],
    }


@pytest.fixture
def manifest_file(tmp_path: Path, manifest_payload: Dict[str, object]) -> Path:
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest_payload), encoding="utf-8")
    return path


@pytest.fixture
def apps_bundle_dir(tmp_path: Path) -> Path:
    bundle_dir = tmp_path / "bundle"
    bundle_dir.mkdir()
    (bundle_dir / "index.html").write_text("<html>bundle</html>", encoding="utf-8")
    return bundle_dir


@pytest.fixture
def settings(manifest_file: Path, apps_bundle_dir: Path) -> Settings:
    return Settings(
        signature_key="secret",
        manifest_path=manifest_file,
        api_key="supersecret",
        mcp_api_key="mcp",
        no_auth=False,
        log_level="info",
        apps_bundle_dir=apps_bundle_dir,
        enable_prometheus=True,
    )


@pytest.fixture
def auth_header(settings: Settings) -> Dict[str, str]:
    return {"Authorization": f"Bearer {settings.api_key}"}
