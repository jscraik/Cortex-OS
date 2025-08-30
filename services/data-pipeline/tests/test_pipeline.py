"""Contract tests for the data pipeline."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd  # type: ignore[import-untyped]
import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))
import pipeline


def _sample_records() -> list[dict[str, object]]:
    return [
        {"id": 1, "value": 10, "email": "a@example.com"},
        {"id": 2, "value": 20, "email": "b@example.com"},
    ]


def test_schema_validation() -> None:
    df = pipeline.ingest(_sample_records())
    # Basic schema validation
    assert list(df.columns) == ["id", "value", "email"]
    assert df["id"].notna().all()
    assert df["id"].is_unique


def test_ingest_idempotent() -> None:
    df1 = pipeline.ingest(_sample_records())
    df2 = pipeline.ingest(_sample_records())
    pd.testing.assert_frame_equal(df1, df2)


def test_backfill_simulation() -> None:
    current = pipeline.ingest(_sample_records())
    historical = [
        {"id": 2, "value": 20, "email": "b@example.com"},
        {"id": 3, "value": 30, "email": "c@example.com"},
    ]
    combined = pipeline.backfill(current, historical)
    assert set(combined["id"]) == {1, 2, 3}


def test_lineage_metadata() -> None:
    df = pipeline.ingest(_sample_records())
    df = pipeline.add_lineage_metadata(df, "unit-test")
    assert (df["lineage_source"] == "unit-test").all()


def test_pii_masking() -> None:
    df = pipeline.ingest(_sample_records())
    df = pipeline.mask_pii(df)
    assert not df["email"].str.contains("@").any()


def test_ingest_invalid_schema_failure() -> None:
    with pytest.raises(ValueError):
        pipeline.ingest([{"id": 1, "value": 10}])
