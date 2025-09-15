import os
import subprocess
from typing import Any

import httpx

from ..core.protocol import Tool
from .base import BasePlugin


class TDDCoachPlugin(BasePlugin):
    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self.name = "tdd_coach"
        self.tdd_coach_path = config.get(
            "tdd_coach_path", "/Users/jamiecraik/.Cortex-OS/packages/tdd-coach"
        )

    async def initialize(self) -> None:
        """Initialize the TDD Coach plugin."""
        try:
            # Test if the TDD Coach MCP server is running
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8007/health")
                if response.status_code == 200:
                    self.initialized = True
                    return
        except Exception:
            pass

        # If not running, try to start it
        try:
            # Start the TDD Coach MCP server as a subprocess
            env = os.environ.copy()
            env["TDD_COACH_MCP_PORT"] = "8007"
            self.process = subprocess.Popen(
                ["npm", "run", "start:mcp"],
                cwd=self.tdd_coach_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            self.initialized = True
        except Exception as e:
            print(f"Failed to initialize TDD Coach plugin: {e}")
            self.initialized = False

    async def cleanup(self) -> None:
        """Clean up the TDD Coach plugin resources."""
        if hasattr(self, "process") and self.process:
            self.process.terminate()
            self.process.wait()
        self.initialized = False

    def get_tools(self) -> list[Tool]:
        """Return the list of tools provided by this plugin."""
        return [
            Tool(
                name="tdd_coach.analyze_test_coverage",
                description="Analyze test coverage and provide insights",
                parameters={
                    "type": "object",
                    "properties": {
                        "targetPath": {"type": "string"},
                        "includeThreshold": {"type": "boolean", "default": True},
                        "format": {
                            "type": "string",
                            "enum": ["summary", "detailed", "json"],
                            "default": "summary",
                        },
                    },
                    "required": ["targetPath"],
                },
            ),
            Tool(
                name="tdd_coach.generate_test",
                description="Generate test cases for source code",
                parameters={
                    "type": "object",
                    "properties": {
                        "sourceFile": {"type": "string"},
                        "testType": {
                            "type": "string",
                            "enum": ["unit", "integration", "e2e"],
                            "default": "unit",
                        },
                        "framework": {
                            "type": "string",
                            "enum": ["vitest", "jest", "mocha", "cypress"],
                        },
                        "includeEdgeCases": {"type": "boolean", "default": True},
                    },
                    "required": ["sourceFile"],
                },
            ),
            Tool(
                name="tdd_coach.refactor_test",
                description="Refactor existing tests for better quality",
                parameters={
                    "type": "object",
                    "properties": {
                        "testFile": {"type": "string"},
                        "improvements": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": [
                                    "readability",
                                    "performance",
                                    "maintainability",
                                    "coverage",
                                ],
                            },
                        },
                        "preserveExisting": {"type": "boolean", "default": True},
                    },
                    "required": ["testFile", "improvements"],
                },
            ),
            Tool(
                name="tdd_coach.validate_tdd_flow",
                description="Validate TDD red-green-refactor cycle",
                parameters={
                    "type": "object",
                    "properties": {
                        "sessionId": {"type": "string"},
                        "currentPhase": {
                            "type": "string",
                            "enum": ["red", "green", "refactor"],
                        },
                        "files": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["sessionId", "currentPhase", "files"],
                },
            ),
            Tool(
                name="tdd_coach.coach_recommendation",
                description="Get TDD coaching recommendations",
                parameters={
                    "type": "object",
                    "properties": {
                        "codebase": {"type": "string"},
                        "testStrategy": {
                            "type": "string",
                            "enum": ["tdd", "bdd", "mixed"],
                        },
                        "experience": {
                            "type": "string",
                            "enum": ["beginner", "intermediate", "advanced"],
                            "default": "intermediate",
                        },
                    },
                    "required": ["codebase"],
                },
            ),
        ]

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Call a tool by name with the given arguments."""
        # Make HTTP request to TDD Coach MCP server

        tool_mapping = {
            "analyze_test_coverage": "analyze_test_coverage",
            "generate_test": "generate_test",
            "refactor_test": "refactor_test",
            "validate_tdd_flow": "validate_tdd_flow",
            "coach_recommendation": "coach_recommendation",
        }

        if tool_name not in tool_mapping:
            raise ValueError(f"Unknown TDD Coach tool: {tool_name}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8007/tools/call",
                    json={"name": tool_mapping[tool_name], "arguments": arguments},
                    timeout=30.0,
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(
                        f"TDD Coach tool call failed with status {response.status_code}: {response.text}"
                    )

        except httpx.RequestError as e:
            raise Exception(f"Failed to connect to TDD Coach server: {str(e)}")
