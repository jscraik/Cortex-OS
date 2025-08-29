"""Core utilities for the data pipeline service."""

from __future__ import annotations

import pandas as pd  # type: ignore[import-untyped]

REQUIRED_COLUMNS = ["id", "value", "email"]


def ingest(records: list[dict[str, object]]) -> pd.DataFrame:
    """Ingest raw records into a validated DataFrame.

    Missing required columns raise ``ValueError``. Duplicate ``id`` values are
    dropped to keep the job idempotent.
    """

    df = pd.DataFrame(records)
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    return df.drop_duplicates(subset="id").reset_index(drop=True)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Apply simple transformation to the ``value`` column."""

    out = df.copy()
    out["value"] = out["value"].astype(int) * 2
    return out


def add_lineage_metadata(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Annotate records with lineage metadata."""

    out = df.copy()
    out["lineage_source"] = source
    return out


def mask_pii(df: pd.DataFrame) -> pd.DataFrame:
    """Mask PII such as email addresses."""

    out = df.copy()
    if "email" in out.columns:
        out["email"] = "***redacted***"
    return out


def backfill(
    current: pd.DataFrame, historical: list[dict[str, object]]
) -> pd.DataFrame:
    """Merge historical records while avoiding duplicate ``id`` values."""

    hist_df = pd.DataFrame(historical)
    combined = pd.concat([current, hist_df])
    return combined.drop_duplicates(subset="id").reset_index(drop=True)
