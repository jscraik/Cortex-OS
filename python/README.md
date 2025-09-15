# Cortex-OS Python Components

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains Python-specific components, utilities, and integrations for the Cortex-OS ecosystem.

## Python Environment

### Package Management

The project uses `uv` for Python package management:

- **pyproject.toml** - Project dependencies and configuration
- **uv.lock** - Locked dependency versions
- **uv.toml** - UV tool configuration

### Python Components

- **MLX Integration** - Apple Silicon ML acceleration
- **Model Processing** - Machine learning model utilities
- **Data Processing** - Data transformation and analysis
- **API Bindings** - Python API client libraries


## MCP Tools

Cortex-OS provides a reusable foundation for building Model Context Protocol (MCP) tools in Python.
The `cortex_mlx.mcp` package offers a `BaseMCPTool` with built-in Pydantic validation, structured
error handling, and a registry for discovery.

### Base tool overview

- `BaseMCPTool` enforces Pydantic-based input validation and normalized responses.
- `ToolRegistry` centralizes tool registration and execution for MCP servers.
- Standard exceptions (`MCPToolValidationError`, `MCPToolExecutionError`) provide actionable errors.

### Echo tool reference implementation

The repository now includes `EchoTool`, a minimal MCP tool that demonstrates how to build tools on top of the shared base class. It supports optional uppercasing and message repetition while exposing
rich metadata for discovery.

#### Usage example

```python
import asyncio
from cortex_mlx.mcp import EchoTool, ToolRegistry

async def main() -> None:
    registry = ToolRegistry()
    echo_tool = registry.register(EchoTool())
    result = await echo_tool.execute({"message": "Hello Cortex", "uppercase": True})
    print(result["content"][0]["text"])  # -> HELLO CORTEX

asyncio.run(main())
```

Validation errors raise `MCPToolValidationError`, making it easy to surface actionable feedback to
MCP clients. Execution issues are wrapped in `MCPToolExecutionError` with tool names for observability.

## Key Features

### MLX Integration

Apple Silicon optimized machine learning:

- **Model Loading** - Efficient model loading and initialization
- **Inference Engine** - Fast inference on Apple Silicon
- **Memory Management** - Optimized memory usage
- **Performance Monitoring** - Inference performance tracking

### Model Processing

Machine learning model utilities:

- **Model Conversion** - Format conversion and optimization
- **Model Validation** - Model integrity and compatibility checks
- **Benchmark Tools** - Model performance benchmarking
- **Analysis Tools** - Model capability analysis

### Data Processing

Python data processing capabilities:

- **ETL Pipelines** - Extract, transform, load operations
- **Analytics** - Statistical analysis and insights
- **Visualization** - Data visualization and reporting
- **Integration** - Third-party data source integration

## Development Setup

### Environment Setup

```bash
# Install UV package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Sync dependencies
uv sync

# Activate virtual environment
source .venv/bin/activate
```

### Development Workflow

```bash
# Run Python tests
uv run pytest

# Type checking
uv run mypy

# Code formatting
uv run black .
uv run isort .

# Linting
uv run ruff check .
```

## Testing

### Test Framework

Python testing uses:

- **pytest** - Primary testing framework
- **pytest-asyncio** - Async testing support
- **pytest-cov** - Code coverage reporting
- **pytest-mock** - Mocking utilities

### Test Organization

- **Unit Tests** - Component-level testing
- **Integration Tests** - Service integration testing
- **Performance Tests** - Performance and benchmarking
- **ML Model Tests** - Model accuracy and performance testing

## Code Quality

### Static Analysis

- **mypy** - Static type checking
- **ruff** - Fast Python linter
- **black** - Code formatting
- **isort** - Import sorting

### Quality Standards

- **Type Hints** - Comprehensive type annotations
- **Documentation** - Docstring documentation
- **Error Handling** - Comprehensive exception handling
- **Performance** - Optimized Python code

## Integration

### TypeScript Integration

Python components integrate with TypeScript via:

- **REST APIs** - HTTP-based integration
- **Message Queues** - Async communication
- **Shared Schemas** - Common data formats
- **Documentation** - API documentation

### External Services

- **Model Providers** - ML model service integration
- **Data Sources** - External data source connections
- **Analytics Services** - Analytics platform integration
- **Monitoring** - System monitoring and alerting

## Performance

### Optimization

- **Async Programming** - Asynchronous Python code
- **Memory Management** - Efficient memory usage
- **Caching** - Intelligent caching strategies
- **Profiling** - Performance profiling and optimization

### MLX Acceleration

- **Apple Silicon** - Native Apple Silicon optimization
- **GPU Acceleration** - GPU-accelerated computations
- **Memory Optimization** - Efficient GPU memory usage
- **Batch Processing** - Optimized batch inference

## Security

### Security Practices

- **Input Validation** - Secure input handling
- **Authentication** - Secure authentication mechanisms
- **Authorization** - Access control implementation
- **Encryption** - Data encryption and protection

### Dependency Security

- **Vulnerability Scanning** - Automated security scanning
- **Dependency Updates** - Regular security updates
- **Supply Chain Security** - Secure dependency management
- **Audit Trails** - Security event logging

## Deployment

### Production Deployment

- **Container Support** - Docker containerization
- **Environment Configuration** - Environment-specific settings
- **Health Checks** - Application health monitoring
- **Logging** - Comprehensive logging and monitoring

### Performance Monitoring

- **Metrics Collection** - Application performance metrics
- **Error Tracking** - Error monitoring and alerting
- **Resource Monitoring** - Resource usage tracking
- **Model Performance** - ML model performance monitoring

## Related Documentation

- [Configuration Management](/config/README.md)
- [MLX Integration Documentation](/docs/)
- [API Documentation](/docs/)
- [Testing Guidelines](/tests/README.md)
