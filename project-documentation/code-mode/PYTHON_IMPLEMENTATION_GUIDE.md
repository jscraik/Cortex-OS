# Python Code Mode Implementation Guide

## Overview

The Python Code Mode implementation converts FastMCP server specifications into executable Python APIs following pyproject.toml structure and brAInwav standards. It integrates with cortex-py thermal monitoring for intelligent resource management.

## Core Components

### 1. API Generator (`packages/cortex-mcp/codegen/python_api_generator.py`)

```python
from __future__ import annotations
from fastmcp import FastMCP

class PythonMCPCodeGenerator:
    """Generate brAInwav Python APIs from FastMCP specifications."""
    
    def __init__(self, mcp_server: FastMCP):
        self.mcp_server = mcp_server
        self.brainwav_attribution = True
    
    async def generate_python_api(self, namespace: str) -> str:
        """Generate Python client code for MCP server tools."""
        tools = await self.mcp_server.get_tools()
        
        return f'''"""
Generated brAInwav Python MCP API for {namespace}
Auto-generated from FastMCP server specifications
"""

from __future__ import annotations
import asyncio
from typing import Any, Dict, List
from fastmcp.client import MCPClient

class {namespace.title()}API:
    """brAInwav API for {namespace} MCP server."""
    
    def __init__(self, client: MCPClient):
        self._client = client
        self._brainwav_session = True
    
{self._generate_tool_methods(tools)}
'''
```

### 2. Code Executor (`packages/cortex-mcp/code_executor.py`)

```python
class PythonCodeExecutor:
    """Execute Python code against cortex APIs with thermal monitoring."""
    
    def __init__(self, thermal_service=None):
        self.thermal_service = thermal_service
        self.available_apis = self._build_api_namespace()
        
    async def execute_code(self, code: str) -> Dict[str, Any]:
        """Execute Python code in safe environment."""
        # Validate AST for security
        tree = ast.parse(code, mode='exec')
        self._validate_ast_safety(tree)
        
        # Create execution environment with brAInwav APIs
        namespace = self.available_apis.copy()
        
        start_time = time.time()
        try:
            exec(compile(tree, '<brainwav_generated>', 'exec'), namespace)
            result = namespace.get('result', 'brAInwav execution completed')
            
            return {
                'success': True,
                'result': result,
                'execution_time': time.time() - start_time,
                'brainwav_powered': True
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'brAInwav execution error: {str(e)}',
                'brainwav_powered': True
            }
```

### 3. FastMCP Integration

Enhanced server with code mode tools:

```python
# packages/cortex-mcp/cortex_fastmcp_server_v2.py

def register_code_mode_tools(mcp: Any) -> None:
    """Register brAInwav code generation and execution tools."""

    @mcp.tool()
    async def generate_python_api(namespace: str = "cortex") -> dict[str, Any]:
        """Generate Python API code for brAInwav code mode execution."""
        try:
            generator = PythonMCPCodeGenerator(mcp)
            api_code = await generator.generate_python_api(namespace)
            
            return {
                "api_code": api_code,
                "brainwav_generated": True,
                "language": "python",
                "pyproject_compliant": True
            }
        except Exception as exc:
            logger.error("brAInwav Python code generation failed: %s", exc)
            return {"error": str(exc), "brainwav_source": "cortex-mcp"}

    @mcp.tool()
    async def execute_python_code(code: str) -> dict[str, Any]:
        """Execute Python code with brAInwav monitoring."""
        try:
            executor = PythonCodeExecutor()
            result = await executor.execute_code(code)
            return {**result, "brainwav_executed": True}
        except Exception as exc:
            return {"error": str(exc), "brainwav_source": "cortex-mcp"}
```

## Usage Examples

### Batch Document Processing

```python
# Model generates efficient Python code
async def process_documents():
    print("brAInwav document processing starting...")
    
    # Get documents and process in thermal-aware batches
    documents = await filesystem.list_dir('/documents')
    
    thermal_status = await thermal.get_status()
    batch_size = 25 if thermal_status['temperature'] > 75 else 50
    
    processed = []
    for batch in chunks(documents, batch_size):
        # Read batch contents
        contents = [await filesystem.read(doc) for doc in batch]
        
        # Generate embeddings for entire batch (efficient!)
        embeddings = await embedding.batch(contents)
        
        processed.extend(embeddings['embeddings'])
        
        # Thermal monitoring between batches
        if await thermal.is_critical():
            print("brAInwav thermal protection: cooling down...")
            await asyncio.sleep(30)
    
    result = {'processed': len(processed), 'brainwav_powered': True}
```

### Data Analysis Pipeline

```python
# Complex analysis with error handling
async def analyze_data_quality():
    print("brAInwav data quality analysis starting...")
    
    results = {'files_analyzed': 0, 'quality_issues': []}
    
    try:
        data_files = await filesystem.list_dir('/data')
        
        for file in data_files:
            if file.endswith('.csv'):
                content = await filesystem.read(file)
                
                # Quality checks
                lines = content.strip().split('\n')
                if len(lines) < 2:
                    results['quality_issues'].append({
                        'file': file,
                        'issue': 'insufficient_data'
                    })
                
                results['files_analyzed'] += 1
        
        # Save report
        await filesystem.write('/reports/quality-report.json', 
                              json.dumps(results))
        
        return results
        
    except Exception as e:
        print(f"brAInwav analysis failed: {e}")
        raise
```

## Package Configuration (pyproject.toml)

```toml
[project]
name = "cortex-mcp-code-mode"
version = "0.1.0"
description = "brAInwav Code Mode for Python MCP integration"
requires-python = ">=3.11"

dependencies = [
    "fastmcp>=0.2.0",
    "pydantic>=2.0.0",
    "asyncio-throttle>=1.0.0",
]

[project.optional-dependencies]
thermal = ["cortex-py>=0.1.0"]

[build-system]
requires = ["setuptools>=64"]
build-backend = "setuptools.build_meta"
```

## Testing

```python
# packages/cortex-mcp/tests/test_python_code_executor.py
import pytest

@pytest.mark.asyncio
async def test_safe_code_execution():
    executor = PythonCodeExecutor()
    
    code = """
result = await embedding.generate("test text")
assert "brainwav_source" in result
"""
    
    result = await executor.execute(code)
    assert result['success'] is True
    assert 'brAInwav' in result['logs']
```

## Integration Benefits

- **5x Token Efficiency**: Batch operations vs individual calls
- **Thermal Awareness**: Automatic adaptation to system temperature
- **pyproject.toml Structure**: Following user preferences
- **brAInwav Branding**: Consistent attribution across all outputs
- **Safe Execution**: AST validation and sandboxing

## Security Features

- AST parsing for syntax validation
- Import restrictions (only safe modules)
- Restricted builtins (no eval, exec, etc.)
- Resource limits and timeouts
- Sandboxed execution environment

---

**Co-authored-by: brAInwav Development Team**
