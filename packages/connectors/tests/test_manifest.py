import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import pytest

from cortex_connectors.manifest import (
    build_connector_service_map,
    load_connectors_manifest,
    sign_connector_service_map,
)
from cortex_connectors.models import ConnectorsManifest

ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = ROOT / "config" / "connectors.manifest.json"
FIXTURES_PATH = ROOT / "testdata" / "connectors"


def _validate_connector_entry(entry: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    required = {
        "id",
        "name",
        "displayName",
        "version",
        "enabled",
        "version",
        "status",
        "endpoint",
        "authentication",
        "scopes",
        "ttlSeconds",
        "endpoint",
        "auth",
    }
    allowed = required | {"description", "metadata", "quotas", "timeouts", "status", "tags"}
    allowed = required | {"description", "metadata", "headers", "tags"}

    missing = required - entry.keys()
    if missing:
        errors.append(f"missing fields: {sorted(missing)}")

    unexpected = set(entry.keys()) - allowed
    if unexpected:
        errors.append(f"unexpected fields: {sorted(unexpected)}")

    connector_id = entry.get("id")
    if not isinstance(connector_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}", connector_id):
        errors.append("id must match ^[a-z0-9][a-z0-9-]{1,62}$")

    name = entry.get("name")
    if not isinstance(name, str) or not name.strip():
        errors.append("name must be a non-empty string")

    display_name = entry.get("displayName")
    if not isinstance(display_name, str) or not display_name.strip():
        errors.append("displayName must be a non-empty string")
    endpoint = entry.get("endpoint")
    if not isinstance(endpoint, str) or not endpoint.strip():
        errors.append("endpoint must be a non-empty string")

    version = entry.get("version")
    if not isinstance(version, str) or not version.strip():
        errors.append("version must be a non-empty string")

    enabled = entry.get("enabled")
    if not isinstance(enabled, bool):
        errors.append("enabled must be a boolean")

    scopes = entry.get("scopes")
    if not isinstance(scopes, list) or not scopes:
        errors.append("scopes must be a non-empty array")
    else:
        if any(not isinstance(scope, str) or not scope.strip() for scope in scopes):
            errors.append("scopes must be non-empty strings")
        if len(set(scope for scope in scopes if isinstance(scope, str))) != len(scopes):
            errors.append("scopes must contain unique string values")

    ttl_seconds = entry.get("ttlSeconds")
    quotas = entry.get("quotas")
    if not isinstance(quotas, dict):
        errors.append("quotas must be an object")
    else:
        for field in ("per_minute", "per_hour", "per_day", "concurrent"):
            value = quotas.get(field)
            if value is not None and (not isinstance(value, int) or value < 0):
                errors.append(f"quotas.{field} must be an integer >= 0 when provided")

    ttl_seconds = entry.get("ttl_seconds")
    if not isinstance(ttl_seconds, int) or ttl_seconds < 1:
        errors.append("ttlSeconds must be a positive integer")

    endpoint = entry.get("endpoint")
    if not isinstance(endpoint, str) or not endpoint.startswith("http"):
        errors.append("endpoint must be a URL string")

    auth = entry.get("auth")
    if not isinstance(auth, dict):
        errors.append("auth must be an object")
    else:
        auth_type = auth.get("type")
        if auth_type not in {"apiKey", "bearer", "none"}:
            errors.append("auth.type must be one of ['apiKey', 'bearer', 'none']")
        header_name = auth.get("headerName")
        if auth_type in {"apiKey", "bearer"} and (not isinstance(header_name, str) or not header_name.strip()):
            errors.append("auth.headerName must be a non-empty string when auth.type requires a header")

    metadata = entry.get("metadata")
    if metadata is not None:
        if not isinstance(metadata, dict) or any(not isinstance(key, str) for key in metadata.keys()):
            errors.append("metadata must be an object with string keys")

    headers_map = entry.get("headers")
    if headers_map is not None:
        if not isinstance(headers_map, dict):
            errors.append("headers must be an object when provided")
        elif any(not isinstance(k, str) or not isinstance(v, str) for k, v in headers_map.items()):
            errors.append("headers must map string keys to string values")

    tags = entry.get("tags")
    if tags is not None:
        if not isinstance(tags, list):
            errors.append("tags must be an array of strings")
        elif any(not isinstance(tag, str) or not tag.strip() for tag in tags):
            errors.append("tags must contain non-empty strings")

    return errors


def _validate_manifest(document: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    required = {"id", "manifestVersion", "connectors"}
    allowed = required | {"$schema", "generatedAt", "ttlSeconds", "metadata"}
    required = {"id", "schema_version", "connectors"}
    allowed = required | {"generated_at", "$schema"}

    missing = required - document.keys()
    if missing:
        errors.append(f"missing fields: {sorted(missing)}")

    unexpected = set(document.keys()) - allowed
    if unexpected:
        errors.append(f"unexpected fields: {sorted(unexpected)}")

    manifest_id = document.get("id")
    if not isinstance(manifest_id, str) or not manifest_id.strip():
        errors.append("id must be a non-empty string")

    manifest_version = document.get("manifestVersion")
    if not isinstance(manifest_version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", manifest_version):
        errors.append("manifestVersion must follow semantic versioning")

    generated_at = document.get("generatedAt")
    if generated_at is not None:
        if not isinstance(generated_at, str):
            errors.append("generatedAt must be an ISO-8601 string")
        else:
            try:
                datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
            except ValueError:
                errors.append("generatedAt must be a valid ISO-8601 timestamp")

    ttl_seconds = document.get("ttlSeconds")
    if ttl_seconds is not None and (not isinstance(ttl_seconds, int) or ttl_seconds < 1):
        errors.append("ttlSeconds must be a positive integer when provided")

    connectors = document.get("connectors")
    if not isinstance(connectors, list) or not connectors:
        errors.append("connectors must be a non-empty array")
    else:
        for index, connector in enumerate(connectors):
            if not isinstance(connector, dict):
                errors.append(f"connector[{index}] must be an object")
                continue
            connector_errors = _validate_connector_entry(connector)
            errors.extend(f"connector[{index}]: {message}" for message in connector_errors)

    return errors


def test_manifest_matches_json_schema() -> None:
    document = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    errors = _validate_manifest(document)
    assert not errors, "Schema validation errors: " + "; ".join(errors)


def test_loader_returns_pydantic_model() -> None:
    manifest = load_connectors_manifest(MANIFEST_PATH)
    assert isinstance(manifest, ConnectorsManifest)
    assert manifest.manifest_version == "2024.09.18"
    assert len(manifest.connectors) == 1
    connector = manifest.connectors[0]
    assert connector.display_name == "Wikidata Semantic Search"
    assert connector.enabled is True
    assert connector.auth.type == "none"
    assert manifest.schema_version == "1.1.0"
    assert len(manifest.connectors) == 2
    first = manifest.connectors[0]
    assert first.name
    assert first.endpoint.scheme in {"http", "https"}
    assert first.authentication.headers


def test_service_map_signature_is_deterministic() -> None:
    manifest = load_connectors_manifest(MANIFEST_PATH)
    service_map = build_connector_service_map(manifest)

    assert [entry.id for entry in service_map.connectors] == ["wikidata"]
    connector = service_map.connectors[0]
    assert service_map.brand == "brAInwav"
    assert service_map.generated_at == "2024-09-18T00:00:00Z"
    assert connector.display_name == "Wikidata Semantic Search"
    assert connector.metadata["vectorModel"] == "jina-embeddings-v3"

    signature = sign_connector_service_map(service_map, "test-secret")
    assert signature == "3e080d883ac7d57c88fa843c7ca2a59806dfdf2c5e549376b9b809a1d36c252c"
    payload = service_map.model_dump(by_alias=True, mode="json", exclude_none=True)
    assert payload == {
        "id": "01J0XKQ4R6V7Z9P3S5T7W9YBCD",
        "brand": "brAInwav",
        "generatedAt": "2025-01-01T00:00:00Z",
        "ttlSeconds": 900,
        "connectors": [
            {
                "id": "github-actions",
                "version": "0.4.1",
                "displayName": "GitHub Actions Dispatcher",
                "endpoint": "https://connectors.brainwav.ai/github/actions",
                "auth": {"type": "apiKey", "headerName": "X-GitHub-Token"},
                "scopes": ["repos:read", "actions:trigger"],
                "ttlSeconds": 900,
                "enabled": False,
                "metadata": {
                    "brand": "brAInwav",
                    "notes": "Disabled until SOC2 control review completes",
                    "category": "automation",
                },
                "quotas": {"perMinute": 5, "perHour": 50},
                "headers": {"X-GitHub-Token": "${GITHUB_TOKEN:provided-at-runtime}"},
                "description": "Prototype connector that dispatches GitHub workflow runs once security review completes.",
                "tags": ["automation", "ci"],
            },
            {
                "id": "perplexity-search",
                "version": "1.2.0",
                "displayName": "Perplexity Search",
                "endpoint": "https://connectors.brainwav.ai/perplexity/search",
                "auth": {"type": "bearer", "headerName": "Authorization"},
                "scopes": ["search:query", "search:insights"],
                "ttlSeconds": 3600,
                "enabled": True,
                "metadata": {
                    "brand": "brAInwav",
                    "owner": "integrations",
                    "category": "search",
                },
                "quotas": {"perMinute": 30, "perHour": 300, "concurrent": 8},
                "headers": {
                    "Authorization": "Bearer ${PERPLEXITY_API_KEY}",
                    "X-Cortex-Connector": "perplexity-search",
                },
                "description": "Search aggregation connector that proxies Perplexity Answers without exposing API secrets.",
                "tags": ["search", "knowledge"],
            },
        ],
    }

    signature = sign_connector_service_map(service_map, "test-secret")
    assert signature == "p1BDrOB5DkN2G8Q6TKF6bRuBKHSxDhClD_d1nByCK3g"


def test_wikidata_fixture_roundtrip() -> None:
    manifest_doc = json.loads((FIXTURES_PATH / "wikidata.manifest.json").read_text(encoding="utf-8"))
    expected_payload = json.loads((FIXTURES_PATH / "wikidata-service-map.json").read_text(encoding="utf-8"))

    manifest = ConnectorsManifest.model_validate(manifest_doc)
    service_map = build_connector_service_map(manifest)
    payload = service_map.model_dump(by_alias=True, mode="json", exclude_none=True)

    assert payload == expected_payload


@pytest.mark.parametrize(
    "secret",
    ["", None],
)
def test_sign_connector_service_map_requires_secret(secret: str | None) -> None:
    manifest = load_connectors_manifest(MANIFEST_PATH)
    service_map = build_connector_service_map(manifest)

    with pytest.raises(ValueError):
        sign_connector_service_map(service_map, secret or "")
