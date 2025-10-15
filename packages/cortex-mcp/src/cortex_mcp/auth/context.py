"""Shared identity context types for Cortex MCP OAuth bridge."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable


def _normalise_scopes(raw: Any) -> list[str]:
    """Convert a scope claim into a sorted, de-duplicated list."""

    scopes: set[str] = set()
    if isinstance(raw, str):
        scopes.update(part for part in raw.split() if part)
    elif isinstance(raw, Iterable):
        for value in raw:
            if isinstance(value, str):
                scopes.add(value.strip())
    if not scopes:
        return []
    return sorted(scopes)


@dataclass(slots=True, frozen=True)
class IdentityContext:
    """Normalized identity projection from decoded JWT claims."""

    subject: str
    scopes: list[str] = field(default_factory=list)
    email: str | None = None
    organization: str | None = None
    raw_claims: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_claims(cls, claims: dict[str, Any]) -> IdentityContext:
        """Build an identity context from JWT claims."""

        subject = str(
            claims.get("sub")
            or claims.get("user_id")
            or claims.get("uid")
            or claims.get("id")
            or "anonymous"
        )
        scopes = _normalise_scopes(
            claims.get("scope") or claims.get("scopes") or claims.get("scp")
        )
        email = claims.get("email") or claims.get("preferred_username")
        organization = (
            claims.get("org")
            or claims.get("org_id")
            or claims.get("tenant")
            or claims.get("organization")
        )
        return cls(
            subject=subject,
            scopes=scopes,
            email=email if isinstance(email, str) else None,
            organization=organization if isinstance(organization, str) else None,
            raw_claims=dict(claims),
        )

    def has_scopes(self, required_scopes: Iterable[str]) -> bool:
        """Return True when all required scopes are granted."""

        if not required_scopes:
            return True
        granted = set(self.scopes)
        if "*" in granted:
            return True
        return all(scope in granted for scope in required_scopes)
