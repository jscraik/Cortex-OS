"""Tool management CLI commands."""

import asyncio
import json
import sys

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ..core.protocol import MCPMessage, MessageType
from ..core.server import MCPServer

console = Console()


@click.group()
def tool_commands():
    """Tool management commands."""
    pass


@tool_commands.command("list")
@click.option(
    "--format", "output_format", default="table", type=click.Choice(["table", "json"])
)
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def list_tools(output_format: str, config_file: str) -> None:  # noqa: ARG001 - config_file accepted for parity
    """List all available tools."""

    async def get_tools():
        try:
            server_config = {
                "plugin_dir": "plugins",
                "config_dir": "config",
                "auto_reload": False,
            }

            server = MCPServer(server_config)
            await server.initialize()

            # Get tools using protocol
            request = MCPMessage(
                type=MessageType.REQUEST,
                id="list-tools",
                method="tools/list",
                params={},
            )

            response = await server.handle_message(request)
            await server.stop()

            if response.error:
                return {"error": response.error.get("message", "Unknown error")}

            return response.result

        except Exception as e:
            return {"error": str(e)}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task("Loading tools...", total=None)

        try:
            result = asyncio.run(get_tools())
            progress.stop()

            if "error" in result:
                console.print(f"[red]Error loading tools: {result['error']}[/red]")
                sys.exit(1)

            tools = result.get("tools", [])

            if output_format == "json":
                console.print(json.dumps(tools, indent=2))
            else:
                if not tools:
                    console.print("[yellow]No tools found[/yellow]")
                    return

                table = Table(title=f"Available Tools ({len(tools)})")
                table.add_column("Name", style="cyan")
                table.add_column("Description")
                table.add_column("Parameters")

                for tool in tools:
                    name = tool.get("name", "Unknown")
                    description = tool.get("description", "No description")
                    parameters = tool.get("parameters", {})

                    # Format parameters
                    param_text = []
                    for param_name, param_info in parameters.items():
                        if isinstance(param_info, dict):
                            param_type = param_info.get("type", "unknown")
                            required = (
                                "required"
                                if param_info.get("required", False)
                                else "optional"
                            )
                            param_text.append(
                                f"{param_name} ({param_type}, {required})"
                            )
                        else:
                            param_text.append(param_name)

                    table.add_row(
                        name,
                        description[:50] + "..."
                        if len(description) > 50
                        else description,
                        "\n".join(param_text) if param_text else "None",
                    )

                console.print(table)

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Tool listing cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Error: {e}[/red]")
            sys.exit(1)


@tool_commands.command("info")
@click.argument("tool_name")
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def tool_info(tool_name: str, config_file: str) -> None:  # noqa: ARG001 - config_file accepted for parity
    """Get detailed information about a specific tool."""

    async def get_tool_info():
        try:
            server_config = {
                "plugin_dir": "plugins",
                "config_dir": "config",
                "auto_reload": False,
            }

            server = MCPServer(server_config)
            await server.initialize()

            # Get all tools
            request = MCPMessage(
                type=MessageType.REQUEST,
                id="list-tools",
                method="tools/list",
                params={},
            )

            response = await server.handle_message(request)
            await server.stop()

            if response.error:
                return {"error": response.error.get("message", "Unknown error")}

            tools = response.result.get("tools", [])
            tool = None

            for t in tools:
                if t.get("name") == tool_name:
                    tool = t
                    break

            if not tool:
                return {"error": f"Tool '{tool_name}' not found"}

            return tool

        except Exception as e:
            return {"error": str(e)}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task(f"Getting info for {tool_name}...", total=None)

        try:
            result = asyncio.run(get_tool_info())
            progress.stop()

            if "error" in result:
                console.print(f"[red]Error: {result['error']}[/red]")
                sys.exit(1)

            # Display detailed tool information
            panel_content = f"[bold]Name:[/bold] {result.get('name', 'Unknown')}\n"
            panel_content += f"[bold]Description:[/bold] {result.get('description', 'No description')}\n\n"

            parameters = result.get("parameters", {})
            if parameters:
                panel_content += "[bold]Parameters:[/bold]\n"
                for param_name, param_info in parameters.items():
                    if isinstance(param_info, dict):
                        param_type = param_info.get("type", "unknown")
                        required = "✓" if param_info.get("required", False) else "✗"
                        param_desc = param_info.get("description", "No description")
                        panel_content += (
                            f"  • {param_name} ({param_type}) [Required: {required}]\n"
                        )
                        panel_content += f"    {param_desc}\n"
                    else:
                        panel_content += f"  • {param_name}\n"
            else:
                panel_content += "[bold]Parameters:[/bold] None\n"

            console.print(Panel(panel_content, title=f"🔧 Tool: {tool_name}"))

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Tool info cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Error: {e}[/red]")
            sys.exit(1)


@tool_commands.command("call")
@click.argument("tool_name")
@click.option("--params", help="Tool parameters as JSON string")
@click.option(
    "--param", "param_list", multiple=True, help="Individual parameter (key=value)"
)
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def call_tool(tool_name: str, params: str, param_list: tuple, config_file: str) -> None:  # noqa: ARG001 - config_file accepted for parity
    """Execute a tool with given parameters."""
    # Parse parameters
    parameters = {}

    if params:
        try:
            parameters = json.loads(params)
        except json.JSONDecodeError as e:
            console.print(f"[red]Invalid JSON in params: {e}[/red]")
            sys.exit(1)

    # Add individual parameters
    for param in param_list:
        if "=" not in param:
            console.print(
                f"[red]Invalid parameter format: {param}. Use key=value[/red]"
            )
            sys.exit(1)

        key, value = param.split("=", 1)

        # Try to parse as JSON, fall back to string
        try:
            parameters[key] = json.loads(value)
        except json.JSONDecodeError:
            parameters[key] = value

    async def execute_tool():
        try:
            server_config = {
                "plugin_dir": "plugins",
                "config_dir": "config",
                "auto_reload": False,
            }

            server = MCPServer(server_config)
            await server.initialize()

            # Execute tool
            request = MCPMessage(
                type=MessageType.REQUEST,
                id="call-tool",
                method="tools/call",
                params={
                    "name": tool_name,
                    "parameters": parameters,
                },
            )

            response = await server.handle_message(request)
            await server.stop()

            return response

        except Exception as e:
            return {"error": str(e)}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task(f"Executing {tool_name}...", total=None)

        try:
            response = asyncio.run(execute_tool())
            progress.stop()

            if isinstance(response, dict) and "error" in response:
                console.print(f"[red]Execution error: {response['error']}[/red]")
                sys.exit(1)

            if response.error:
                console.print(
                    f"[red]Tool error: {response.error.get('message', 'Unknown error')}[/red]"
                )
                sys.exit(1)

            # Display result
            result = response.result

            console.print(
                Panel(
                    f"[bold green]✅ Tool executed successfully[/bold green]\n\n"
                    f"[bold]Tool:[/bold] {tool_name}\n"
                    f"[bold]Parameters:[/bold] {json.dumps(parameters, indent=2) if parameters else 'None'}\n\n"
                    f"[bold]Result:[/bold]\n{json.dumps(result, indent=2)}",
                    title="🚀 Tool Execution Result",
                )
            )

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Tool execution cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Execution error: {e}[/red]")
            sys.exit(1)


@tool_commands.command("test")
@click.option("--tool", help="Test specific tool (otherwise tests all)")
@click.option(
    "--config-file", default="config/server.json", help="Server configuration file"
)
def test_tools(tool: str, config_file: str) -> None:  # noqa: ARG001 - config_file accepted for parity
    """Test tools with sample data to verify they work correctly."""

    async def run_tests():
        try:
            server_config = {
                "plugin_dir": "plugins",
                "config_dir": "config",
                "auto_reload": False,
            }

            server = MCPServer(server_config)
            await server.initialize()

            # Get available tools
            list_request = MCPMessage(
                type=MessageType.REQUEST,
                id="list-tools",
                method="tools/list",
                params={},
            )

            list_response = await server.handle_message(list_request)

            if list_response.error:
                await server.stop()
                return {
                    "error": list_response.error.get("message", "Failed to list tools")
                }

            tools = list_response.result.get("tools", [])

            if tool:
                # Filter to specific tool
                tools = [t for t in tools if t.get("name") == tool]
                if not tools:
                    await server.stop()
                    return {"error": f"Tool '{tool}' not found"}

            test_results = []

            for tool_info in tools:
                tool_name = tool_info.get("name")

                # Generate test parameters based on tool definition
                test_params = {}
                parameters = tool_info.get("parameters", {})

                for param_name, param_info in parameters.items():
                    if isinstance(param_info, dict):
                        param_type = param_info.get("type", "string")

                        if param_type == "string":
                            test_params[param_name] = f"test_{param_name}"
                        elif param_type == "number":
                            test_params[param_name] = 42
                        elif param_type == "boolean":
                            test_params[param_name] = True
                        elif param_type == "array":
                            test_params[param_name] = ["test", "array"]
                        elif param_type == "object":
                            test_params[param_name] = {"test": "object"}
                        else:
                            test_params[param_name] = "test_value"

                # Execute tool
                call_request = MCPMessage(
                    type=MessageType.REQUEST,
                    id=f"test-{tool_name}",
                    method="tools/call",
                    params={
                        "name": tool_name,
                        "parameters": test_params,
                    },
                )

                call_response = await server.handle_message(call_request)

                test_results.append(
                    {
                        "tool": tool_name,
                        "parameters": test_params,
                        "success": not bool(call_response.error),
                        "result": call_response.result
                        if not call_response.error
                        else None,
                        "error": call_response.error.get("message")
                        if call_response.error
                        else None,
                    }
                )

            await server.stop()
            return {"tests": test_results}

        except Exception as e:
            return {"error": str(e)}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        _task = progress.add_task("Running tool tests...", total=None)

        try:
            result = asyncio.run(run_tests())
            progress.stop()

            if "error" in result:
                console.print(f"[red]Test error: {result['error']}[/red]")
                sys.exit(1)

            tests = result.get("tests", [])

            if not tests:
                console.print("[yellow]No tools to test[/yellow]")
                return

            # Display results
            table = Table(title="Tool Test Results")
            table.add_column("Tool", style="cyan")
            table.add_column("Status")
            table.add_column("Parameters")
            table.add_column("Result/Error")

            success_count = 0

            for test in tests:
                tool_name = test["tool"]
                success = test["success"]
                parameters = json.dumps(test["parameters"], indent=None)

                if success:
                    status = "[green]✅ Pass[/green]"
                    result_text = json.dumps(test["result"], indent=None)[:100] + "..."
                    success_count += 1
                else:
                    status = "[red]❌ Fail[/red]"
                    result_text = test.get("error", "Unknown error")

                table.add_row(
                    tool_name,
                    status,
                    parameters[:50] + "..." if len(parameters) > 50 else parameters,
                    result_text[:50] + "..." if len(result_text) > 50 else result_text,
                )

            console.print(table)
            console.print(
                f"\n[cyan]Test Summary:[/cyan] {success_count}/{len(tests)} tools passed"
            )

            if success_count < len(tests):
                sys.exit(1)

        except KeyboardInterrupt:
            progress.stop()
            console.print("\n[yellow]Tool testing cancelled[/yellow]")
        except Exception as e:
            progress.stop()
            console.print(f"[red]Test error: {e}[/red]")
            sys.exit(1)
