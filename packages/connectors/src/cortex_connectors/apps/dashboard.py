"""Helpers for serving the ChatGPT Apps dashboard bundle."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.staticfiles import StaticFiles

DEFAULT_MOUNT_PATH = "/apps/chatgpt-dashboard"


def mount_dashboard(app: Starlette, bundle_dir: Path, mount_path: str = DEFAULT_MOUNT_PATH) -> None:
	"""Mount the dashboard bundle or expose a troubleshooting route when missing."""

	resolved_dir = bundle_dir.expanduser().resolve()
	if resolved_dir.is_dir():
		app.mount(mount_path, StaticFiles(directory=str(resolved_dir), html=True), name="chatgpt-dashboard")
		return

	async def dashboard_missing(_) -> JSONResponse:
		return JSONResponse(
			{
				"brand": "brAInwav",
				"error": "ChatGPT Apps dashboard bundle is missing",
				"bundleDir": str(resolved_dir),
				"remediation": [
					"Run `pnpm --filter apps/chatgpt-dashboard build`",
					"Ensure APPS_BUNDLE_DIR points to the built output",
				],
			},
			status_code=500,
		)

	app.router.routes.append(Route(f"{mount_path}/missing", dashboard_missing, methods=["GET"]))


def locate_bundle_dir(env_value: Optional[str]) -> Path:
	"""Resolve bundle directory from env or use default dist path."""

	if env_value:
		return Path(env_value).expanduser().resolve()
	return Path("dist/apps/chatgpt-dashboard").resolve()
