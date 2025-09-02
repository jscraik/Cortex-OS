"""Basic error handler."""

from typing import Dict, Any


def handle_error(error: Exception) -> Dict[str, Any]:
    """Convert an exception into a standardized error dict."""
    return {"code": -1, "message": str(error)}
