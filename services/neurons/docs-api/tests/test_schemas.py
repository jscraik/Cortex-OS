import pytest
from pydantic import ValidationError
from schemas.analytics import UserEventCreate
from schemas.content import DocumentCreate


def test_user_event_create_invalid_event_type():
    with pytest.raises(ValidationError):
        UserEventCreate(session_id="s", event_type="invalid")


def test_document_create_too_many_tags():
    tags = [str(i) for i in range(21)]
    with pytest.raises(ValidationError):
        DocumentCreate(path="/p", title="t", content="c", tags=tags)
