#!/usr/bin/env python3
"""
Test script to verify the FastAPI MCP server is working
"""

import asyncio
import subprocess
import sys

import requests


def start_server():
    """Start the server in a subprocess"""
    return subprocess.Popen(
        [
            sys.executable,
            "-c",
            """
import uvicorn
from server import app
uvicorn.run(app, host='127.0.0.1', port=3000, access_log=False)
""",
        ],
        cwd="/Users/jamiecraik/.Cortex-OS/packages/mcp/mcp/servers/chatgpt_connector",
    )


async def test_endpoints():
    """Test the server endpoints"""
    base_url = "http://127.0.0.1:3000"

    # Wait a moment for server to start
    await asyncio.sleep(2)

    try:
        # Test root endpoint
        print("Testing root endpoint...")
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"Root: {response.status_code} - {response.json()}")

        # Test health endpoint
        print("Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health: {response.status_code} - {response.json()}")

        # Test tools endpoint
        print("Testing tools endpoint...")
        response = requests.post(
            f"{base_url}/tools", json={"name": "test", "arguments": {}}, timeout=5
        )
        print(f"Tools: {response.status_code} - {response.json()}")

        return True
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


def main():
    print("🚀 Starting server and running tests...")

    # Start server
    server_process = start_server()

    try:
        # Run tests
        result = asyncio.run(test_endpoints())

        if result:
            print("✅ All tests passed!")
        else:
            print("❌ Tests failed!")

    finally:
        # Kill server
        server_process.terminate()
        server_process.wait()
        print("🛑 Server stopped")


if __name__ == "__main__":
    main()
