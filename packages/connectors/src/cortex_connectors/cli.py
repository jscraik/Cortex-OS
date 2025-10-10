"""CLI entry points for connectors."""

from __future__ import annotations

import argparse
import json
from typing import Sequence

from .registry import ConnectorRegistry
from .settings import Settings


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cortex Connectors CLI")
    parser.add_argument("command", choices=["service-map"], help="Command to execute")
    parser.add_argument("--plain", action="store_true", dest="plain", help="Disable pretty output")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    settings = Settings.from_env()
    registry = ConnectorRegistry(settings.manifest_path, settings.signature_key)
    registry.refresh()

    if args.command == "service-map":
        payload = registry.service_map()
        if args.plain:
            print(json.dumps(payload, separators=(",", ":")))
        else:
            print(json.dumps(payload, indent=2))
    else:  # pragma: no cover - defensive future proofing
        parser.error(f"Unknown command {args.command}")
    return 0


__all__ = ["main", "build_parser"]
