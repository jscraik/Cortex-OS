#!/usr/bin/env python3
"""
Verification script for ChatGPT Connector HTTPS setup via Cloudflare tunnel

This script verifies that the MCP server is properly accessible through
the Cloudflare tunnel at https://mcp.brainwav.io/sse/
"""

import asyncio
import subprocess
import sys

import httpx


async def verify_setup():
    """Verify the HTTPS setup through Cloudflare tunnel."""
    print("🔐 Verifying ChatGPT Connector HTTPS Setup")
    print("=" * 50)

    # Configuration
    local_url = "http://localhost:3000/sse/"
    tunnel_url = "https://mcp.brainwav.io/sse/"

    print(f"🏠 Local server: {local_url}")
    print(f"🌐 Cloudflare tunnel: {tunnel_url}")
    print()

    # Start local server
    print("🚀 Starting local MCP server...")
    server_process = subprocess.Popen(
        [sys.executable, "server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    # Wait for server to start
    print("⏳ Waiting for server to start...")
    await asyncio.sleep(5)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test local endpoint
            print("🔍 Testing local endpoint...")
            try:
                response = await client.get(local_url)
                print(f"   ✅ Local: {response.status_code}")
            except Exception as e:
                print(f"   ❌ Local: {e}")

            # Test Cloudflare tunnel endpoint
            print("🔍 Testing Cloudflare tunnel endpoint...")
            try:
                response = await client.get(tunnel_url)
                print(f"   ✅ Tunnel: {response.status_code}")
                print(f"   🌐 HTTPS URL: {tunnel_url}")
            except Exception as e:
                print(f"   ❌ Tunnel: {e}")
                print("   💡 Make sure Cloudflare tunnel is running")

        print()
        print("📋 ChatGPT Integration Instructions:")
        print("=" * 40)
        print(f"1. 🔗 Use this URL in ChatGPT: {tunnel_url}")
        print("2. ⚙️  Go to ChatGPT Settings > Connectors")
        print("3. ➕ Add new MCP server")
        print("4. 🔧 Configure:")
        print("   - Name: Cortex-OS")
        print(f"   - URL: {tunnel_url}")
        print("   - Tools: search, fetch")
        print("5. ✅ Test the connection")
        print()
        print("🛠️  Available Tools:")
        print("   - search(query): Find documents in Cortex-OS")
        print("   - fetch(id): Get complete document content")

    finally:
        print("🛑 Stopping server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
            server_process.wait()


if __name__ == "__main__":
    asyncio.run(verify_setup())
