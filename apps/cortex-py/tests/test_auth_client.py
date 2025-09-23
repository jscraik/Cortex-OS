"""
Tests for Better Auth Python client.
"""

import os
from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from cortex_py.auth import AuthResult, BetterAuthClient, Session, User


@pytest.fixture
def mock_requests():
    """Mock requests module."""
    with patch("cortex_py.auth.better_auth_client.requests") as mock:
        mock_session = Mock()
        mock.Session.return_value = mock_session
        yield mock_session


@pytest.fixture
def auth_client():
    """Create Better Auth client instance."""
    return BetterAuthClient(
        base_url="http://localhost:3001",
        api_key="test-api-key",
        jwt_secret="test-secret",
    )


class TestBetterAuthClient:
    """Test Better Auth client functionality."""

    def test_init(self):
        """Test client initialization."""
        client = BetterAuthClient(
            base_url="http://test.com", api_key="test-key", jwt_secret="test-secret"
        )

        assert client.base_url == "http://test.com"
        assert client.api_key == "test-key"
        assert client.jwt_secret == "test-secret"
        assert client.timeout == 30

    def test_init_from_env(self):
        """Test initialization from environment variables."""
        with patch.dict(
            os.environ,
            {
                "BETTER_AUTH_URL": "http://env-test.com",
                "BETTER_AUTH_API_KEY": "env-api-key",
                "BETTER_AUTH_SECRET": "env-secret",
            },
        ):
            client = BetterAuthClient()
            assert client.base_url == "http://env-test.com"
            assert client.api_key == "env-api-key"
            assert client.jwt_secret == "env-secret"

    def test_register_user_success(self, mock_requests, auth_client):
        """Test successful user registration."""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "user-123",
                "email": "test@example.com",
                "name": "Test User",
                "emailVerified": True,
                "image": "https://example.com/avatar.jpg",
            },
            "session": {
                "id": "session-123",
                "userId": "user-123",
                "token": "test-token",
                "expires": "2024-01-01T12:00:00",
                "createdAt": "2024-01-01T11:00:00",
            },
        }
        mock_requests.request.return_value = mock_response

        # Register user
        result = auth_client.register_user(
            email="test@example.com", password="SecurePass123!", name="Test User"
        )

        # Verify result
        assert result.success is True
        assert result.user is not None
        assert result.user.id == "user-123"
        assert result.user.email == "test@example.com"
        assert result.user.name == "Test User"
        assert result.user.email_verified is True
        assert result.session is not None
        assert result.session.token == "test-token"

        # Verify request
        mock_requests.request.assert_called_once_with(
            "POST",
            "http://localhost:3001/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User",
            },
            headers=None,
            timeout=30,
        )

    def test_register_user_failure(self, mock_requests, auth_client):
        """Test failed user registration."""
        mock_requests.request.side_effect = Exception("Network error")

        result = auth_client.register_user(
            email="test@example.com", password="SecurePass123!"
        )

        assert result.success is False
        assert result.error == "Network error"

    def test_login_success(self, mock_requests, auth_client):
        """Test successful login."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "user-123",
                "email": "test@example.com",
                "emailVerified": False,
            },
            "session": {
                "id": "session-123",
                "userId": "user-123",
                "token": "login-token",
                "expires": "2024-01-01T12:00:00",
                "createdAt": "2024-01-01T11:00:00",
            },
        }
        mock_requests.request.return_value = mock_response

        result = auth_client.login("test@example.com", "password")

        assert result.success is True
        assert result.user.email == "test@example.com"
        assert result.session.token == "login-token"

    def test_get_user(self, mock_requests, auth_client):
        """Test getting user information."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "user-123",
                "email": "test@example.com",
                "name": "Test User",
                "emailVerified": True,
            }
        }
        mock_requests.request.return_value = mock_response

        user = auth_client.get_user("test-token")

        assert user is not None
        assert user.id == "user-123"
        assert user.email == "test@example.com"
        assert user.name == "Test User"

        # Verify headers
        mock_requests.request.assert_called_once()
        call_args = mock_requests.request.call_args
        assert call_args[1]["headers"]["Authorization"] == "Bearer test-token"

    def test_update_user(self, mock_requests, auth_client):
        """Test updating user profile."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "user-123",
                "email": "test@example.com",
                "name": "Updated Name",
                "image": "https://example.com/new-avatar.jpg",
            }
        }
        mock_requests.request.return_value = mock_response

        user = auth_client.update_user(
            "test-token",
            name="Updated Name",
            image="https://example.com/new-avatar.jpg",
        )

        assert user is not None
        assert user.name == "Updated Name"
        assert user.image == "https://example.com/new-avatar.jpg"

    def test_get_sessions(self, mock_requests, auth_client):
        """Test getting user sessions."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "sessions": [
                {
                    "id": "session-1",
                    "userId": "user-123",
                    "expires": "2024-01-01T12:00:00",
                    "createdAt": "2024-01-01T11:00:00",
                    "current": True,
                },
                {
                    "id": "session-2",
                    "userId": "user-123",
                    "expires": "2024-01-02T12:00:00",
                    "createdAt": "2024-01-02T11:00:00",
                    "current": False,
                },
            ]
        }
        mock_requests.request.return_value = mock_response

        sessions = auth_client.get_sessions("test-token")

        assert len(sessions) == 2
        assert sessions[0].id == "session-1"
        assert sessions[0].user_id == "user-123"
        assert sessions[1].id == "session-2"

    def test_revoke_session(self, mock_requests, auth_client):
        """Test revoking a session."""
        mock_requests.request.return_value = Mock(status_code=200)

        result = auth_client.revoke_session("test-token", "session-123")

        assert result is True
        mock_requests.request.assert_called_once_with(
            "DELETE",
            "http://localhost:3001/api/sessions/session-123",
            headers={"Authorization": "Bearer test-token"},
            json=None,
            timeout=30,
        )

    def test_logout(self, mock_requests, auth_client):
        """Test user logout."""
        mock_requests.request.return_value = Mock(status_code=200)

        result = auth_client.logout("test-token")

        assert result is True
        mock_requests.request.assert_called_once_with(
            "POST",
            "http://localhost:3001/auth/logout",
            headers={"Authorization": "Bearer test-token"},
            json=None,
            timeout=30,
        )

    def test_request_password_reset(self, mock_requests, auth_client):
        """Test password reset request."""
        mock_requests.request.return_value = Mock(status_code=200)

        result = auth_client.request_password_reset("test@example.com")

        assert result is True
        mock_requests.request.assert_called_once_with(
            "POST",
            "http://localhost:3001/auth/forgot-password",
            json={"email": "test@example.com"},
            headers=None,
            timeout=30,
        )

    def test_reset_password(self, mock_requests, auth_client):
        """Test password reset."""
        mock_requests.request.return_value = Mock(status_code=200)

        result = auth_client.reset_password("reset-token", "NewPass123!")

        assert result is True
        mock_requests.request.assert_called_once_with(
            "POST",
            "http://localhost:3001/auth/reset-password",
            json={"token": "reset-token", "password": "NewPass123!"},
            headers=None,
            timeout=30,
        )

    @patch("cortex_py.auth.better_auth_client.jwt")
    def test_verify_token_success(self, mock_jwt, auth_client):
        """Test successful token verification."""
        mock_payload = {
            "sub": "user-123",
            "email": "test@example.com",
            "iat": 1640995200,
            "exp": 1641081600,
        }
        mock_jwt.decode.return_value = mock_payload

        payload = auth_client.verify_token("test-token")

        assert payload == mock_payload
        mock_jwt.decode.assert_called_once_with(
            "test-token",
            "test-secret",
            algorithms=["HS256"],
            issuer="cortex-os-mcp",
            audience="cortex-os-clients",
        )

    @patch("cortex_py.auth.better_auth_client.jwt")
    def test_verify_token_invalid(self, mock_jwt, auth_client):
        """Test invalid token verification."""
        from jwt import InvalidTokenError

        mock_jwt.decode.side_effect = InvalidTokenError("Invalid token")

        payload = auth_client.verify_token("invalid-token")

        assert payload is None

    @patch("cortex_py.auth.better_auth_client.jwt")
    def test_create_service_token(self, mock_jwt, auth_client):
        """Test service token creation."""
        mock_jwt.encode.return_value = "service-token"

        token = auth_client.create_service_token(
            "my-service", ["read:data", "write:data"], expires_in=3600
        )

        assert token == "service-token"

        # Verify payload
        call_args = mock_jwt.encode.call_args[0][0]
        assert call_args["userId"] == "service:my-service"
        assert call_args["roles"] == ["service"]
        assert call_args["permissions"] == ["read:data", "write:data"]
        assert "exp" in call_args

    def test_get_oauth_url(self, mock_requests, auth_client):
        """Test getting OAuth URL."""
        mock_response = Mock()
        mock_response.url = "https://github.com/oauth/authorize?client_id=test"
        mock_requests.request.return_value = mock_response

        url = auth_client.get_oauth_url("github", "http://localhost:3000/callback")

        assert url == "https://github.com/oauth/authorize?client_id=test"
        mock_requests.request.assert_called_once_with(
            "GET",
            "http://localhost:3001/auth/oauth/github",
            params={
                "provider": "github",
                "redirect_url": "http://localhost:3000/callback",
            },
            json=None,
            headers=None,
            timeout=30,
        )

    def test_exchange_oauth_code(self, mock_requests, auth_client):
        """Test OAuth code exchange."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "user": {
                "id": "github-user-123",
                "email": "github@example.com",
                "name": "GitHub User",
            },
            "session": {
                "id": "session-123",
                "userId": "github-user-123",
                "token": "oauth-token",
                "expires": "2024-01-01T12:00:00",
                "createdAt": "2024-01-01T11:00:00",
            },
        }
        mock_requests.request.return_value = mock_response

        result = auth_client.exchange_oauth_code("github", "auth-code", "state-value")

        assert result.success is True
        assert result.user.email == "github@example.com"
        assert result.session.token == "oauth-token"


class TestUser:
    """Test User dataclass."""

    def test_user_creation(self):
        """Test User instance creation."""
        user = User(
            id="user-123",
            email="test@example.com",
            name="Test User",
            email_verified=True,
        )

        assert user.id == "user-123"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.email_verified is True
        assert user.image is None


class TestSession:
    """Test Session dataclass."""

    def test_session_creation(self):
        """Test Session instance creation."""
        expires_at = datetime(2024, 1, 1, 12, 0, 0)
        created_at = datetime(2024, 1, 1, 11, 0, 0)

        session = Session(
            id="session-123",
            user_id="user-123",
            token="test-token",
            expires_at=expires_at,
            created_at=created_at,
        )

        assert session.id == "session-123"
        assert session.user_id == "user-123"
        assert session.token == "test-token"
        assert session.expires_at == expires_at
        assert session.created_at == created_at


class TestAuthResult:
    """Test AuthResult dataclass."""

    def test_success_result(self):
        """Test successful AuthResult."""
        user = User(id="user-123", email="test@example.com")
        session = Session(
            id="session-123",
            user_id="user-123",
            token="test-token",
            expires_at=datetime.now(),
            created_at=datetime.now(),
        )

        result = AuthResult(success=True, user=user, session=session)

        assert result.success is True
        assert result.user == user
        assert result.session == session
        assert result.error is None

    def test_failure_result(self):
        """Test failed AuthResult."""
        result = AuthResult(success=False, error="Invalid credentials")

        assert result.success is False
        assert result.user is None
        assert result.session is None
        assert result.error == "Invalid credentials"
