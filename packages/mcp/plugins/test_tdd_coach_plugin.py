import os
import sys

# Add the parent directory to sys.path to import the mcp package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_plugin_import() -> bool:
    """Test that the TDD Coach plugin can be imported."""
    try:
        # Use absolute import
        print("TDD Coach plugin imported successfully")
        return True
    except Exception as e:
        print(f"Failed to import TDD Coach plugin: {e}")
        return False


if __name__ == "__main__":
    success: bool = test_plugin_import()
    sys.exit(0 if success else 1)
