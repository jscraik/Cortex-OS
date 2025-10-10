from __future__ import annotations

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from cortex_connectors.auth import APIKeyAuthenticator


def make_request(headers: dict[str, str]) -> Request:
    scope = {
        "type": "http",
        "headers": [(key.lower().encode("latin-1"), value.encode("latin-1")) for key, value in headers.items()],
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_authenticator_allows_valid_token() -> None:
    authenticator = APIKeyAuthenticator("secret")
    request = make_request({"Authorization": "Bearer secret"})
    await authenticator(request)  # Should not raise


@pytest.mark.asyncio
async def test_authenticator_rejects_missing_header() -> None:
    authenticator = APIKeyAuthenticator("secret")
    with pytest.raises(HTTPException) as exc:
        await authenticator(make_request({}))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticator_rejects_invalid_token() -> None:
    authenticator = APIKeyAuthenticator("secret")
    with pytest.raises(HTTPException) as exc:
        await authenticator(make_request({"Authorization": "Bearer nope"}))
    assert exc.value.status_code == 403


def test_protect_honors_no_auth() -> None:
    authenticator = APIKeyAuthenticator(None, no_auth=True)
    authenticator.protect(make_request({}))  # Should not raise


def test_protect_requires_valid_bearer() -> None:
    authenticator = APIKeyAuthenticator("secret")
    with pytest.raises(HTTPException):
        authenticator.protect(make_request({}))
    with pytest.raises(HTTPException):
        authenticator.protect(make_request({"Authorization": "Basic abc"}))
    authenticator.protect(make_request({"Authorization": "Bearer secret"}))
