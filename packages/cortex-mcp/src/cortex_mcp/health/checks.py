from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Awaitable, Callable


class HealthCheck:
    def __init__(self, name: str) -> None:
        self.name = name

    async def check(self) -> dict[str, Any]:  # pragma: no cover - to be implemented
        raise NotImplementedError


class HealthCheckRegistry:
    def __init__(self) -> None:
        self.checks: list[HealthCheck] = []

    def register(self, check: HealthCheck) -> None:
        self.checks.append(check)

    async def run_all(self) -> dict[str, Any]:
        results: dict[str, Any] = {}
        overall = 'healthy'
        for chk in self.checks:
            try:
                res = await chk.check()
                results[chk.name] = res
                if res.get('status') != 'healthy':
                    overall = 'degraded'
            except Exception as exc:
                results[chk.name] = {'status': 'error', 'error': str(exc)}
                overall = 'unhealthy'
        return {'status': overall, 'checks': results, 'timestamp': datetime.now().isoformat()}


class SystemHealthCheck(HealthCheck):
    def __init__(self) -> None:
        super().__init__('system')

    async def check(self) -> dict[str, Any]:
        return {'status': 'healthy'}


class OAuthHealthCheck(HealthCheck):
    """Health check ensuring OAuth bridge metadata and JWKS endpoints are reachable."""

    def __init__(
        self,
        *,
        enabled: bool,
        metadata_builder: Callable[[], dict[str, Any]] | None,
        jwks_probe: Callable[[], Awaitable[dict[str, Any]]] | None,
    ) -> None:
        super().__init__('oauth')
        self._enabled = enabled
        self._metadata_builder = metadata_builder
        self._jwks_probe = jwks_probe

    async def check(self) -> dict[str, Any]:
        if not self._enabled or not self._metadata_builder or not self._jwks_probe:
            return {"status": "skipped", "reason": "oauth_disabled"}

        try:
            metadata = self._metadata_builder()
        except Exception as exc:
            return {"status": "degraded", "error": f"metadata_error:{exc}"}

        try:
            jwks = await self._jwks_probe()
            key_count = len(jwks.get("keys", [])) if isinstance(jwks, dict) else 0
        except Exception as exc:
            return {"status": "degraded", "metadata": metadata, "error": f"jwks_error:{exc}"}

        if key_count == 0:
            return {
                "status": "degraded",
                "metadata": metadata,
                "error": "jwks_empty",
            }

        return {"status": "healthy", "metadata": metadata, "jwks_keys": key_count}
