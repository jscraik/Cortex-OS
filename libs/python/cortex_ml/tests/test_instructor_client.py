import os

import pytest

try:
    from cortex_ml.instructor_client import create_sync_instructor

    HAVE_UTIL = True
except Exception:
    HAVE_UTIL = False


@pytest.mark.skipif(not HAVE_UTIL, reason="instructor utility not importable")
def test_create_sync_instructor_constructs_client():
    os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    client = create_sync_instructor()
    # basic surface API checks
    assert hasattr(client, "chat")
    assert hasattr(client.chat, "completions")
    assert hasattr(client.chat.completions, "create")
