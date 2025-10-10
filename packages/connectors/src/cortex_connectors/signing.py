"""Signing helpers shared with ASBR for service-map parity."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any, Dict


def _canonical_json(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def generate_service_map_signature(payload: Dict[str, Any], key: str) -> str:
    message = _canonical_json(payload)
    signature = hmac.new(key.encode("utf-8"), message, hashlib.sha256)
    return signature.hexdigest()


__all__ = ["generate_service_map_signature"]
