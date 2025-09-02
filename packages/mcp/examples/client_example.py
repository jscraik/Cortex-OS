"""Example MCP client usage."""

from mcp.core.client import MCPClient


async def main() -> None:
    client = MCPClient()
    await client.send_message({})
