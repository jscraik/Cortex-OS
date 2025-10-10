"""Runtime settings for Cortex Connectors."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import os


@dataclass(frozen=True)
class Settings:
    """Container for environment-driven configuration."""

    signature_key: str
    manifest_path: Path
    api_key: Optional[str]
    mcp_api_key: Optional[str]
    no_auth: bool
    log_level: str
    apps_bundle_dir: Optional[Path]
    enable_prometheus: bool

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.environ
        signature_key = env.get("CONNECTORS_SIGNATURE_KEY")
        if not signature_key:
            raise RuntimeError("CONNECTORS_SIGNATURE_KEY is required")

        manifest_path = Path(env.get("CONNECTORS_MANIFEST_PATH", "config/connectors.manifest.json"))
        api_key = env.get("CONNECTORS_API_KEY")
        mcp_api_key = env.get("MCP_API_KEY")
        no_auth = env.get("NO_AUTH", "false").lower() in {"1", "true", "yes"}
        log_level = env.get("LOG_LEVEL", "info")
        apps_bundle = env.get("APPS_BUNDLE_DIR")
        apps_bundle_dir = Path(apps_bundle) if apps_bundle else None
        enable_prometheus = env.get("ENABLE_PROMETHEUS", "false").lower() in {"1", "true", "yes"}

        if not api_key and not no_auth:
            raise RuntimeError("CONNECTORS_API_KEY is required unless NO_AUTH=true")

        return cls(
            signature_key=signature_key,
            manifest_path=manifest_path,
            api_key=api_key,
            mcp_api_key=mcp_api_key,
            no_auth=no_auth,
            log_level=log_level,
            apps_bundle_dir=apps_bundle_dir,
            enable_prometheus=enable_prometheus,
        )


__all__ = ["Settings"]
