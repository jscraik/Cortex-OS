#!/usr/bin/env python3
"""Fix dependency conflicts for MLX tools in a shell-safe manner."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from shlex import quote
from typing import Iterable, Sequence


ALLOWED_COMMANDS = {"pnpm", "npm", "yarn", "pip", "pip3", "uv", "python"}


def _clean_argument(arg: str) -> str:
    """Remove dangerous characters from an argument."""
    cleaned = re.sub(r"[\x00]", "", arg)
    if any(token in cleaned for token in ("|", "&", ";", "$", "`")):
        raise ValueError(f"Potentially unsafe argument: {cleaned}")
    return cleaned


def validate_command(args: Sequence[str]) -> list[str]:
    """Validate the command to prevent command injection."""
    if not args:
        raise ValueError("Empty command list")

    executable = Path(args[0]).name
    if executable not in ALLOWED_COMMANDS:
        raise ValueError(f"Command '{executable}' not allowed")

    return [_clean_argument(str(part)) for part in args]


def run_safe_command(args: Sequence[str]) -> subprocess.CompletedProcess:
    """Run a validated command returning the completed process."""

    validated = validate_command(args)
    try:
        # nosemgrep: semgrep.owasp-top-10-2021-a03-injection-command - command components validated and allowlisted
        return subprocess.run(
            validated,
            shell=False,
            check=True,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Command timed out") from exc


def _log_command(args: Iterable[str]) -> str:
    return " ".join(quote(part) for part in args)


def main() -> None:
    """Fix MLX dependency conflicts."""

    print("🔧 Fixing MLX dependency conflicts...")

    upgrade_commands: tuple[tuple[Sequence[str], str], ...] = (
        (("pip", "install", "anyio>=4.5.0"), "Upgrading anyio to >=4.5.0"),
        (("pip", "install", "httpx>=0.27.0"), "Upgrading httpx to >=0.27.0"),
        (("pip", "install", "click>=8.2.1"), "Upgrading click to >=8.2.1"),
        (("pip", "install", "Pillow>=10.4.0"), "Upgrading Pillow to >=10.4.0"),
        (("pip", "install", "--upgrade", "fastapi"), "Upgrading FastAPI to latest"),
        (("pip", "install", "--upgrade", "uvicorn"), "Upgrading Uvicorn to latest"),
    )

    success_count = 0
    for command, description in upgrade_commands:
        try:
            run_safe_command(command)
        except (ValueError, RuntimeError, subprocess.CalledProcessError) as err:
            print(f"❌ Failed: {description} ({err})")
        else:
            print(f"✅ {description}")
            success_count += 1

    print("\n📊 Dependency Fix Summary:")
    print(f"✅ Successfully upgraded: {success_count}/{len(upgrade_commands)} packages")

    print("\n🧪 Testing compatibility...")
    test_commands: tuple[tuple[Sequence[str], str], ...] = (
        (("python", "-c", "import anyio; print(f'anyio: {anyio.__version__}')"), "anyio"),
        (("python", "-c", "import httpx; print(f'httpx: {httpx.__version__}')"), "httpx"),
        (("python", "-c", "import click; print(f'click: {click.__version__}')"), "click"),
        (("python", "-c", "import fastapi; print(f'fastapi: {fastapi.__version__}')"), "fastapi"),
        (("python", "-c", "import mlx_lm; print('MLX-LM: Compatible')"), "MLX-LM"),
        (("python", "-c", "import mlx_vlm; print('MLX-VLM: Compatible')"), "MLX-VLM"),
    )

    compatible_count = 0
    for command, name in test_commands:
        try:
            result = run_safe_command(command)
        except (ValueError, RuntimeError, subprocess.CalledProcessError) as err:
            print(f"❌ {name}: {err}")
        else:
            print(f"✅ {name}: {result.stdout.strip() or _log_command(command)}")
            compatible_count += 1

    print("\n🎯 Compatibility Results:")
    print(f"✅ Compatible packages: {compatible_count}/{len(test_commands)}")

    if compatible_count == len(test_commands):
        print("🎉 All dependencies are now compatible!")
    else:
        print("⚠️  Some compatibility issues remain. Manual intervention may be needed.")
        print("\nRecommendations:")
        print("1. Consider using virtual environments to isolate conflicting packages")
        print("2. Pin specific versions in requirements.txt")
        print("3. Use conda instead of pip for complex ML environments")


if __name__ == "__main__":  # pragma: no cover - script entrypoint
    try:
        main()
    except ValueError as err:
        print(f"Command validation failed: {err}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as err:
        print(str(err), file=sys.stderr)
        sys.exit(1)
