"""
file_path: mcp_tools/docker/test_mcp_server.py
description: Minimal TDD test for MCP Docker server compliance.
maintainer: @jamiescottcraik
last_updated: 2025-08-05
version: 1.0.0
status: active
ai_generated_by: github-copilot
ai_provenance_hash: N/A
"""

import json
import subprocess
import sys


def test_discover_tools():
    request = {"command": "discover"}
    proc = subprocess.Popen(
        [sys.executable, "mcp_server.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=".",
    )
    out, _ = proc.communicate((json.dumps(request) + "\n").encode(), timeout=5)
    lines = out.decode().splitlines()
    assert lines, "No output from MCP server"
    data = json.loads(lines[0])
    assert "tools" in data
    assert any(tool["name"] == "docker_list_containers" for tool in data["tools"])


# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
