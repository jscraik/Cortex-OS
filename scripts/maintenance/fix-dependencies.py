#!/usr/bin/env python3
"""
Fix dependency conflicts for MLX tools
Resolves version conflicts between mlx-openai-server, MCP, and MLX tools
"""

import subprocess


#!/usr/bin/env python3
"""Fix package dependencies by running install commands."""

import re
import subprocess
import sys
from pathlib import Path

# Input validation
def validate_command_list(cmd_list: list[str]) -> list[str]:
    """Validate command list for safe execution."""
    if not cmd_list:
        raise ValueError("Empty command list")
    
    # Validate command name
    allowed_commands = {'pnpm', 'npm', 'yarn', 'pip', 'pip3', 'uv'}
    cmd_name = Path(cmd_list[0]).name
    if cmd_name not in allowed_commands:
        raise ValueError(f"Command '{cmd_name}' not allowed")
    
    # Validate arguments
    safe_args = []
    for arg in cmd_list:
        # Remove null bytes and validate
        clean_arg = re.sub(r'[\x00]', '', str(arg))
        # Basic validation - no obvious injection attempts
        if any(char in clean_arg for char in ['|', '&', ';', '$(']):
            if not any(safe in clean_arg for safe in ['--', 'install', 'add']):
                raise ValueError(f"Potentially unsafe argument: {clean_arg}")
        safe_args.append(clean_arg)
    
    return safe_args

def run_safe_command(cmd_list: list[str]) -> subprocess.CompletedProcess:
    """Run command with validation."""
    try:
        validated_cmd = validate_command_list(cmd_list)
        result = subprocess.run(
            validated_cmd, 
            shell=False, 
            check=True, 
            capture_output=True, 
            text=True,
            timeout=300  # 5 minute timeout
        )
        return result
    except ValueError as e:
        print(f"Command validation failed: {e}", file=sys.stderr)
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("Command timed out", file=sys.stderr)
        sys.exit(1)


def main():
    """Fix MLX dependency conflicts"""
    print("🔧 Fixing MLX dependency conflicts...")

    # Upgrade conflicting dependencies to compatible versions
    upgrades = [
        ("pip install 'anyio>=4.5.0'", "Upgrading anyio to >=4.5.0"),
        ("pip install 'httpx>=0.27.0'", "Upgrading httpx to >=0.27.0"),
        ("pip install 'click>=8.2.1'", "Upgrading click to >=8.2.1"),
        ("pip install 'Pillow>=10.4.0'", "Upgrading Pillow to >=10.4.0"),
        ("pip install --upgrade fastapi", "Upgrading FastAPI to latest"),
        ("pip install --upgrade uvicorn", "Upgrading Uvicorn to latest"),
    ]

    success_count = 0
    for cmd, desc in upgrades:
        try:
            result = run_safe_command(cmd.split())
            print(f"✅ {desc}")
            success_count += 1
        except SystemExit:
            print(f"❌ Failed: {desc}")

    print("\n📊 Dependency Fix Summary:")
    print(f"✅ Successfully upgraded: {success_count}/{len(upgrades)} packages")

    # Verify installations work together
    print("\n🧪 Testing compatibility...")

    test_commands = [
        ("python -c 'import anyio; print(f\"anyio: {anyio.__version__}\")'", "anyio"),
        ("python -c 'import httpx; print(f\"httpx: {httpx.__version__}\")'", "httpx"),
        ("python -c 'import click; print(f\"click: {click.__version__}\")'", "click"),
        (
            "python -c 'import fastapi; print(f\"fastapi: {fastapi.__version__}\")'",
            "fastapi",
        ),
        ("python -c 'import mlx_lm; print(\"MLX-LM: Compatible\")'", "MLX-LM"),
        ("python -c 'import mlx_vlm; print(\"MLX-VLM: Compatible\")'", "MLX-VLM"),
    ]

    compatible_count = 0
    for cmd, name in test_commands:
        try:
            result = run_safe_command(cmd.split())
            print(f"✅ {name}: {result.stdout.strip()}")
            compatible_count += 1
        except SystemExit:
            print(f"❌ {name}: Incompatible")

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


if __name__ == "__main__":
    main()
