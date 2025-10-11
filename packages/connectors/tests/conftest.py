"""Test configuration for connectors package."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import pytest

from cortex_connectors.settings import Settings

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "connectors" / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture
def manifest_payload() -> Dict[str, Any]:
    """Connector manifest used across tests with a Wikidata entry."""

    def quotas(per_minute: int, per_hour: int, per_day: int) -> Dict[str, int]:
        return {
            "per_minute": per_minute,
            "per_hour": per_hour,
            "per_day": per_day,
        }

    connectors: List[Dict[str, Any]] = [
        {
            "id": "alpha",
            "version": "1.0.0",
            "status": "enabled",
            "description": "Baseline connector used for smoke validation.",
            "authentication": {
                "headers": [
                    {
                        "name": "Authorization",
                        "value": "Bearer ${ALPHA_TOKEN}",
                    }
                ]
            },
            "scopes": ["alpha:read"],
            "quotas": quotas(60, 600, 6000),
            "ttl_seconds": 600,
            "metadata": {"owner": "qa", "brand": "brAInwav"},
        },
        {
            "id": "wikidata",
            "version": "0.2.0",
            "status": "enabled",
            "description": "Wikidata knowledge graph connector exposing fact lookup tools.",
            "authentication": {
                "headers": [
                    {
                        "name": "Authorization",
                        "value": "Bearer ${WIKIDATA_TOKEN}",
                    }
                ]
            },
            "scopes": ["wikidata:read", "wikidata:query"],
            "quotas": quotas(30, 300, 2400),
            "ttl_seconds": 900,
            "metadata": {
                "brand": "brAInwav",
                "category": "knowledge-graph",
                "tools": [
                    {
                        "name": "vector_search",
                        "description": "Semantic entity and identifier lookup",
                    },
                    {
                        "name": "sparql",
                        "description": "Execute Wikidata SPARQL queries",
                    },
                ],
            },
        },
        {
            "id": "beta",
            "version": "1.0.0",
            "status": "disabled",
            "description": "Disabled connector kept for regression coverage.",
            "authentication": {
                "headers": [
                    {
                        "name": "X-Api-Key",
                        "value": "${BETA_TOKEN}",
                    }
                ]
            },
            "scopes": ["beta:write"],
            "quotas": quotas(10, 100, 800),
            "ttl_seconds": 300,
            "metadata": {"brand": "brAInwav", "notes": "Disabled for preview"},
        },
    ]

    return {
        "schema_version": "1.0.0",
        "generated_at": "2025-01-01T00:00:00Z",
        "connectors": connectors,
    }


@pytest.fixture
def manifest_file(tmp_path: Path, manifest_payload: Dict[str, Any]) -> Path:
    """Persist the shared manifest payload to a temporary file."""

    manifest_path = tmp_path / "connectors.manifest.json"
    manifest_path.write_text(json.dumps(manifest_payload), encoding="utf-8")
    return manifest_path


@pytest.fixture
def settings(tmp_path: Path, manifest_file: Path) -> Settings:
    """Settings wired to the temporary manifest and bundle assets."""

    bundle_dir = tmp_path / "bundle"
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "index.html").write_text("<html>bundle</html>", encoding="utf-8")

    return Settings(
        signature_key="test-signature",
        manifest_path=manifest_file,
        api_key="connectors-api",
        mcp_api_key="mcp-api",
        no_auth=False,
        log_level="info",
        apps_bundle_dir=bundle_dir,
        enable_prometheus=True,
    )
