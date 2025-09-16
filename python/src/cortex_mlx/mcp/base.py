"""Base classes and registry utilities for Python MCP tools."""

from __future__ import annotations

from typing import Any, ClassVar, Dict, Generic, Iterable, Mapping, TYPE_CHECKING, TypeVar

if TYPE_CHECKING:
    from typing import Type

from pydantic import BaseModel, Field, ValidationError

__all__ = [
    "MCPToolError",
    "MCPToolValidationError",
    "MCPToolExecutionError",
    "ToolResponse",
    "BaseMCPTool",
    "ToolRegistry",
]


class MCPToolError(Exception):
    """Base exception raised for MCP tool errors."""


class MCPToolValidationError(MCPToolError):
    """Exception raised when tool input validation fails."""

    def __init__(self, tool: str, error: ValidationError) -> None:
        self.tool = tool
        self.errors = error.errors()
        message = f"Validation failed for tool '{tool}': {error}"
        super().__init__(message)


class MCPToolExecutionError(MCPToolError):
    """Exception raised when a tool fails during execution."""

    def __init__(self, tool: str, message: str) -> None:
        self.tool = tool
        super().__init__(f"Execution failed for tool '{tool}': {message}")


InputModelT = TypeVar("InputModelT", bound=BaseModel)


class ToolResponse(BaseModel):
    """Standardized response returned from MCP tools."""

    content: list[dict[str, Any]] = Field(default_factory=list)
    is_error: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class BaseMCPTool(Generic[InputModelT]):
    """Base class that encapsulates validation and execution for MCP tools."""

    name: ClassVar[str]
    description: ClassVar[str] = ""
    InputModel: ClassVar[Any]  # Type[BaseModel] but avoiding type variable issues

    def __init__(self) -> None:
        if not getattr(self, "name", None):
            raise ValueError("Tool subclasses must define a non-empty 'name'.")
        if not hasattr(self, "InputModel"):
            raise TypeError(f"Tool '{self.name}' must declare an InputModel class.")
        if not issubclass(self.InputModel, BaseModel):  # type: ignore[arg-type]
            raise TypeError("InputModel must inherit from pydantic.BaseModel.")

    @classmethod
    def input_schema(cls) -> dict[str, Any]:
        """Return the JSON schema describing the expected input payload."""

        return cls.InputModel.model_json_schema()  # type: ignore[attr-defined]

    def metadata(self) -> Mapping[str, Any]:
        """Return optional metadata describing the tool."""

        return {}

    def definition(self) -> dict[str, Any]:
        """Return a definition payload compatible with MCP tool discovery."""

        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema(),
            "metadata": dict(self.metadata()),
        }

    def validate_input(self, raw: Mapping[str, Any]) -> InputModelT:
        """Validate raw arguments using the tool's :class:`InputModel`."""

        try:
            return self.InputModel.model_validate(raw)  # type: ignore[call-arg]
        except ValidationError as exc:  # pragma: no cover - exercised in tests
            raise MCPToolValidationError(self.name, exc) from exc

    async def run(self, data: InputModelT) -> ToolResponse:  # pragma: no cover - interface
        """Execute the tool's core logic and return a :class:`ToolResponse`."""

        raise NotImplementedError

    async def execute(self, raw: Mapping[str, Any]) -> dict[str, Any]:
        """Validate input arguments, execute the tool, and return a serialized response."""

        payload = self.validate_input(raw)

        try:
            result = await self.run(payload)
        except MCPToolExecutionError:
            raise
        except Exception as exc:  # pragma: no cover - exercised via tests
            raise MCPToolExecutionError(self.name, str(exc)) from exc

        if not isinstance(result, ToolResponse):
            message = "run() must return a ToolResponse instance"
            raise MCPToolExecutionError(self.name, message)

        return result.model_dump()


class ToolRegistry:
    """Registry that manages available MCP tools."""

    def __init__(self) -> None:
        self._tools: Dict[str, BaseMCPTool[Any]] = {}

    def register(self, tool: BaseMCPTool[Any]) -> BaseMCPTool[Any]:
        """Register a tool instance with the registry."""

        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' is already registered.")
        self._tools[tool.name] = tool
        return tool

    def register_type(self, tool_type: Type[BaseMCPTool[Any]]) -> BaseMCPTool[Any]:
        """Instantiate and register a tool class."""

        return self.register(tool_type())

    def get(self, name: str) -> BaseMCPTool[Any]:
        """Retrieve a registered tool by name."""

        try:
            return self._tools[name]
        except KeyError as exc:  # pragma: no cover - defensive branch
            raise KeyError(f"Tool '{name}' is not registered.") from exc

    def list_definitions(self) -> list[dict[str, Any]]:
        """Return tool definitions suitable for MCP discovery."""

        return [tool.definition() for tool in self._tools.values()]

    async def call_tool(self, name: str, arguments: Mapping[str, Any]) -> dict[str, Any]:
        """Execute a registered tool using the provided arguments."""

        tool = self.get(name)
        return await tool.execute(arguments)

    def __iter__(self) -> Iterable[BaseMCPTool[Any]]:  # pragma: no cover - convenience
        return iter(self._tools.values())

    def __contains__(self, name: object) -> bool:  # pragma: no cover - convenience
        return name in self._tools
