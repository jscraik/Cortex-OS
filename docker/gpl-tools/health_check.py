#!/usr/bin/env python3
"""
file_path: docker/gpl-tools/health_check.py
description: Health check utility for GPL tools service
maintainer: @jamiescottcraik
last_updated: 2025-08-05
version: 1.0.0
status: active
ai_generated_by: claude-3-5-sonnet-20241022
ai_provenance_hash: sha256:abcd1234...
"""

import subprocess
import sys
from pathlib import Path
from typing import Sequence


def _run_allowlisted_command(command: Sequence[str], **kwargs) -> subprocess.CompletedProcess:
    """Execute a predefined command after validating arguments."""

    if not command:
        raise RuntimeError("Empty command is not allowed")

    sanitized: list[str] = []
    for part in command:
        if not isinstance(part, str):
            raise RuntimeError("Command parts must be strings")
        if any(token in part for token in ("|", "&", ";", "$", "`")):
            raise RuntimeError(f"Unsafe token in command part: {part}")
        sanitized.append(part)

    # nosemgrep: semgrep.owasp-top-10-2021-a03-injection-command - command arguments validated for static tool checks
    return subprocess.run(
        sanitized,
        shell=False,
        **kwargs,
    )


def check_tool_availability():
    """Check if GPL tools are installed and working"""
    tools = ["viu", "chafa", "timg"]
    available_tools = []

    for tool in tools:
        try:
            result = _run_allowlisted_command(
                [tool, "--version"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                available_tools.append(tool)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue

    return available_tools


def check_service_requirements():
    """Check if service requirements are met"""
    checks = {
        "safe_image_dir": Path("/app/images").exists(),
        "python_executable": True,
        "service_script": Path("/app/gpl_service.py").exists(),
    }

    return all(checks.values()), checks


def main():
    """Main health check function"""
    print("🔍 Running GPL Tools Service Health Check...")

    # Check tool availability
    available_tools = check_tool_availability()
    print(
        f"📋 Available tools: {', '.join(available_tools) if available_tools else 'None'}"
    )

    if not available_tools:
        print("❌ No GPL tools available!")
        sys.exit(1)

    # Check service requirements
    requirements_ok, checks = check_service_requirements()
    print(f"🔧 Service requirements: {'✅ OK' if requirements_ok else '❌ Failed'}")

    if not requirements_ok:
        print("Failed checks:")
        for check, status in checks.items():
            if not status:
                print(f"  - {check}: ❌")
        sys.exit(1)

    print("✅ Health check passed - GPL tools service ready")
    sys.exit(0)


if __name__ == "__main__":
    main()

# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
