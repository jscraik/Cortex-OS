<!--
file_path: mcp_tools/docker/README.md
maintainer: @jamiescottcraik
last_updated: 2025-08-05
version: 1.0.0
status: active
ai_generated_by: github-copilot
ai_provenance_hash: N/A
-->

# MCP Docker Server Toolkit

This directory contains a minimal MCP server implementation for Docker container management.
It is designed for agent orchestration and compliance with Cortex OS standards.

## Files

- `Dockerfile`: Builds a Python 3.11 container running the MCP server.
- `pyproject.toml`/`uv.lock`: Managed Python dependencies.
- `mcp_server.py`: Implements tool registry and API endpoints for Docker management.

## Usage

1. Build the Docker image:

   ```sh
   docker build -t mcp-docker-server .
   ```

2. Run the server:

   ```sh
   docker run --rm -it mcp-docker-server
   ```

3. Communicate with the server via stdin/stdout (see `mcp_server.py` for protocol).

## Compliance

- Follows Cortex OS MCP toolkit requirements
- Implements tool registry, error handling, and agent orchestration endpoints
- No external dependencies required

---

<!-- © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering. -->
