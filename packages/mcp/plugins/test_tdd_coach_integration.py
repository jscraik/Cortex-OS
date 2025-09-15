#!/usr/bin/env python3
"""
Test script to verify TDD Coach plugin integration with MCP hub.
"""

import asyncio
import sys
from pathlib import Path

# Ensure the directory that contains the `mcp` package is on sys.path
PKG_PARENT = Path(__file__).resolve().parents[1]
if str(PKG_PARENT) not in sys.path:
    sys.path.insert(0, str(PKG_PARENT))

from mcp.plugins.tdd_coach_plugin import TDDCoachPlugin


async def test_plugin_initialization() -> bool:
    """Test plugin initialization."""
    print("Testing TDD Coach plugin initialization...")

    # Create plugin instance
    plugin = TDDCoachPlugin(
        {"tdd_coach_path": "/Users/jamiecraik/.Cortex-OS/packages/tdd-coach"}
    )

    # Initialize plugin
    await plugin.initialize()

    # Check if plugin was initialized successfully
    if plugin.initialized:
        print("✓ Plugin initialized successfully")

        # Get tools list
        tools = plugin.get_tools()
        print(f"✓ Plugin provides {len(tools)} tools:")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description}")

        # Clean up
        await plugin.cleanup()
        print("✓ Plugin cleaned up successfully")
        return True
    else:
        print("✗ Plugin failed to initialize")
        return False


async def main() -> int:
    """Main test function."""
    try:
        result: bool = await test_plugin_initialization()
        return 0 if result else 1
    except Exception as e:
        print(f"Test failed with exception: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
