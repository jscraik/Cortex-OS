"""Contract tests for the data pipeline."""

from __future__ import annotations

from pathlib import Path
import importlib.util

import pandas as pd  # type: ignore[import-untyped]
import pytest
import great_expectations as ge  # type: ignore[import-untyped]

spec = importlib.util.spec_from_file_location(
    "pipeline", Path(__file__).resolve().parents[1] / "pipeline.py"
)
assert spec and spec.loader
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


def _sample_records() -> list[dict[str, object]]:
    return [
        {"id": 1, "value": 10, "email": "a@example.com"},
        {"id": 2, "value": 20, "email": "b@example.com"},
    ]


def test_schema_validation() -> None:
    df = pipeline.ingest(_sample_records())
    gdf = ge.dataset.PandasDataset(df)
    gdf.expect_table_columns_to_match_ordered_list(["id", "value", "email"])
    gdf.expect_column_values_to_not_be_null("id")
    gdf.expect_column_values_to_be_unique("id")


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
        pipeline.ingest([{ "id": 1, "value": 10 }])

