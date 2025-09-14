#!/usr/bin/env python3
"""
Simple runner for the ChatGPT connector MCP server using uvicorn directly.
"""

import uvicorn
from fastmcp.server.http import create_sse_app
from server import create_server

if __name__ == "__main__":
    # Create the FastMCP server
    server = create_server()
    
    # Get the SSE ASGI app using the direct method
    app = create_sse_app(server)
    
    print("Starting Cortex-OS ChatGPT Connector MCP server on 0.0.0.0:3000")
    print("Server will be accessible via SSE at http://0.0.0.0:3000/sse/")
    
    uvicorn.run(app, host="0.0.0.0", port=3000, log_level="info")