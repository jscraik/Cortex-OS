from __future__ import annotations

import asyncio
import base64
import sys
import time
from pathlib import Path
from typing import Callable

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_PATH = PROJECT_ROOT / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))


def pytest_addoption(parser: pytest.Parser) -> None:
    """
    Register compatibility options for async tests when pytest-asyncio is unavailable.

    This function adds the 'asyncio_mode' ini option to pytest, acting as a compatibility
    shim to allow async test execution in environments where pytest-asyncio is not installed.
    """
    parser.addini("asyncio_mode", "Compatibility shim for pytest-asyncio", default="auto")


def pytest_configure(config: pytest.Config) -> None:
    """Ensure the asyncio marker is always defined."""

    config.addinivalue_line("markers", "asyncio: mark test as async-compatible")


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """Execute coroutine tests without requiring pytest-asyncio."""

    if pyfuncitem.config.pluginmanager.hasplugin("asyncio"):
        return None

    test_obj = pyfuncitem.obj
    if asyncio.iscoroutinefunction(test_obj):
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            fixture_info = getattr(pyfuncitem, '_fixtureinfo', None)
            if fixture_info is not None:
                call_args = {
                    name: pyfuncitem.funcargs[name]
                    for name in fixture_info.argnames
                    if name in pyfuncitem.funcargs
                }
            else:
                call_args = pyfuncitem.funcargs
            loop.run_until_complete(test_obj(**call_args))
        finally:
            loop.run_until_complete(loop.shutdown_asyncgens())
            asyncio.set_event_loop(None)
            loop.close()
        return True

    return None


# --- OAuth / JWT fixtures -------------------------------------------------- #


@pytest.fixture(scope="session")
def rsa_keypair() -> tuple[rsa.RSAPrivateKey, dict[str, str]]:
    """Generate a deterministic RSA keypair for JWKS-backed tests."""

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key().public_numbers()
    modulus_bytes = public_key.n.to_bytes((public_key.n.bit_length() + 7) // 8, "big")
    exponent_bytes = public_key.e.to_bytes((public_key.e.bit_length() + 7) // 8, "big")

    def b64(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    jwk = {
        "kty": "RSA",
        "kid": "test-key",
        "use": "sig",
        "alg": "RS256",
        "n": b64(modulus_bytes),
        "e": b64(exponent_bytes),
    }
    return private_key, jwk


@pytest.fixture()
def jwks_payload(rsa_keypair: tuple[rsa.RSAPrivateKey, dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    """Return a JWKS payload for the generated RSA key."""

    _, jwk = rsa_keypair
    return {"keys": [jwk]}


@pytest.fixture()
def token_factory(
    rsa_keypair: tuple[rsa.RSAPrivateKey, dict[str, str]],
) -> Callable[..., str]:
    """Produce signed JWTs for tests."""

    private_key, jwk = rsa_keypair
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    def _make_token(
        *,
        scopes: list[str],
        issuer: str = "https://id.brainwav.dev",
        audience: str = "https://api.brainwav.dev/mcp",
        subject: str = "user-123",
        email: str | None = "user@example.com",
        expires_in: int = 300,
        issued_at: int | None = None,
        kid: str | None = None,
    ) -> str:
        now = int(issued_at or time.time())
        payload = {
            "iss": issuer,
            "aud": audience,
            "sub": subject,
            "scope": " ".join(scopes),
            "email": email,
            "exp": now + expires_in,
            "iat": now,
        }
        headers = {"kid": kid or jwk["kid"]}
        return jwt.encode(payload, pem, algorithm="RS256", headers=headers)

    return _make_token
