from __future__ import annotations

from datetime import datetime
from typing import Any


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
