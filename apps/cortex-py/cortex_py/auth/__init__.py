"""
Authentication module for Cortex-OS Python applications.

This module provides authentication and authorization functionality
for Python workflows and services using Better Auth.
"""

from .better_auth_client import (
    BetterAuthClient,
    User,
    Session,
    AuthResult,
)

__all__ = [
    "BetterAuthClient",
    "User",
    "Session",
    "AuthResult",
]