#!/usr/bin/env python3
"""
MCP Server Verification Tool

This script helps you verify if an MCP server is running and operational.
It provides multiple ways to check server status:
1. Process check - see if the server process is running
2. Port check - verify if the server is listening on the expected port
3. Health check - test the server's health endpoint
4. MCP protocol check - verify MCP protocol communication

Usage:
    python3 verify_mcp_server.py [--port PORT] [--process-name NAME]
"""

import argparse
import json
import subprocess
import sys
from typing import Any

import requests


def check_process(process_name: str = "uvicorn") -> bool:
    """Check if the MCP server process is running."""
    print(f"🔍 Checking for process: {process_name}")
    try:
        result = subprocess.run(
            ["ps", "aux"], capture_output=True, text=True, check=True
        )

        lines = [
            line
            for line in result.stdout.split("\n")
            if process_name in line and "grep" not in line
        ]

        if lines:
            print(f"✅ Found {len(lines)} process(es):")
            for line in lines:
                # Show simplified process info
                parts = line.split()
                if len(parts) >= 11:
                    pid = parts[1]
                    command = " ".join(parts[10:])[:80] + "..."
                    print(f"   PID {pid}: {command}")
            return True
        else:
            print("❌ No matching processes found")
            return False
    except subprocess.CalledProcessError:
        print("❌ Failed to check processes")
        return False


def check_port(port: int) -> bool:
    """Check if something is listening on the specified port."""
    print(f"🔍 Checking port {port}")
    try:
        result = subprocess.run(
            ["lsof", f"-ti:{port}"], capture_output=True, text=True, check=False
        )

        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split("\n")
            print(f"✅ Port {port} is in use by PID(s): {', '.join(pids)}")
            return True
        else:
            print(f"❌ Port {port} is not in use")
            return False
    except FileNotFoundError:
        print("❌ lsof command not found")
        return False


def check_health_endpoint(port: int, timeout: int = 5) -> dict[str, Any] | None:
    """Check the server's health endpoint."""
    print(f"🔍 Testing health endpoint on port {port}")

    endpoints_to_try = [
        f"http://127.0.0.1:{port}/health",
        f"http://localhost:{port}/health",
        f"http://127.0.0.1:{port}/",
        f"http://localhost:{port}/",
    ]

    for url in endpoints_to_try:
        try:
            print(f"   Trying: {url}")
            response = requests.get(url, timeout=timeout)

            if response.status_code == 200:
                print(f"✅ Health check successful: {response.status_code}")
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    return data
                except json.JSONDecodeError:
                    print(f"   Response: {response.text[:200]}")
                    return {"status": "ok", "text": response.text}
            else:
                print(f"   Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   Error: {str(e)}")
            continue

    print("❌ No health endpoint responded")
    return None


def check_mcp_protocol(port: int) -> bool:
    """Attempt basic MCP protocol communication."""
    print(f"🔍 Testing MCP protocol on port {port}")

    # This is a simplified check - real MCP uses JSON-RPC over stdio/websockets
    endpoints = [f"http://127.0.0.1:{port}/tools", f"http://127.0.0.1:{port}/stream"]

    for endpoint in endpoints:
        try:
            print(f"   Trying: {endpoint}")
            response = requests.get(endpoint, timeout=5)
            if response.status_code == 200:
                print(f"   ✅ {endpoint}: {response.status_code}")
                try:
                    data = response.json()
                    print(f"      Response: {json.dumps(data, indent=2)[:200]}...")
                except json.JSONDecodeError:
                    print(f"      Response: {response.text[:100]}...")
                return True
        except requests.RequestException as e:
            print(f"   Error: {str(e)}")

    return False


def get_server_info() -> None:
    """Display general server information."""
    print("\n📊 Server Environment Info:")
    print(f"   Python: {sys.version.split()[0]}")

    try:
        import uvicorn

        print(f"   Uvicorn: {uvicorn.__version__}")
    except ImportError:
        print("   Uvicorn: Not installed")

    try:
        import fastapi

        print(f"   FastAPI: {fastapi.__version__}")
    except ImportError:
        print("   FastAPI: Not installed")


def main():
    parser = argparse.ArgumentParser(description="Verify MCP server status")
    parser.add_argument(
        "--port", "-p", type=int, default=3000, help="Port to check (default: 3000)"
    )
    parser.add_argument(
        "--process-name",
        type=str,
        default="uvicorn",
        help="Process name to look for (default: uvicorn)",
    )
    parser.add_argument(
        "--quiet", "-q", action="store_true", help="Less verbose output"
    )

    args = parser.parse_args()

    print("🚀 MCP Server Verification Tool")
    print("=" * 50)

    if not args.quiet:
        get_server_info()

    print(f"\n🔍 Checking MCP server on port {args.port}...")
    print("-" * 30)

    # Run all checks
    results = {
        "process": check_process(args.process_name),
        "port": check_port(args.port),
        "health": check_health_endpoint(args.port) is not None,
        "mcp": False,  # Will be set by check_mcp_protocol
    }

    # Only test MCP protocol if port is in use
    if results["port"]:
        results["mcp"] = check_mcp_protocol(args.port)

    print("\n📋 Summary:")
    print("-" * 20)
    for check, status in results.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {check.capitalize()}: {'OK' if status else 'FAIL'}")

    # Overall assessment
    if all(results.values()):
        print("\n🎉 Server appears to be fully operational!")
        sys.exit(0)
    elif results["port"] and results["health"]:
        print("\n✅ Server is running and responding to health checks")
        sys.exit(0)
    elif results["process"]:
        print("\n⚠️  Server process is running but may not be accessible")
        sys.exit(1)
    else:
        print("\n❌ Server does not appear to be running")
        sys.exit(1)


if __name__ == "__main__":
    main()
