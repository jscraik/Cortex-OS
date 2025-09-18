#!/usr/bin/env python3
"""
Test script for Cortex-OS FastMCP Server transport modes
"""

import json
import subprocess
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ Missing dependency: pip install requests")
    sys.exit(1)


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def test_server_inspect() -> bool:
    """Test server inspection using FastMCP CLI"""
    print("🔍 Testing server inspection...")

    project_root = get_project_root()
    server_path = project_root / "packages/cortex-mcp/cortex_fastmcp_server_v2.py"
    
    if not server_path.exists():
        print(f"❌ Server file not found: {server_path}")
        return False

    # Use fastmcp binary directly, not python -m
    cmd = [
        "fastmcp",
        "inspect",
        str(server_path),
    ]
    
    result = subprocess.run(
        cmd, capture_output=True, text=True, cwd=str(project_root)
    )

    if result.returncode == 0:
        print("✅ Server inspection successful")
        print(f"📊 Output preview:\n{result.stdout[:300]}...")
        return True
    else:
        print(f"❌ Server inspection failed: {result.stderr}")
        return False


def test_cloudflare_endpoint() -> bool:
    """Test Cloudflare tunnel endpoint"""
    print("\n🌐 Testing Cloudflare tunnel endpoint...")

    try:
        # Test basic connectivity
        response = requests.get("https://cortex-mcp.brainwav.io/mcp", timeout=5)
        print(f"📡 Cloudflare response status: {response.status_code}")

        if response.status_code in [400, 405]:  # Expected for MCP protocol
            print("✅ Cloudflare tunnel is working (expected error response)")
            return True
        else:
            print(f"⚠️  Unexpected response: {response.text[:100]}...")
            return False

    except requests.RequestException as e:
        print(f"❌ Cloudflare test failed: {e}")
        return False


def test_server_capabilities() -> bool:
    """Test server capabilities using FastMCP CLI"""
    print("\n🛠️  Testing server capabilities...")

    project_root = get_project_root()
    server_path = project_root / "packages/cortex-mcp/cortex_fastmcp_server_v2.py"
    
    cmd = [
        "fastmcp",
        "inspect",
        str(server_path),
        "--format",
        "mcp",
    ]

    result = subprocess.run(
        cmd, capture_output=True, text=True, cwd=str(project_root)
    )

    if result.returncode == 0:
        try:
            data = json.loads(result.stdout)
            tools = data.get("tools", [])
            print(f"✅ Server has {len(tools)} tools:")
            for tool in tools:
                print(f"   🔧 {tool['name']}: {tool['description'][:50]}...")
            return True
        except json.JSONDecodeError:
            print("⚠️  Could not parse server response as JSON")
            return False
    else:
        print(f"❌ Capabilities test failed: {result.stderr}")
        return False


def show_transport_commands():
    """Show how to run server with different transports"""
    print("\n🚀 FastMCP CLI Transport Commands:")
    print("=" * 50)

    commands = {
        "STDIO": "fastmcp run packages/cortex-mcp/cortex_fastmcp_server_v2.py --transport stdio",
        "HTTP": "fastmcp run packages/cortex-mcp/cortex_fastmcp_server_v2.py --transport http --port 3024",
        "SSE": "fastmcp run packages/cortex-mcp/cortex_fastmcp_server_v2.py --transport sse --port 3024",
        "Inspector": "fastmcp dev packages/cortex-mcp/cortex_fastmcp_server_v2.py",
        "Inspect": "fastmcp inspect packages/cortex-mcp/cortex_fastmcp_server_v2.py --format mcp",
    }

    for transport, command in commands.items():
        print(f"\n📡 {transport}:")
        print(f"   {command}")

    print("\n🌐 ChatGPT URL: https://cortex-mcp.brainwav.io/mcp")
    print("🔧 Inspector URL: http://localhost:6274 (when using 'fastmcp dev')")


def main() -> None:
    """Main test function"""
    print("🧪 Cortex-OS FastMCP Server Test Suite")
    print("=" * 50)

    results: list[tuple[str, bool]] = []

    # Run tests
    results.append(("Server Inspection", test_server_inspect()))
    results.append(("Cloudflare Endpoint", test_cloudflare_endpoint()))
    results.append(("Server Capabilities", test_server_capabilities()))

    # Show results
    print("\n📊 Test Results:")
    print("=" * 30)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")

    # Show commands
    show_transport_commands()

    # Final summary
    passed_count = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\n🏆 Final Score: {passed_count}/{total} tests passed")

    if passed_count == total:
        print("🎉 All tests passed! Your FastMCP server is ready for ChatGPT!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    main()
