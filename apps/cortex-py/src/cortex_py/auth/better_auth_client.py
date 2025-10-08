"""
Better Auth Client for Python applications in Cortex-OS.

This client provides authentication and authorization functionality
for Python workflows and services.
"""

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

import jwt  # PyJWT
import requests

logger = logging.getLogger(__name__)


@dataclass
class User:
    """User information from Better Auth."""

    id: str
    email: str
    name: str | None = None
    email_verified: bool = False
    image: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class Session:
    """Session information from Better Auth."""

    id: str
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime


@dataclass
class AuthResult:
    """Authentication result."""

    success: bool
    user: User | None = None
    session: Session | None = None
    error: str | None = None


class BetterAuthClient:
    """Python client for Better Auth API."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        jwt_secret: str | None = None,
        timeout: int = 30,
    ):
        """
        Initialize Better Auth client.

        Args:
            base_url: Base URL of the Better Auth API
            api_key: API key for service authentication
            jwt_secret: JWT secret for token validation
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv(
            "BETTER_AUTH_URL", "http://localhost:3001"
        )
        self.api_key = api_key or os.getenv("BETTER_AUTH_API_KEY")
        self.jwt_secret = jwt_secret or os.getenv(
            "BETTER_AUTH_SECRET", "better-auth-secret"
        )
        self.timeout = timeout
        self.session = requests.Session()

        # Set default headers
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": "Cortex-OS-Python-Client/1.0.0",
            }
        )

        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> requests.Response:
        """Make HTTP request to Better Auth API."""
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise

    def register_user(
        self,
        email: str,
        password: str,
        name: str | None = None,
    ) -> AuthResult:
        """
        Register a new user.

        Args:
            email: User email address
            password: User password
            name: User display name

        Returns:
            AuthResult with user and session information
        """
        try:
            data = {
                "email": email,
                "password": password,
            }
            if name:
                data["name"] = name

            response = self._make_request("POST", "/auth/register", data)
            result = response.json()

            user = User(
                id=result["user"]["id"],
                email=result["user"]["email"],
                name=result["user"].get("name"),
                email_verified=result["user"].get("emailVerified", False),
                image=result["user"].get("image"),
            )

            session = Session(
                id=result["session"]["id"],
                user_id=result["session"]["userId"],
                token=result["session"]["token"],
                expires_at=datetime.fromisoformat(result["session"]["expires"]),
                created_at=datetime.fromisoformat(result["session"]["createdAt"]),
            )

            return AuthResult(success=True, user=user, session=session)

        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return AuthResult(success=False, error=str(e))

    def login(
        self,
        email: str,
        password: str,
    ) -> AuthResult:
        """
        Login with email and password.

        Args:
            email: User email address
            password: User password

        Returns:
            AuthResult with user and session information
        """
        try:
            data = {
                "email": email,
                "password": password,
            }

            response = self._make_request("POST", "/auth/login", data)
            result = response.json()

            user = User(
                id=result["user"]["id"],
                email=result["user"]["email"],
                name=result["user"].get("name"),
                email_verified=result["user"].get("emailVerified", False),
                image=result["user"].get("image"),
            )

            session = Session(
                id=result["session"]["id"],
                user_id=result["session"]["userId"],
                token=result["session"]["token"],
                expires_at=datetime.fromisoformat(result["session"]["expires"]),
                created_at=datetime.fromisoformat(result["session"]["createdAt"]),
            )

            return AuthResult(success=True, user=user, session=session)

        except Exception as e:
            logger.error(f"Login failed: {e}")
            return AuthResult(success=False, error=str(e))

    def get_user(self, token: str) -> User | None:
        """
        Get user information using access token.

        Args:
            token: Access token

        Returns:
            User information or None if failed
        """
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = self._make_request("GET", "/api/me", headers=headers)
            result = response.json()

            return User(
                id=result["user"]["id"],
                email=result["user"]["email"],
                name=result["user"].get("name"),
                email_verified=result["user"].get("emailVerified", False),
                image=result["user"].get("image"),
            )

        except Exception as e:
            logger.error(f"Get user failed: {e}")
            return None

    def update_user(
        self,
        token: str,
        name: str | None = None,
        image: str | None = None,
    ) -> User | None:
        """
        Update user profile.

        Args:
            token: Access token
            name: New display name
            image: New profile image URL

        Returns:
            Updated user information or None if failed
        """
        try:
            headers = {"Authorization": f"Bearer {token}"}
            data = {}
            if name:
                data["name"] = name
            if image:
                data["image"] = image

            response = self._make_request("PUT", "/api/me", data, headers)
            result = response.json()

            return User(
                id=result["user"]["id"],
                email=result["user"]["email"],
                name=result["user"].get("name"),
                email_verified=result["user"].get("emailVerified", False),
                image=result["user"].get("image"),
            )

        except Exception as e:
            logger.error(f"Update user failed: {e}")
            return None

    def get_sessions(self, token: str) -> list[Session]:
        """
        Get user sessions.

        Args:
            token: Access token

        Returns:
            List of sessions
        """
        try:
            headers = {"Authorization": f"Bearer {token}"}
            response = self._make_request("GET", "/api/sessions", headers=headers)
            result = response.json()

            sessions = []
            for session_data in result["sessions"]:
                session = Session(
                    id=session_data["id"],
                    user_id=session_data["userId"],
                    token="",  # Token not returned in session list
                    expires_at=datetime.fromisoformat(session_data["expires"]),
                    created_at=datetime.fromisoformat(session_data["createdAt"]),
                )
                sessions.append(session)

            return sessions

        except Exception as e:
            logger.error(f"Get sessions failed: {e}")
            return []

    def revoke_session(self, token: str, session_id: str) -> bool:
        """
        Revoke a session.

        Args:
            token: Access token
            session_id: Session ID to revoke

        Returns:
            True if successful, False otherwise
        """
        try:
            headers = {"Authorization": f"Bearer {token}"}
            self._make_request("DELETE", f"/api/sessions/{session_id}", headers=headers)
            return True

        except Exception as e:
            logger.error(f"Revoke session failed: {e}")
            return False

    def logout(self, token: str) -> bool:
        """
        Logout current session.

        Args:
            token: Access token

        Returns:
            True if successful, False otherwise
        """
        try:
            headers = {"Authorization": f"Bearer {token}"}
            self._make_request("POST", "/auth/logout", headers=headers)
            return True

        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False

    def request_password_reset(self, email: str) -> bool:
        """
        Request password reset email.

        Args:
            email: User email address

        Returns:
            True if request was successful
        """
        try:
            data = {"email": email}
            self._make_request("POST", "/auth/forgot-password", data)
            return True

        except Exception as e:
            logger.error(f"Password reset request failed: {e}")
            return False

    def reset_password(self, token: str, new_password: str) -> bool:
        """
        Reset password with reset token.

        Args:
            token: Password reset token
            new_password: New password

        Returns:
            True if successful, False otherwise
        """
        try:
            data = {
                "token": token,
                "password": new_password,
            }
            self._make_request("POST", "/auth/reset-password", data)
            return True

        except Exception as e:
            logger.error(f"Password reset failed: {e}")
            return False

    def verify_token(self, token: str) -> dict[str, Any] | None:
        """
        Verify JWT token and return payload.

        Args:
            token: JWT token

        Returns:
            Token payload or None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                issuer="cortex-os-mcp",
                audience="cortex-os-clients",
            )
            return payload

        except jwt.InvalidTokenError as e:
            logger.error(f"Token verification failed: {e}")
            return None

    def create_service_token(
        self,
        service_name: str,
        scopes: list[str] = None,
        expires_in: int | timedelta | None = None,
    ) -> str:
        """
        Create a service-to-service authentication token.

        Args:
            service_name: Name of the service
            scopes: List of permission scopes
            expires_in: Token expiration time

        Returns:
            JWT token
        """
        if scopes is None:
            scopes = []

        payload = {
            "userId": f"service:{service_name}",
            "sessionId": f"service-{datetime.now().isoformat()}",
            "roles": ["service"],
            "permissions": scopes,
            "iat": datetime.now().timestamp(),
        }

        if expires_in:
            if isinstance(expires_in, int):
                payload["exp"] = datetime.now().timestamp() + expires_in
            elif isinstance(expires_in, timedelta):
                payload["exp"] = (datetime.now() + expires_in).timestamp()

        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")

    def get_oauth_url(self, provider: str, redirect_url: str | None = None) -> str:
        """
        Get OAuth authorization URL.

        Args:
            provider: OAuth provider (github, google, etc.)
            redirect_url: Optional redirect URL

        Returns:
            OAuth authorization URL
        """
        params = {"provider": provider}
        if redirect_url:
            params["redirect_url"] = redirect_url

        response = self._make_request("GET", f"/auth/oauth/{provider}", params=params)
        return response.url

    def exchange_oauth_code(self, provider: str, code: str, state: str) -> AuthResult:
        """
        Exchange OAuth authorization code for access token.

        Args:
            provider: OAuth provider
            code: Authorization code
            state: OAuth state parameter

        Returns:
            AuthResult with user and session information
        """
        try:
            data = {
                "code": code,
                "state": state,
            }

            response = self._make_request(
                "POST",
                f"/auth/oauth/{provider}/callback",
                data,
            )
            result = response.json()

            user = User(
                id=result["user"]["id"],
                email=result["user"]["email"],
                name=result["user"].get("name"),
                email_verified=result["user"].get("emailVerified", False),
                image=result["user"].get("image"),
            )

            session = Session(
                id=result["session"]["id"],
                user_id=result["session"]["userId"],
                token=result["session"]["token"],
                expires_at=datetime.fromisoformat(result["session"]["expires"]),
                created_at=datetime.fromisoformat(result["session"]["createdAt"]),
            )

            return AuthResult(success=True, user=user, session=session)

        except Exception as e:
            logger.error(f"OAuth exchange failed: {e}")
            return AuthResult(success=False, error=str(e))
