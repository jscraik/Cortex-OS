"""JWT-based authentication system for MCP integration with Cortex-OS."""

import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# Optional dependency; provide a safe fallback if passlib isn't installed
try:  # pragma: no cover - import guard
    from passlib.context import CryptContext  # type: ignore
except Exception:  # pragma: no cover - lightweight fallback for tests
    import hashlib
    import hmac

    class CryptContext:  # type: ignore[misc]
        def __init__(self, schemes: list[str] | None = None, deprecated: str | None = None):
            self._salt = b"cortex-mcp-fallback-salt"

        def hash(self, password: str) -> str:
            # Simple PBKDF2-HMAC fallback; NOT for production use
            return hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), self._salt, 100_000
            ).hex()

        def verify(self, password: str, hashed: str) -> bool:
            computed = self.hash(password)
            return hmac.compare_digest(computed, hashed)
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _load_secret_key() -> str:
    env_key = os.getenv("JWT_SECRET_KEY")
    if env_key:
        return env_key
    secret_path = Path(
        os.getenv(
            "JWT_SECRET_FILE", str(Path(__file__).resolve().parent / ".jwt_secret")
        )
    )
    if secret_path.exists():
        return secret_path.read_text().strip()
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable must be set in production"
        )
    key = secrets.token_urlsafe(32)
    fd = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(key)
    logger.warning(
        "Generated development JWT secret stored at %s. Set JWT_SECRET_KEY for production.",
        secret_path,
    )
    return key


# JWT configuration - must be stable across restarts
SECRET_KEY = _load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


class User(BaseModel):
    """User model for MCP authentication."""

    user_id: str
    username: str
    email: EmailStr | None = None
    full_name: str | None = None
    is_active: bool = True
    is_admin: bool = False
    permissions: list[str] = []
    created_at: datetime | None = None
    last_login: datetime | None = None


class UserInDB(User):
    """User model with password hash for database storage."""

    hashed_password: str


class TokenData(BaseModel):
    """Token data model."""

    username: str | None = None
    user_id: str | None = None
    permissions: list[str] = []


class TokenResponse(BaseModel):
    """Token response model."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class Permission:
    """Permission constants for MCP operations."""

    # Tool permissions
    EXECUTE_TOOLS = "tools:execute"
    LIST_TOOLS = "tools:list"
    MANAGE_TOOLS = "tools:manage"

    # Plugin permissions
    RELOAD_PLUGINS = "plugins:reload"
    MANAGE_PLUGINS = "plugins:manage"
    VIEW_PLUGINS = "plugins:view"

    # System permissions
    VIEW_STATUS = "system:view_status"
    MANAGE_CONNECTIONS = "system:manage_connections"
    VIEW_METRICS = "system:view_metrics"
    MANAGE_TASKS = "system:manage_tasks"

    # Admin permissions
    MANAGE_USERS = "admin:manage_users"
    SYSTEM_ADMIN = "admin:system"

    # A2A permissions
    A2A_PUBLISH = "a2a:publish"
    A2A_SUBSCRIBE = "a2a:subscribe"

    @classmethod
    def get_all_permissions(cls) -> list[str]:
        """Get all available permissions."""
        return [
            getattr(cls, attr)
            for attr in dir(cls)
            if not attr.startswith("_") and not callable(getattr(cls, attr))
        ]


class UserStore:
    """In-memory user store for development. Replace with database in production."""

    def __init__(self):
        self.users: dict[str, UserInDB] = {}
        self._create_default_users()

    def _create_default_users(self):
        """Create default users for development."""
        # Admin user
        admin_user = UserInDB(
            user_id="admin",
            username="admin",
            email="admin@cortex-os.ai",
            full_name="MCP Administrator",
            hashed_password=pwd_context.hash("admin123"),
            is_admin=True,
            permissions=Permission.get_all_permissions(),
            created_at=datetime.now(timezone.utc),
        )
        self.users["admin"] = admin_user

        # Regular user
        user = UserInDB(
            user_id="user",
            username="user",
            email="user@cortex-os.ai",
            full_name="MCP User",
            hashed_password=pwd_context.hash("user123"),
            permissions=[
                Permission.EXECUTE_TOOLS,
                Permission.LIST_TOOLS,
                Permission.VIEW_PLUGINS,
                Permission.VIEW_STATUS,
                Permission.VIEW_METRICS,
            ],
            created_at=datetime.now(timezone.utc),
        )
        self.users["user"] = user

    async def get_user(self, username: str) -> UserInDB | None:
        """Get user by username."""
        return self.users.get(username)

    async def get_user_by_id(self, user_id: str) -> UserInDB | None:
        """Get user by ID."""
        for user in self.users.values():
            if user.user_id == user_id:
                return user
        return None

    async def create_user(self, user_data: dict[str, Any]) -> UserInDB:
        """Create a new user."""
        user = UserInDB(
            user_id=user_data["user_id"],
            username=user_data["username"],
            email=user_data.get("email"),
            full_name=user_data.get("full_name"),
            hashed_password=pwd_context.hash(user_data["password"]),
            is_admin=user_data.get("is_admin", False),
            permissions=user_data.get("permissions", []),
            created_at=datetime.now(timezone.utc),
        )

        self.users[user.username] = user
        return user

    async def update_user(
        self, username: str, updates: dict[str, Any]
    ) -> UserInDB | None:
        """Update user data."""
        user = self.users.get(username)
        if not user:
            return None

        for key, value in updates.items():
            if hasattr(user, key) and key != "hashed_password":
                setattr(user, key, value)

        return user

    async def delete_user(self, username: str) -> bool:
        """Delete a user."""
        return bool(self.users.pop(username, None))

    async def update_last_login(self, username: str) -> None:
        """Update user's last login time."""
        user = self.users.get(username)
        if user:
            user.last_login = datetime.now(timezone.utc)


class MCPAuthenticator:
    """JWT-based authentication for MCP with Cortex-OS integration."""

    def __init__(self, user_store: UserStore | None = None):
        self.user_store = user_store or UserStore()
        self.token_blacklist: set = set()  # Simple blacklist for development
        self.failed_attempts: dict[str, list[float]] = {}  # Rate limiting

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def _get_password_hash(self, password: str) -> str:
        """Generate password hash."""
        return pwd_context.hash(password)

    def _check_rate_limit(
        self, identifier: str, max_attempts: int = 5, window_minutes: int = 15
    ) -> bool:
        """Check if identifier is rate limited."""
        now = time.time()
        window_start = now - (window_minutes * 60)

        if identifier not in self.failed_attempts:
            return True

        # Clean old attempts
        self.failed_attempts[identifier] = [
            attempt_time
            for attempt_time in self.failed_attempts[identifier]
            if attempt_time > window_start
        ]

        return len(self.failed_attempts[identifier]) < max_attempts

    def _record_failed_attempt(self, identifier: str) -> None:
        """Record a failed authentication attempt."""
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []

        self.failed_attempts[identifier].append(time.time())

    async def authenticate_user(
        self, username: str, password: str, ip_address: str | None = None
    ) -> UserInDB | None:
        """Authenticate user with username and password."""
        # Check rate limiting
        rate_limit_key = ip_address or username
        if not self._check_rate_limit(rate_limit_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Please try again later.",
            )

        user = await self.user_store.get_user(username)

        if not user or not self._verify_password(password, user.hashed_password):
            self._record_failed_attempt(rate_limit_key)
            return None

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
            )

        # Update last login
        await self.user_store.update_last_login(username)

        return user

    def create_access_token(
        self, data: dict[str, Any], expires_delta: timedelta | None = None
    ) -> str:
        """Create JWT access token."""
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def create_refresh_token(self, data: dict[str, Any]) -> str:
        """Create JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"})

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    async def create_tokens(self, user: UserInDB) -> TokenResponse:
        """Create access and refresh tokens for user."""
        token_data = {
            "sub": user.username,
            "user_id": user.user_id,
            "permissions": user.permissions,
            "is_admin": user.is_admin,
        }

        access_token = self.create_access_token(token_data)
        refresh_token = self.create_refresh_token(
            {"sub": user.username, "user_id": user.user_id}
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def verify_token(self, token: str) -> TokenData | None:
        """Verify JWT token and return token data."""
        try:
            # Check blacklist
            if token in self.token_blacklist:
                return None

            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")

            if username is None:
                return None

            # Verify token type
            if payload.get("type") != "access":
                return None

            token_data = TokenData(
                username=username,
                user_id=payload.get("user_id"),
                permissions=payload.get("permissions", []),
            )

            return token_data

        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError:
            return None

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse | None:
        """Refresh access token using refresh token."""
        try:
            if refresh_token in self.token_blacklist:
                return None

            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")

            if username is None or payload.get("type") != "refresh":
                return None

            # Get current user data
            user = await self.user_store.get_user(username)
            if not user or not user.is_active:
                return None

            # Create new tokens
            return await self.create_tokens(user)

        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError:
            return None

    async def revoke_token(self, token: str) -> None:
        """Add token to blacklist."""
        self.token_blacklist.add(token)

    async def get_current_user(self, token: str) -> User | None:
        """Get current user from token."""
        token_data = await self.verify_token(token)
        if token_data is None:
            return None

        user = await self.user_store.get_user(token_data.username)
        if user is None:
            return None

        return User(**user.dict(exclude={"hashed_password"}))

    def check_permission(self, user: User, required_permission: str) -> bool:
        """Check if user has required permission."""
        if user.is_admin:
            return True

        return required_permission in user.permissions

    def get_auth_stats(self) -> dict[str, Any]:
        """Get authentication statistics."""
        total_users = len(self.user_store.users)
        active_users = sum(
            1 for user in self.user_store.users.values() if user.is_active
        )
        admin_users = sum(1 for user in self.user_store.users.values() if user.is_admin)

        return {
            "total_users": total_users,
            "active_users": active_users,
            "admin_users": admin_users,
            "blacklisted_tokens": len(self.token_blacklist),
            "rate_limited_ips": len(self.failed_attempts),
        }


# Global authenticator instance
authenticator = MCPAuthenticator()


# FastAPI security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = security,
) -> User:
    """FastAPI dependency to get current authenticated user."""
    token = credentials.credentials

    user = await authenticator.get_current_user(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(current_user: User = get_current_user) -> User:
    """FastAPI dependency to get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_admin_user(current_user: User = get_current_user) -> User:
    """FastAPI dependency to require admin user."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user


def require_permission(permission: str):
    """Decorator to require specific permission."""

    def decorator(current_user: User = get_current_user):
        if not authenticator.check_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return current_user

    return decorator


# A2A Authentication Middleware
class A2AAuthMiddleware:
    """Authentication middleware for A2A events."""

    def __init__(self, authenticator: MCPAuthenticator):
        self.authenticator = authenticator

    async def authenticate_a2a_event(self, event_data: dict[str, Any]) -> User | None:
        """Authenticate A2A event using embedded token."""
        auth_token = event_data.get("auth_token")
        if not auth_token:
            return None

        return await self.authenticator.get_current_user(auth_token)

    async def create_a2a_auth_token(self, user: User) -> str:
        """Create authentication token for A2A events."""
        token_data = {
            "sub": user.username,
            "user_id": user.user_id,
            "permissions": user.permissions,
            "is_admin": user.is_admin,
        }

        # Short-lived token for A2A events
        expires_delta = timedelta(minutes=5)
        return self.authenticator.create_access_token(token_data, expires_delta)


# Global A2A auth middleware
a2a_auth = A2AAuthMiddleware(authenticator)
