"""Contract tests for the data pipeline."""

from __future__ import annotations

import pandas as pd  # type: ignore[import-untyped]
import pytest
from cortex_data_pipeline import (
    add_lineage_metadata,
    backfill,
    ingest,
    mask_pii,
    transform,
)


def _sample_records() -> list[dict[str, object]]:
    return [
        {"id": 1, "value": 10, "email": "a@example.com"},
        {"id": 2, "value": 20, "email": "b@example.com"},
    ]


def test_schema_validation() -> None:
    df = ingest(_sample_records())
    assert list(df.columns) == ["id", "value", "email"]
    assert df["id"].notna().all()
    assert df["id"].is_unique


def test_ingest_idempotent() -> None:
    df1 = ingest(_sample_records())
    df2 = ingest(_sample_records())
    pd.testing.assert_frame_equal(df1, df2)


def test_backfill_simulation() -> None:
    current = ingest(_sample_records())
    historical = [
        {"id": 2, "value": 20, "email": "b@example.com"},
        {"id": 3, "value": 30, "email": "c@example.com"},
    ]
    combined = backfill(current, historical)
    assert set(combined["id"]) == {1, 2, 3}


def test_lineage_metadata() -> None:
    df = ingest(_sample_records())
    df = add_lineage_metadata(df, "unit-test")
    assert (df["lineage_source"] == "unit-test").all()


def test_transform() -> None:
    df = ingest(_sample_records())
    transformed = transform(df)
    assert transformed["value"].tolist() == [20, 40]


def test_transform_non_numeric_error() -> None:
    df = ingest(
        [
            {"id": 1, "value": "a", "email": "a@example.com"},
        ]
    )
    with pytest.raises(ValueError, match="Non-numeric value"):
        transform(df)


def test_pii_masking() -> None:
    df = ingest(_sample_records())
    df = mask_pii(df)
    assert df["email"].str.endswith("@example.com").all()
    assert df["email"].str.split("@").str[0].str.len().eq(8).all()


def test_ingest_invalid_schema_failure() -> None:
    with pytest.raises(ValueError):
        ingest([{"id": 1, "value": 10}])


def test_ingest_invalid_email_failure() -> None:
    with pytest.raises(ValueError):
        ingest([{"id": 1, "value": 10, "email": "not-an-email"}])
