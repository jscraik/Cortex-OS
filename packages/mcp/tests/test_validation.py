import pytest
from jsonschema import ValidationError

from mcp.core.validation import validate_mcp_message


def test_validate_mcp_message_requires_id():
    with pytest.raises(ValidationError):
        validate_mcp_message({"type": "request", "jsonrpc": "2.0"})
