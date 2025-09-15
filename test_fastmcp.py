#!/usr/bin/env python3
"""Simple FastMCP test server"""

import os

from fastmcp import FastMCP

# Create server
server = FastMCP("Test Server")


@server.tool
def ping() -> str:
    """Simple ping tool"""
    return "pong"


def main():
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "3024"))

    print(f"Starting FastMCP server on {host}:{port}")
    print("Using SSE transport")

    # Start with SSE transport for ChatGPT compatibility
    server.run(transport="sse", host=host, port=port)


if __name__ == "__main__":
    main()
