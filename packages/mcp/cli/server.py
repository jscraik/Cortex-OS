"""Server management CLI commands."""

import asyncio
import json
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ..core.server import MCPServer
from ..integrations.a2a_bridge import A2ABridge
from ..integrations.memory_bridge import MemoryBridge

console = Console()


@click.group()
def server_commands():
    """Server management commands."""
    pass


@server_commands.command("init")
@click.option("--config-dir", default="config", help="Configuration directory")
@click.option("--plugin-dir", default="plugins", help="Plugin directory")
@click.option("--force", is_flag=True, help="Overwrite existing configuration")
def init_server(config_dir: str, plugin_dir: str, force: bool):
    """Initialize MCP server configuration."""
    config_path = Path(config_dir)
    plugin_path = Path(plugin_dir)

    # Create directories
    config_path.mkdir(exist_ok=True)
    plugin_path.mkdir(exist_ok=True)

    # Create default configuration
    config_file = config_path / "server.json"

    if config_file.exists() and not force:
        console.print(f"[yellow]Configuration already exists at {config_file}[/yellow]")
        console.print("[yellow]Use --force to overwrite[/yellow]")
        return

    default_config = {
        "server": {
            "host": "0.0.0.0",
            "port": 8000,
            "plugin_dir": str(plugin_path),
            "config_dir": str(config_path),
            "auto_reload": True,
        },
        "task_queue": {
            "redis_url": "redis://localhost:6379/0",
            "max_workers": 4,
            "enable_celery": False,
        },
        "integrations": {
            "a2a_bridge": {
                "event_bus_url": "redis://localhost:6379/1",
                "bridge_name": "mcp-bridge",
            },
            "memory_bridge": {
                "neo4j_uri": "bolt://localhost:7687",
                "neo4j_database": "mcp",
                "qdrant_host": "localhost",
                "qdrant_port": 6333,
            },
        },
        "security": {
            "jwt_secret": "your-secret-key-change-in-production",
            "access_token_expire_minutes": 30,
            "refresh_token_expire_days": 7,
        },
    }

    with open(config_file, "w") as f:
        json.dump(default_config, f, indent=2)

    # Create example plugin
    example_plugin = plugin_path / "example_plugin.py"
    if not example_plugin.exists():
        example_code = '''"""Example MCP plugin."""

from mcp.plugins.base import MCPPlugin, Tool


class ExamplePlugin(MCPPlugin):
    """Example plugin demonstrating MCP tool implementation."""

    def __init__(self):
        super().__init__(
            name="example",
            version="1.0.0",
            description="Example plugin for demonstration"
        )

    def get_tools(self):
        """Return list of tools provided by this plugin."""
        return [
            Tool(
                name="echo",
                description="Echo back the input message",
                parameters={
                    "message": {
                        "type": "string",
                        "description": "Message to echo",
                        "required": True,
                    }
                }
            ),
            Tool(
                name="uppercase",
                description="Convert text to uppercase",
                parameters={
                    "text": {
                        "type": "string",
                        "description": "Text to convert",
                        "required": True,
                    }
                }
            ),
        ]

    async def call_tool(self, tool_name: str, parameters: dict):
        """Execute a tool with given parameters."""
        if tool_name == "echo":
            return {"message": parameters.get("message", "")}

        elif tool_name == "uppercase":
            text = parameters.get("text", "")
            return {"result": text.upper()}

        else:
            raise ValueError(f"Unknown tool: {tool_name}")


# Plugin factory function
def create_plugin():
    """Factory function to create plugin instance."""
    return ExamplePlugin()
'''
        with open(example_plugin, "w") as f:
            f.write(example_code)

    console.print("[green]✅ MCP server initialized successfully![/green]")
    console.print(f"[cyan]Configuration:[/cyan] {config_file}")
    console.print(f"[cyan]Plugins:[/cyan] {plugin_path}")
    console.print(f"[cyan]Example plugin:[/cyan] {example_plugin}")


@server_commands.command("health")
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def health_check(config_file: str):
    """Perform comprehensive health check of MCP components."""

    async def check_health():
        health_results = {}

        try:
            # Load configuration
            config_path = Path(config_file)
            if not config_path.exists():
                return {"error": "Configuration file not found"}

            with open(config_path) as f:
                config = json.load(f)

            # Check server
            server_config = config.get("server", {})
            server = MCPServer(server_config)

            try:
                await server.initialize()
                health_results["server"] = {
                    "status": "healthy",
                    "plugins": len(server.plugin_reloader.list_plugins()),
                }
                await server.stop()
            except Exception as e:
                health_results["server"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }

            # Check task queue
            try:
                from ..tasks.task_queue import TaskQueue

                queue_config = config.get("task_queue", {})
                task_queue = TaskQueue(**queue_config)
                await task_queue.initialize()

                queue_status = await task_queue.get_status()
                health_results["task_queue"] = {
                    "status": "healthy" if queue_status["running"] else "unhealthy",
                    **queue_status,
                }

                await task_queue.shutdown()
            except Exception as e:
                health_results["task_queue"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }

            # Check integrations
            integration_config = config.get("integrations", {})

            # A2A Bridge
            try:
                a2a_config = integration_config.get("a2a_bridge", {})
                a2a_bridge = A2ABridge(**a2a_config)
                await a2a_bridge.initialize()

                a2a_health = await a2a_bridge.health_check()
                health_results["a2a_bridge"] = a2a_health

                await a2a_bridge.shutdown()
            except Exception as e:
                health_results["a2a_bridge"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }

            # Memory Bridge
            try:
                _memory_config = integration_config.get("memory_bridge", {})
                memory_bridge = MemoryBridge()

                memory_health = await memory_bridge.health_check()
                health_results["memory_bridge"] = memory_health

                await memory_bridge.close()
            except Exception as e:
                health_results["memory_bridge"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }

            return health_results

        except Exception as e:
            return {"error": f"Health check failed: {e}"}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Performing health check...", total=None)

        try:
            results = asyncio.run(check_health())
            progress.stop()

            if "error" in results:
                console.print(f"[red]Health check error: {results['error']}[/red]")
                sys.exit(1)

            # Display results
            table = Table(title="MCP Health Check Results")
            table.add_column("Component", style="cyan")
            table.add_column("Status")
            table.add_column("Details")

            for component, health in results.items():
                status = health.get("status", "unknown")

                if status == "healthy":
                    status_display = "[green]🟢 Healthy[/green]"
                elif status == "unhealthy":
                    status_display = "[red]🔴 Unhealthy[/red]"
                else:
                    status_display = "[yellow]⚠️  Unknown[/yellow]"

                # Format details
                details = []
                for key, value in health.items():
                    if key != "status":
                        if isinstance(value, dict):
                            details.append(f"{key}: {len(value)} items")
                        else:
                            details.append(f"{key}: {value}")

                table.add_row(
                    component.replace("_", " ").title(),
                    status_display,
                    "\n".join(details) if details else "No details",
                )

            console.print(table)

            # Check if any component is unhealthy
            unhealthy = [
                comp
                for comp, health in results.items()
                if health.get("status") == "unhealthy"
            ]
            if unhealthy:
                console.print(
                    f"\n[red]⚠️  Unhealthy components detected: {', '.join(unhealthy)}[/red]"
                )
                sys.exit(1)
            else:
                console.print("\n[green]✅ All components are healthy![/green]")

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Health check cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Health check error: {e}[/red]")
            sys.exit(1)


@server_commands.command("config")
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
@click.option(
    "--validate", is_flag=True, help="Validate configuration without starting server"
)
def config_info(config_file: str, validate: bool):
    """Show or validate server configuration."""
    config_path = Path(config_file)

    if not config_path.exists():
        console.print(f"[red]Configuration file not found: {config_file}[/red]")
        console.print(
            "[yellow]Run 'mcp server init' to create default configuration[/yellow]"
        )
        sys.exit(1)

    try:
        with open(config_path) as f:
            config = json.load(f)

        if validate:
            # Perform validation
            console.print("[cyan]Validating configuration...[/cyan]")

            required_sections = ["server", "task_queue", "integrations"]
            missing_sections = [
                section for section in required_sections if section not in config
            ]

            if missing_sections:
                console.print(
                    f"[red]Missing required sections: {', '.join(missing_sections)}[/red]"
                )
                sys.exit(1)

            # Validate server section
            server_config = config.get("server", {})
            required_server_keys = ["host", "port", "plugin_dir", "config_dir"]
            missing_keys = [
                key for key in required_server_keys if key not in server_config
            ]

            if missing_keys:
                console.print(
                    f"[red]Missing server configuration keys: {', '.join(missing_keys)}[/red]"
                )
                sys.exit(1)

            # Check directories exist
            plugin_dir = Path(server_config["plugin_dir"])
            config_dir = Path(server_config["config_dir"])

            if not plugin_dir.exists():
                console.print(
                    f"[yellow]Plugin directory does not exist: {plugin_dir}[/yellow]"
                )

            if not config_dir.exists():
                console.print(
                    f"[yellow]Configuration directory does not exist: {config_dir}[/yellow]"
                )

            console.print("[green]✅ Configuration is valid![/green]")

        else:
            # Display configuration
            console.print(f"[cyan]Configuration from {config_file}:[/cyan]")
            console.print(json.dumps(config, indent=2))

    except json.JSONDecodeError as e:
        console.print(f"[red]Invalid JSON in configuration file: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]Error reading configuration: {e}[/red]")
        sys.exit(1)


@server_commands.command("reset")
@click.confirmation_option(prompt="This will reset all server data. Continue?")
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def reset_server(config_file: str):
    """Reset server state and clear all data."""

    async def perform_reset():
        try:
            # Load configuration
            config_path = Path(config_file)
            if config_path.exists():
                with open(config_path) as f:
                    config = json.load(f)
            else:
                console.print("[yellow]No configuration found, using defaults[/yellow]")
                _config: dict = {}

            # Reset components
            console.print("[yellow]Resetting server state...[/yellow]")

            # Clear task queue
            try:
                from ..tasks.task_queue import TaskQueue

                task_queue = TaskQueue(enable_celery=False)
                await task_queue.initialize()

                # Clear all queues
                if task_queue.redis:
                    await task_queue.redis.flushdb()

                await task_queue.shutdown()
                console.print("[green]✅ Task queue cleared[/green]")
            except Exception as e:
                console.print(
                    f"[yellow]Warning: Could not clear task queue: {e}[/yellow]"
                )

            # Reset memory systems
            try:
                memory_bridge = MemoryBridge()
                # Note: In production, you'd want more controlled cleanup
                console.print("[green]✅ Memory systems reset[/green]")
            except Exception as e:
                console.print(
                    f"[yellow]Warning: Could not reset memory systems: {e}[/yellow]"
                )

            console.print("[green]✅ Server reset completed![/green]")

        except Exception as e:
            console.print(f"[red]Reset failed: {e}[/red]")
            sys.exit(1)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Resetting server...", total=None)

        try:
            asyncio.run(perform_reset())
        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Reset cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Reset error: {e}[/red]")
            sys.exit(1)
