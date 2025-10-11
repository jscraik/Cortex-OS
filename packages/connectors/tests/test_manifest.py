"""Unit tests for manifest utilities."""

from __future__ import annotations

import base64
from pathlib import Path

import pytest

from cortex_connectors.manifest import (
    attach_signature,
    build_connector_service_map,
    load_connectors_manifest,
    sign_connector_service_map,
)
from cortex_connectors.models import ConnectorsManifest


def test_build_connector_service_map(manifest_payload: dict[str, object]) -> None:
    manifest = ConnectorsManifest.model_validate(manifest_payload)

    payload = build_connector_service_map(manifest)

    assert payload.id == manifest.id
    assert payload.brand == "brAInwav"
    assert payload.generated_at == manifest.generated_at
    assert payload.ttl_seconds == 300  # lowest per-connector TTL
    assert [connector.id for connector in payload.connectors] == ["alpha", "beta", "wikidata"]

    alpha = payload.connectors[0]
    assert alpha.enabled is True
    assert alpha.auth.type == "bearer"
    assert alpha.metadata["brand"] == "brAInwav"
    assert alpha.headers == {"Authorization": "Bearer ${ALPHA_TOKEN}"}

    beta = payload.connectors[1]
    assert beta.enabled is False
    assert beta.auth.header_name == "X-Api-Key"


def test_sign_and_attach_signature_round_trip(manifest_payload: dict[str, object]) -> None:
    manifest = ConnectorsManifest.model_validate(manifest_payload)
    payload = build_connector_service_map(manifest)

    secret = "test-secret"
    signature = sign_connector_service_map(payload, secret)

    # Ensure the signature is valid base64url without padding
    base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))

    signed = attach_signature(payload, signature)
    assert signed.signature == signature


def test_load_connectors_manifest_from_disk(manifest_file: Path) -> None:
    manifest = load_connectors_manifest(manifest_file)

    assert isinstance(manifest, ConnectorsManifest)
    assert manifest.connectors
    assert manifest.connectors[0].id == "alpha"

