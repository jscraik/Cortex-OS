"""Basic error handler."""

from typing import Any


def handle_error(error: Exception) -> dict[str, Any]:
    """Convert an exception into a standardized error dict."""
    return {"code": -1, "message": str(error)}
