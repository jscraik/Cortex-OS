"""Shared manifest schema utilities."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from jsonschema import Draft202012Validator

SCHEMA_PATH = Path(__file__).resolve().parents[4] / "schemas" / "connectors-manifest.schema.json"


class ManifestSchemaError(RuntimeError):
    """Raised when the manifest fails schema validation."""


@lru_cache(maxsize=1)
def _load_schema() -> Dict[str, Any]:
    with SCHEMA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    return Draft202012Validator(_load_schema())


def validate_manifest_document(document: Any) -> None:
    """Validate a manifest document against the canonical JSON schema."""

    validator = _validator()
    errors = sorted(validator.iter_errors(document), key=lambda err: err.path)

    if not errors:
        return

    first = errors[0]
    path = ".".join(str(token) for token in first.path) or "<root>"
    raise ManifestSchemaError(
        f"[brAInwav] Manifest schema validation failed at {path}: {first.message}"
    )


__all__ = ["validate_manifest_document", "ManifestSchemaError", "SCHEMA_PATH"]
