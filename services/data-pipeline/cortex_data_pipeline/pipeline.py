"""Core utilities for the data pipeline service."""

from __future__ import annotations

import hashlib
import re
from typing import Any

import pandas as pd  # type: ignore[import-untyped]

REQUIRED_COLUMNS = ["id", "value", "email"]
EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")


def ingest(records: list[dict[str, Any]]) -> pd.DataFrame:
    """Ingest raw records into a validated DataFrame.

    Missing required columns raise ``ValueError``. Duplicate ``id`` values are
    dropped to keep the job idempotent. Basic data quality checks are enforced
    via Great Expectations.
    """

    df = pd.DataFrame(records)
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    if not df["id"].notna().all():
        raise ValueError("id column contains null values")
    if not df["email"].astype(str).str.match(EMAIL_REGEX).all():
        raise ValueError("Invalid email format")

    return df.drop_duplicates(subset="id").reset_index(drop=True)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Apply simple transformation to the ``value`` column."""

    out = df.copy()
    try:
        out["value"] = pd.to_numeric(out["value"], errors="raise").astype(int) * 2
    except (ValueError, TypeError) as exc:
        raise ValueError("Non-numeric value encountered in 'value' column") from exc
    return out


def add_lineage_metadata(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Annotate records with lineage metadata."""

    out = df.copy()
    out["lineage_source"] = source
    return out


def mask_pii(df: pd.DataFrame) -> pd.DataFrame:
    """Mask PII such as email addresses while preserving domain information."""

    out = df.copy()

    def _mask_email(email: Any) -> Any:
        if isinstance(email, str) and "@" in email:
            local, _, domain = email.partition("@")
            hashed = hashlib.sha256(local.encode()).hexdigest()[:8]
            return f"{hashed}@{domain}"
        return email

    out["email"] = out["email"].map(_mask_email)
    return out


def backfill(
    current: pd.DataFrame, historical: list[dict[str, Any]]
) -> pd.DataFrame:
    """Merge historical records while avoiding duplicate ``id`` values."""

    hist_df = pd.DataFrame(historical)
    combined = pd.concat([current, hist_df])
    return combined.drop_duplicates(subset="id").reset_index(drop=True)
