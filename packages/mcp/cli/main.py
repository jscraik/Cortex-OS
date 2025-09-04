"""Main CLI entry point for MCP management."""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any

import click
from rich.console import Console  # type: ignore[import-not-found]
from rich.panel import Panel  # type: ignore[import-not-found]
from rich.progress import Progress, SpinnerColumn, TextColumn  # type: ignore[import-not-found]
from rich.table import Table  # type: ignore[import-not-found]
import uvicorn

from ..core.server import MCPServer
from ..tasks.task_queue import TaskQueue
from ..webui.app import app

# Import and register subcommand groups (kept adjacent to other imports)
from .auth import auth_commands
from .plugins import plugin_commands
from .server import server_commands
from .tasks import task_commands
from .tools import tool_commands

console: Any = Console()


class CLIContext:
    """Shared CLI context for MCP operations."""

    def __init__(self) -> None:
        self.config_dir = Path.home() / ".mcp"
        self.config_file = self.config_dir / "config.json"
        self.log_level = "INFO"
        self.debug = False

        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)

    def setup_logging(self) -> None:
        """Setup logging configuration."""
        logging.basicConfig(
            level=getattr(logging, self.log_level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )


# Global CLI context
cli_context = CLIContext()


@click.group()
@click.option(
    "--config-dir",
    default=str(cli_context.config_dir),
    help="Configuration directory path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
)
@click.option(
    "--log-level",
    default="INFO",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"]),
    help="Set logging level",
)
@click.option("--debug", is_flag=True, help="Enable debug mode")
@click.pass_context
def cli(ctx: Any, config_dir: str, log_level: str, debug: bool) -> None:
    """MCP (Model Context Protocol) management CLI.

    This tool provides comprehensive management capabilities for MCP servers,
    including server operations, plugin management, task queue monitoring,
    and integration with Cortex-OS components.
    """
    ctx.ensure_object(dict)
    cli_context.config_dir = Path(config_dir)
    cli_context.log_level = log_level
    cli_context.debug = debug

    cli_context.setup_logging()

    # Store context for subcommands
    ctx.obj["cli_context"] = cli_context


@cli.command()
@click.option("--host", default="0.0.0.0", help="Host to bind to")
@click.option("--port", default=8000, type=int, help="Port to bind to")
@click.option("--workers", default=1, type=int, help="Number of worker processes")
@click.option("--reload", is_flag=True, help="Enable auto-reload for development")
@click.option("--plugin-dir", default="plugins", help="Plugin directory path")
@click.option("--config-dir", default="config", help="Configuration directory")
@click.pass_context
def serve(
    _ctx: Any,
    host: str,
    port: int,
    workers: int,
    reload: bool,
    plugin_dir: str,
    config_dir: str,
) -> None:
    """Start the MCP web server with FastAPI interface."""
    console.print(
        Panel.fit(
            "[bold blue]Starting MCP Server[/bold blue]\n"
            f"Host: {host}:{port}\n"
            f"Workers: {workers}\n"
            f"Plugin Dir: {plugin_dir}\n"
            f"Config Dir: {config_dir}",
            title="🚀 MCP Server",
        )
    )

    # Configure uvicorn
    uvicorn_config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        workers=workers if not reload else 1,  # Reload only works with single worker
        reload=reload,
        log_level=cli_context.log_level.lower(),
        access_log=True,
    )

    server = uvicorn.Server(uvicorn_config)

    try:
        asyncio.run(server.serve())
    except KeyboardInterrupt:
        console.print("\n[yellow]Server stopped by user[/yellow]")
    except Exception as e:
        console.print(f"[red]Server error: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.option(
    "--format", "output_format", default="table", type=click.Choice(["table", "json"])
)
@click.pass_context
def status(_ctx: Any, output_format: str) -> None:
    """Show MCP system status and health information."""

    async def get_status() -> dict[str, Any]:
        try:
            # Initialize core components
            server_config = {
                "plugin_dir": "plugins",
                "config_dir": "config",
                "auto_reload": False,
            }

            server = MCPServer(server_config)
            await server.initialize()

            task_queue = TaskQueue(enable_celery=False)
            await task_queue.initialize()

            # Get status information
            status_info = {
                "server": {
                    "running": server.running,
                    "plugins": len(server.plugin_reloader.list_plugins()),
                },
                "task_queue": await task_queue.get_status(),
            }

            # Clean up
            await server.stop()
            await task_queue.shutdown()

            return status_info

        except Exception as e:
            return {"error": str(e)}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task("Checking MCP status...", total=None)

        try:
            status_info = asyncio.run(get_status())
            progress.stop()

            if "error" in status_info:
                console.print(
                    f"[red]Error getting status: {status_info['error']}[/red]"
                )
                sys.exit(1)

            if output_format == "json":
                import json

                console.print(json.dumps(status_info, indent=2))
            else:
                # Display as table
                table = Table(title="MCP System Status")
                table.add_column("Component", style="cyan")
                table.add_column("Status", style="green")
                table.add_column("Details")

                # Server status
                server_status = (
                    "🟢 Running" if status_info["server"]["running"] else "🔴 Stopped"
                )
                table.add_row(
                    "MCP Server",
                    server_status,
                    f"Plugins: {status_info['server']['plugins']}",
                )

                # Task queue status
                queue_info = status_info["task_queue"]
                queue_status = "🟢 Running" if queue_info["running"] else "🔴 Stopped"
                table.add_row(
                    "Task Queue",
                    queue_status,
                    f"Workers: {queue_info['workers']}, Active: {queue_info['active_tasks']}",
                )

                console.print(table)

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Status check cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Error: {e}[/red]")
            sys.exit(1)


@cli.command()
@click.option("--lines", default=50, type=int, help="Number of log lines to show")
@click.option("--follow", is_flag=True, help="Follow log output")
@click.option(
    "--level", default="INFO", type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"])
)
def logs(lines: int, follow: bool, level: str) -> None:
    """Show MCP system logs."""
    log_file = cli_context.config_dir / "mcp.log"

    if not log_file.exists():
        console.print(
            "[yellow]No log file found. Start the server to generate logs.[/yellow]"
        )
        return

    console.print(f"[cyan]Showing last {lines} lines from {log_file}[/cyan]")

    try:
        if follow:
            # Use tail -f equivalent
            import subprocess

            subprocess.run(["tail", "-f", "-n", str(lines), str(log_file)])
        else:
            # Show last N lines
            with open(log_file) as f:
                all_lines = f.readlines()
                for line in all_lines[-lines:]:
                    if level.lower() in line.lower() or level == "DEBUG":
                        console.print(line.strip())

    except KeyboardInterrupt:
        console.print("\n[yellow]Log viewing cancelled[/yellow]")
    except Exception as e:
        console.print(f"[red]Error reading logs: {e}[/red]")


@cli.command()
@click.confirmation_option(prompt="This will stop all MCP processes. Continue?")
def shutdown() -> None:
    """Shutdown all MCP services gracefully."""

    async def shutdown_services() -> None:
        try:
            # Initialize services that might be running
            server = MCPServer({"plugin_dir": "plugins", "config_dir": "config"})
            task_queue = TaskQueue(enable_celery=False)

            # Stop services
            console.print("[yellow]Stopping MCP Server...[/yellow]")
            await server.stop()

            console.print("[yellow]Stopping Task Queue...[/yellow]")
            await task_queue.shutdown()

            console.print("[green]All services stopped successfully[/green]")

        except Exception as e:
            console.print(f"[red]Error during shutdown: {e}[/red]")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task("Shutting down services...", total=None)

        try:
            asyncio.run(shutdown_services())
        except KeyboardInterrupt:
            console.print("\n[yellow]Shutdown cancelled[/yellow]")
        except Exception as e:
            console.print(f"[red]Shutdown error: {e}[/red]")
            sys.exit(1)


@cli.command()
def version() -> None:
    """Show MCP version information."""
    version_info = {
        "mcp_version": "1.0.0",
        "python_version": sys.version,
        "config_dir": str(cli_context.config_dir),
    }

    panel = Panel.fit(
        f"[bold blue]MCP Version:[/bold blue] {version_info['mcp_version']}\n"
        f"[bold blue]Python Version:[/bold blue] {version_info['python_version']}\n"
        f"[bold blue]Config Directory:[/bold blue] {version_info['config_dir']}",
        title="📋 Version Information",
    )

    console.print(panel)


cli.add_command(server_commands, name="server")
cli.add_command(tool_commands, name="tools")
cli.add_command(plugin_commands, name="plugins")
cli.add_command(task_commands, name="tasks")
cli.add_command(auth_commands, name="auth")


def main() -> None:
    """Main entry point for the CLI."""
    cli(obj={})


if __name__ == "__main__":
    main()
