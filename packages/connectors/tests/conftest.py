"""Test configuration for connectors package."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "connectors" / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import pytest

from cortex_connectors.settings import Settings


@pytest.fixture
def manifest_payload() -> Dict[str, Any]:
    """Connector manifest used across tests with a Wikidata entry."""

    connectors: List[Dict[str, Any]] = [
        {
            "id": "alpha",
            "name": "Alpha Connector",
            "displayName": "Alpha Connector",
            "version": "1.0.0",
            "status": "enabled",
            "description": "Baseline connector used for smoke validation.",
            "endpoint": "https://example.invalid/alpha",
            "auth": {"type": "bearer", "headerName": "Authorization"},
            "authentication": {
                "headers": [
                    {
                        "name": "Authorization",
                        "value": "Bearer ${ALPHA_TOKEN}",
                    }
                ]
            },
            "scopes": ["alpha:read"],
            "quotas": {
                "perMinute": 60,
                "perHour": 600,
                "perDay": 6000,
            },
            "ttlSeconds": 600,
            "metadata": {"owner": "qa"},
        },
        {
            "id": "wikidata",
            "name": "Wikidata Connector",
            "displayName": "Wikidata Connector",
            "version": "0.2.0",
            "status": "enabled",
            "description": "Wikidata knowledge graph connector exposing fact lookup tools.",
            "endpoint": "https://example.invalid/wikidata",
            "auth": {"type": "bearer", "headerName": "Authorization"},
            "authentication": {
                "headers": [
                    {
                        "name": "Authorization",
                        "value": "Bearer ${WIKIDATA_TOKEN}",
                    }
                ]
            },
            "scopes": ["wikidata:read", "wikidata:query"],
            "quotas": {
                "perMinute": 30,
                "perHour": 300,
                "perDay": 2400,
            },
            "ttlSeconds": 900,
            "metadata": {
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
            "name": "Beta Connector",
            "displayName": "Beta Connector",
            "version": "1.0.0",
            "status": "disabled",
            "description": "Disabled connector kept for regression coverage.",
            "endpoint": "https://example.invalid/beta",
            "auth": {"type": "apiKey", "headerName": "X-Api-Key"},
            "authentication": {
                "headers": [
                    {
                        "name": "X-Api-Key",
                        "value": "${BETA_TOKEN}",
                    }
                ]
            },
            "scopes": ["beta:write"],
            "quotas": {
                "perMinute": 10,
                "perHour": 100,
                "perDay": 800,
            },
            "ttlSeconds": 300,
            "metadata": {"notes": "Disabled for preview"},
        },
    ]

    return {
        "id": "01J7X5MB4K1ZW0000000000000",
        "schemaVersion": "1.0.0",
        "manifestVersion": "1.0.0",
        "generatedAt": "2025-01-01T00:00:00Z",
        "connectors": connectors,
        "ttlSeconds": 900,
        "brand": "brAInwav",
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
