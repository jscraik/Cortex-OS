import asyncio
import logging
from mcp.core.server import MCPServer
from mcp.config.config_manager import ConfigManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


async def main() -> None:
    config_manager = ConfigManager()
    config = config_manager.get_all()
    server = MCPServer(config)
    await server.initialize()
    await server.start()
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
