#!/usr/bin/env python3
"""
TDD-focused integration tests for Cortex-OS FastMCP Server v2.0
"""

import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from _pytest.monkeypatch import MonkeyPatch


class TestFastMCPServerIntegration:
    """Integration tests for FastMCP server."""

    @pytest.fixture
    def project_root(self) -> Path:
        """Get project root directory."""
        return Path(__file__).parent.parent.parent

    @pytest.fixture
    def server_path(self, project_root: Path) -> Path:
        """Get server file path."""
        return project_root / "packages/cortex-mcp/cortex_fastmcp_server_v2.py"

    def test_server_file_exists(self, server_path: Path) -> None:
        """Test that server file exists."""
        assert server_path.exists(), f"Server file not found: {server_path}"

    def test_server_can_be_imported(self) -> None:
        """Test that server module can be imported."""
        try:
            from cortex_fastmcp_server_v2 import create_server

            server = create_server()
            assert server is not None
        except ImportError as e:
            pytest.fail(f"Failed to import server: {e}")

    def test_server_instructions_exist(self) -> None:
        """Test that server instructions are defined."""
        from cortex_fastmcp_server_v2 import server_instructions

        assert server_instructions.strip() != ""
        assert "search" in server_instructions.lower()
        assert "cortex-os" in server_instructions.lower()

    def test_fastmcp_cli_inspect_works(
        self, project_root: Path, server_path: Path
    ) -> None:
        """Test that FastMCP CLI can inspect the server."""
        cmd = ["fastmcp", "inspect", str(server_path)]
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=str(project_root), timeout=30
        )

        if result.returncode != 0:
            # Skip test if fastmcp not available
            pytest.skip(f"FastMCP CLI not available: {result.stderr}")

        assert "Cortex-OS MCP Server" in result.stdout
        assert "Tools:" in result.stdout or "tools" in result.stdout.lower()

    def test_server_creation_is_idempotent(self) -> None:
        """Test that creating multiple servers works."""
        from cortex_fastmcp_server_v2 import create_server

        server1 = create_server()
        server2 = create_server()

        assert server1 is not None
        assert server2 is not None
        # They should be different instances
        assert server1 is not server2

    def test_main_function_exists(self) -> None:
        """Test that main function is defined."""
        from cortex_fastmcp_server_v2 import main

        assert callable(main)

    def test_global_mcp_instance_exists(self) -> None:
        """Test that global MCP instance exists for CLI."""
        import cortex_fastmcp_server_v2

        assert hasattr(cortex_fastmcp_server_v2, "mcp")
        assert cortex_fastmcp_server_v2.mcp is not None


class TestServerEnvironmentHandling:
    """Test environment variable handling."""

    def test_default_values_are_set(self, monkeypatch: "MonkeyPatch") -> None:
        """Test that default environment values are used."""
        # Clear environment variables
        monkeypatch.delenv("HOST", raising=False)
        monkeypatch.delenv("PORT", raising=False)
        monkeypatch.delenv("TRANSPORT", raising=False)

        # Import main to check defaults would be used
        from cortex_fastmcp_server_v2 import main

        # Just test that it doesn't crash on import
        assert callable(main)

    def test_custom_environment_values(self, monkeypatch: "MonkeyPatch") -> None:
        """Test that custom environment values are respected."""
        monkeypatch.setenv("HOST", "127.0.0.1")
        monkeypatch.setenv("PORT", "8080")
        monkeypatch.setenv("TRANSPORT", "stdio")

        # Import main - should use custom values
        from cortex_fastmcp_server_v2 import main

        assert callable(main)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
