import importlib


def test_connection_pool_imports() -> None:
    module = importlib.import_module("mcp.core.connection_pool")
    assert hasattr(module, "MCPConnectionPool")
