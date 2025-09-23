"""
Tests for workflow authentication integration.
"""

import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from cortex_py.auth import AuthResult, BetterAuthClient, Session, User
from cortex_py.workflows.workflow_auth import (
    WorkflowAuth,
    WorkflowAuthMiddleware,
    require_authentication,
    require_permission,
)


@pytest.fixture
def mock_auth_client():
    """Mock Better Auth client."""
    return Mock(spec=BetterAuthClient)


@pytest.fixture
def workflow_auth(mock_auth_client):
    """Create WorkflowAuth instance."""
    return WorkflowAuth(
        auth_client=mock_auth_client,
        workflow_id="test-workflow",
        required_permissions=["read:data", "write:data"],
    )


class TestWorkflowAuth:
    """Test WorkflowAuth functionality."""

    def test_init(self, mock_auth_client):
        """Test WorkflowAuth initialization."""
        auth = WorkflowAuth(
            auth_client=mock_auth_client,
            workflow_id="test-workflow",
            required_permissions=["read:data"],
        )

        assert auth.auth_client == mock_auth_client
        assert auth.workflow_id == "test-workflow"
        assert auth.required_permissions == ["read:data"]
        assert auth.current_session is None
        assert auth.current_user is None

    def test_init_from_env(self, mock_auth_client):
        """Test initialization from environment."""
        with patch.dict(os.environ, {"CORTEX_WORKFLOW_ID": "env-workflow"}):
            auth = WorkflowAuth(auth_client=mock_auth_client)
            assert auth.workflow_id == "env-workflow"

    def test_authenticate_with_token_success(self, workflow_auth, mock_auth_client):
        """Test successful token authentication."""
        # Mock token verification
        mock_payload = {
            "sessionId": "session-123",
            "permissions": ["read:data", "write:data"],
        }
        mock_auth_client.verify_token.return_value = mock_payload

        # Mock user retrieval
        mock_user = User(id="user-123", email="test@example.com", name="Test User")
        mock_auth_client.get_user.return_value = mock_user

        # Authenticate
        result = workflow_auth.authenticate_with_token("test-token")

        assert result is True
        assert workflow_auth.current_user == mock_user
        assert workflow_auth.current_session is not None
        assert workflow_auth.current_session.user_id == "user-123"

        # Verify calls
        mock_auth_client.verify_token.assert_called_once_with("test-token")
        mock_auth_client.get_user.assert_called_once_with("test-token")

    def test_authenticate_with_token_invalid(self, workflow_auth, mock_auth_client):
        """Test authentication with invalid token."""
        mock_auth_client.verify_token.return_value = None

        result = workflow_auth.authenticate_with_token("invalid-token")

        assert result is False
        assert workflow_auth.current_user is None
        assert workflow_auth.current_session is None

    def test_authenticate_with_token_missing_permissions(
        self, workflow_auth, mock_auth_client
    ):
        """Test authentication with missing permissions."""
        mock_payload = {
            "sessionId": "session-123",
            "permissions": ["read:data"],  # Missing write:data
        }
        mock_auth_client.verify_token.return_value = mock_payload

        mock_user = User(id="user-123", email="test@example.com")
        mock_auth_client.get_user.return_value = mock_user

        result = workflow_auth.authenticate_with_token("test-token")

        assert result is False

    def test_authenticate_with_credentials_success(
        self, workflow_auth, mock_auth_client
    ):
        """Test successful credentials authentication."""
        # Mock login result
        mock_session = Session(
            id="session-123",
            user_id="user-123",
            token="login-token",
            expires_at=datetime.now() + timedelta(hours=1),
            created_at=datetime.now(),
        )
        mock_user = User(id="user-123", email="test@example.com", name="Test User")
        mock_result = AuthResult(success=True, user=mock_user, session=mock_session)
        mock_auth_client.login.return_value = mock_result

        # Mock token with permissions
        mock_payload = {
            "sessionId": "session-123",
            "permissions": ["read:data", "write:data"],
        }
        mock_auth_client.verify_token.return_value = mock_payload

        # Authenticate
        result = workflow_auth.authenticate_with_credentials(
            "test@example.com", "password"
        )

        assert result is True
        assert workflow_auth.current_user == mock_user
        assert workflow_auth.current_session == mock_session

        mock_auth_client.login.assert_called_once_with("test@example.com", "password")

    def test_get_auth_header(self, workflow_auth):
        """Test getting authorization header."""
        # No session
        assert workflow_auth.get_auth_header() is None

        # With session
        mock_session = Mock()
        mock_session.token = "test-token"
        workflow_auth.current_session = mock_session

        header = workflow_auth.get_auth_header()
        assert header == "Bearer test-token"

    def test_create_service_token(self, workflow_auth, mock_auth_client):
        """Test service token creation."""
        mock_auth_client.create_service_token.return_value = "service-token"

        token = workflow_auth.create_service_token(["custom:scope"])

        assert token == "service-token"
        mock_auth_client.create_service_token.assert_called_once_with(
            "workflow-test-workflow", ["custom:scope"]
        )

    def test_create_service_token_no_workflow_id(self, workflow_auth, mock_auth_client):
        """Test service token creation without workflow ID."""
        workflow_auth.workflow_id = None

        token = workflow_auth.create_service_token()

        assert token is None

    def test_is_authenticated(self, workflow_auth):
        """Test authentication status check."""
        # Not authenticated
        assert workflow_auth.is_authenticated() is False

        # Authenticated
        workflow_auth.current_user = Mock()
        workflow_auth.current_session = Mock()

        assert workflow_auth.is_authenticated() is True

    def test_get_user_info(self, workflow_auth):
        """Test getting user info."""
        # No user
        assert workflow_auth.get_user_info() is None

        # With user
        mock_user = User(
            id="user-123",
            email="test@example.com",
            name="Test User",
            email_verified=True,
            image="https://example.com/avatar.jpg",
        )
        workflow_auth.current_user = mock_user

        info = workflow_auth.get_user_info()
        assert info == {
            "id": "user-123",
            "email": "test@example.com",
            "name": "Test User",
            "email_verified": True,
            "image": "https://example.com/avatar.jpg",
        }

    def test_logout(self, workflow_auth, mock_auth_client):
        """Test logout."""
        mock_session = Mock()
        mock_session.token = "test-token"
        workflow_auth.current_session = mock_session
        workflow_auth.current_user = Mock()

        mock_auth_client.logout.return_value = True

        result = workflow_auth.logout()

        assert result is True
        assert workflow_auth.current_session is None
        assert workflow_auth.current_user is None

        mock_auth_client.logout.assert_called_once_with("test-token")


class TestWorkflowAuthMiddleware:
    """Test WorkflowAuthMiddleware."""

    def test_middleware_adds_auth_header(self):
        """Test middleware adds authorization header."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_auth.is_authenticated.return_value = True
        mock_auth.get_auth_header.return_value = "Bearer test-token"

        middleware = WorkflowAuthMiddleware(mock_auth)

        # Mock function
        mock_func = Mock(return_value="result")

        # Apply middleware
        wrapped = middleware(mock_func)
        result = wrapped("arg1", "arg2", kwarg1="value")

        # Verify function was called with auth header
        mock_func.assert_called_once_with(
            "arg1",
            "arg2",
            kwarg1="value",
            headers={"Authorization": "Bearer test-token"},
        )
        assert result == "result"

    def test_middleware_preserves_existing_headers(self):
        """Test middleware preserves existing headers."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_auth.is_authenticated.return_value = True
        mock_auth.get_auth_header.return_value = "Bearer test-token"

        middleware = WorkflowAuthMiddleware(mock_auth)

        mock_func = Mock(return_value="result")

        wrapped = middleware(mock_func)
        wrapped(headers={"Content-Type": "application/json"})

        # Verify headers were merged
        mock_func.assert_called_once_with(
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token",
            }
        )

    def test_middleware_requires_authentication(self):
        """Test middleware requires authentication."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_auth.is_authenticated.return_value = False

        middleware = WorkflowAuthMiddleware(mock_auth)

        mock_func = Mock()

        wrapped = middleware(mock_func)

        # Should raise exception
        with pytest.raises(Exception, match="Workflow not authenticated"):
            wrapped()

        mock_func.assert_not_called()


class TestDecorators:
    """Test authentication decorators."""

    def test_require_authentication_success(self):
        """Test require_authentication decorator success."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_auth.is_authenticated.return_value = True

        @require_authentication
        def test_func(data, auth=None):
            return f"success: {data}"

        result = test_func("test", auth=mock_auth)

        assert result == "success: test"

    def test_require_authentication_missing_auth(self):
        """Test require_authentication with missing auth."""

        @require_authentication
        def test_func(data):
            return "should not reach here"

        with pytest.raises(Exception, match="WorkflowAuth instance not found"):
            test_func("test")

    def test_require_authentication_not_authenticated(self):
        """Test require_authentication when not authenticated."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_auth.is_authenticated.return_value = False

        @require_authentication
        def test_func(data, auth=None):
            return "should not reach here"

        with pytest.raises(Exception, match="Workflow not authenticated"):
            test_func("test", auth=mock_auth)

    def test_require_permission_success(self):
        """Test require_permission decorator success."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_session = Mock()
        mock_session.token = "test-token"
        mock_auth.current_session = mock_session

        @require_permission("read:data")
        def test_func(doc_id, auth=None):
            return f"document: {doc_id}"

        result = test_func("doc-123", auth=mock_auth)

        assert result == "document: doc-123"

    def test_require_permission_missing_permission(self):
        """Test require_permission with missing permission."""
        mock_auth = Mock(spec=WorkflowAuth)
        mock_session = Mock()
        mock_session.token = "test-token"
        mock_auth.current_session = mock_session
        mock_auth.auth_client = Mock()
        mock_auth.auth_client.verify_token.return_value = {
            "permissions": ["write:data"]  # Missing read:data
        }

        @require_permission("read:data")
        def test_func(doc_id, auth=None):
            return "should not reach here"

        with pytest.raises(Exception, match="Missing required permission: read:data"):
            test_func("doc-123", auth=mock_auth)


class TestIntegration:
    """Integration tests for workflow authentication."""

    def test_complete_workflow_auth_flow(self):
        """Test complete authentication flow in a workflow."""
        # Create real auth client for integration test
        auth_client = BetterAuthClient(
            base_url="http://localhost:3001", jwt_secret="test-secret"
        )

        workflow_auth = WorkflowAuth(
            auth_client=auth_client,
            workflow_id="integration-test",
            required_permissions=["read:data"],
        )

        # Test service token creation
        service_token = workflow_auth.create_service_token()
        assert service_token is not None

        # Verify token
        payload = auth_client.verify_token(service_token)
        assert payload is not None
        assert payload["userId"] == "service:workflow-integration-test"
        assert "read:data" in payload["permissions"]
