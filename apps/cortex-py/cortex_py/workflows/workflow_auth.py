"""
Workflow authentication for Cortex-OS Python applications.

This module provides authentication integration for Python workflows.
"""

import logging
import os
from typing import Any

from ..auth import BetterAuthClient, Session, User

logger = logging.getLogger(__name__)


class WorkflowAuth:
    """Authentication handler for Python workflows."""

    def __init__(
        self,
        auth_client: BetterAuthClient | None = None,
        workflow_id: str | None = None,
        required_permissions: list[str] | None = None,
    ):
        """
        Initialize workflow authentication.

        Args:
            auth_client: Better Auth client instance
            workflow_id: Unique workflow identifier
            required_permissions: List of required permissions
        """
        self.auth_client = auth_client or BetterAuthClient()
        self.workflow_id = workflow_id or os.getenv("CORTEX_WORKFLOW_ID")
        self.required_permissions = required_permissions or []
        self.current_session: Session | None = None
        self.current_user: User | None = None

    def authenticate_with_token(self, token: str) -> bool:
        """
        Authenticate workflow with access token.

        Args:
            token: Access token

        Returns:
            True if authentication successful
        """
        try:
            # Verify token
            payload = self.auth_client.verify_token(token)
            if not payload:
                logger.error("Invalid token")
                return False

            # Get user information
            user = self.auth_client.get_user(token)
            if not user:
                logger.error("Failed to get user information")
                return False

            # Check permissions
            user_permissions = payload.get("permissions", [])
            for permission in self.required_permissions:
                if permission not in user_permissions:
                    logger.error(f"Missing required permission: {permission}")
                    return False

            # Store session info
            self.current_user = user
            self.current_session = Session(
                id=payload.get("sessionId", ""),
                user_id=user.id,
                token=token,
                expires_at=payload.get("exp", 0),
                created_at=payload.get("iat", 0),
            )

            logger.info(
                f"Workflow {self.workflow_id} authenticated as user {user.email}"
            )
            return True

        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False

    def authenticate_with_credentials(
        self,
        email: str,
        password: str,
    ) -> bool:
        """
        Authenticate workflow with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            True if authentication successful
        """
        try:
            result = self.auth_client.login(email, password)
            if not result.success:
                logger.error(f"Login failed: {result.error}")
                return False

            # Check permissions
            if self.required_permissions:
                token = result.session.token
                payload = self.auth_client.verify_token(token)
                if payload:
                    user_permissions = payload.get("permissions", [])
                    for permission in self.required_permissions:
                        if permission not in user_permissions:
                            logger.error(f"Missing required permission: {permission}")
                            return False

            self.current_user = result.user
            self.current_session = result.session

            logger.info(
                f"Workflow {self.workflow_id} authenticated as user {result.user.email}"
            )
            return True

        except Exception as e:
            logger.error(f"Authentication with credentials failed: {e}")
            return False

    def get_auth_header(self) -> str | None:
        """
        Get authorization header for API requests.

        Returns:
            Authorization header value or None
        """
        if not self.current_session:
            return None

        return f"Bearer {self.current_session.token}"

    def create_service_token(self, scopes: list[str] = None) -> str | None:
        """
        Create a service token for the workflow.

        Args:
            scopes: List of permission scopes

        Returns:
            Service token or None
        """
        try:
            if not self.workflow_id:
                logger.error("Workflow ID not set")
                return None

            return self.auth_client.create_service_token(
                f"workflow-{self.workflow_id}",
                scopes or self.required_permissions,
            )

        except Exception as e:
            logger.error(f"Failed to create service token: {e}")
            return None

    def is_authenticated(self) -> bool:
        """
        Check if workflow is authenticated.

        Returns:
            True if authenticated
        """
        return self.current_session is not None and self.current_user is not None

    def get_user_info(self) -> dict[str, Any] | None:
        """
        Get current user information.

        Returns:
            User information as dictionary
        """
        if not self.current_user:
            return None

        return {
            "id": self.current_user.id,
            "email": self.current_user.email,
            "name": self.current_user.name,
            "email_verified": self.current_user.email_verified,
            "image": self.current_user.image,
        }

    def logout(self) -> bool:
        """
        Logout current session.

        Returns:
            True if successful
        """
        try:
            if self.current_session:
                success = self.auth_client.logout(self.current_session.token)
                if success:
                    self.current_session = None
                    self.current_user = None
                    logger.info(f"Workflow {self.workflow_id} logged out")
                    return True

            return False

        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False


class WorkflowAuthMiddleware:
    """Middleware for adding authentication to workflow steps."""

    def __init__(self, auth: WorkflowAuth):
        self.auth = auth

    def __call__(self, func):
        """Decorator for workflow step authentication."""

        def wrapper(*args, **kwargs):
            if not self.auth.is_authenticated():
                raise Exception("Workflow not authenticated")

            # Add auth header to kwargs if not present
            if "headers" not in kwargs:
                kwargs["headers"] = {}

            if "Authorization" not in kwargs["headers"]:
                auth_header = self.auth.get_auth_header()
                if auth_header:
                    kwargs["headers"]["Authorization"] = auth_header

            return func(*args, **kwargs)

        return wrapper


def require_authentication(func):
    """
    Decorator to require authentication for workflow functions.

    Usage:
        @require_authentication
        def my_workflow_step(data, auth=None):
            # auth is WorkflowAuth instance
            user = auth.get_user_info()
            ...
    """

    def wrapper(*args, **kwargs):
        # Look for auth in args and kwargs
        auth = None
        for arg in args:
            if isinstance(arg, WorkflowAuth):
                auth = arg
                break

        if not auth and "auth" in kwargs:
            auth = kwargs["auth"]

        if not auth:
            raise Exception("WorkflowAuth instance not found in arguments")

        if not auth.is_authenticated():
            raise Exception("Workflow not authenticated")

        return func(*args, **kwargs)

    return wrapper


def require_permission(permission: str):
    """
    Decorator to require specific permission.

    Usage:
        @require_permission("read:documents")
        def read_document(doc_id, auth=None):
            ...
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            # Get auth instance
            auth = None
            for arg in args:
                if isinstance(arg, WorkflowAuth):
                    auth = arg
                    break

            if not auth and "auth" in kwargs:
                auth = kwargs["auth"]

            if not auth:
                raise Exception("WorkflowAuth instance not found")

            # Check permission
            if auth.current_session:
                payload = auth.auth_client.verify_token(auth.current_session.token)
                if payload and permission not in payload.get("permissions", []):
                    raise Exception(f"Missing required permission: {permission}")

            return func(*args, **kwargs)

        return wrapper

    return decorator
