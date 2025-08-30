#!/usr/bin/env python3
"""
Fix dependency conflicts for MLX tools
Resolves version conflicts between mlx-openai-server, MCP, and MLX tools
"""

import subprocess
import sys


def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"{description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return None


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
        if run_command(cmd, desc):
            success_count += 1
    
    print(f"\n📊 Dependency Fix Summary:")
    print(f"✅ Successfully upgraded: {success_count}/{len(upgrades)} packages")
    
    # Verify installations work together
    print("\n🧪 Testing compatibility...")
    
    test_commands = [
        ("python -c 'import anyio; print(f\"anyio: {anyio.__version__}\")'", "anyio"),
        ("python -c 'import httpx; print(f\"httpx: {httpx.__version__}\")'", "httpx"), 
        ("python -c 'import click; print(f\"click: {click.__version__}\")'", "click"),
        ("python -c 'import fastapi; print(f\"fastapi: {fastapi.__version__}\")'", "fastapi"),
        ("python -c 'import mlx_lm; print(\"MLX-LM: Compatible\")'", "MLX-LM"),
        ("python -c 'import mlx_vlm; print(\"MLX-VLM: Compatible\")'", "MLX-VLM"),
    ]
    
    compatible_count = 0
    for cmd, name in test_commands:
        result = run_command(cmd, f"Testing {name}")
        if result:
            print(f"✅ {name}: {result.strip()}")
            compatible_count += 1
        else:
            print(f"❌ {name}: Incompatible")
    
    print(f"\n🎯 Compatibility Results:")
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