"""
Simple test for the ChatGPT Connector MCP Server.
"""

import os
import sys

# Add the parent directory to the path so we can import the mcp module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def test_import() -> bool:
    """Test that we can import the server class."""
    try:
        # Directly import the server module
        import server
        print("Import successful")
        return True
    except Exception as e:
        print(f"Import failed: {e}")
        return False


def test_initialization() -> bool:
    """Test that we can initialize the server."""
    try:
        # Directly import the server module
        import server
        server_instance = server.ChatGPTConnectorServer()
        print("Initialization successful")
        return True
    except Exception as e:
        print(f"Initialization failed: {e}")
        return False


def main() -> None:
    """Main test function."""
    print("Testing ChatGPT Connector MCP Server...")

    if test_import():
        test_initialization()


if __name__ == "__main__":
    main()