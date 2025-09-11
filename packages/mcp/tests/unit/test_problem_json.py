"""Unit tests for Problem+JSON helpers."""

from mcp.error_handling.problem_json import problem_detail


def test_problem_detail_basic_fields():
    payload = problem_detail(title="Not Found", status=404, detail="Missing")
    assert payload["type"] == "about:blank"
    assert payload["title"] == "Not Found"
    assert payload["status"] == 404
    assert payload["detail"] == "Missing"


def test_problem_detail_merges_extra_without_overwrite():
    payload = problem_detail(
        title="Bad Request",
        status=400,
        detail="Invalid",
        extra={"status": 200, "hint": "fix input"},
    )
    # Must not overwrite standard fields
    assert payload["status"] == 400
    assert payload["title"] == "Bad Request"
    # Extra fields are included
    assert payload["hint"] == "fix input"

