# brAInwav Code Mode Documentation Index

## Overview

This directory contains comprehensive documentation for the brAInwav Code Mode implementation across TypeScript, Python, and Rust environments. Code Mode represents a revolutionary approach to AI-tool interaction, converting traditional MCP tool calls into executable code for 3-5x efficiency improvements.

## Documentation Structure

### 1. Implementation Summary

- **[CODE_MODE_IMPLEMENTATION_SUMMARY.md](../CODE_MODE_IMPLEMENTATION_SUMMARY.md)**
  - Complete overview of the multi-language Code Mode implementation
  - Architecture details and integration points
  - Performance benefits and security considerations
  - Testing strategies and deployment guidelines

### 2. Language-Specific Guides

#### TypeScript Implementation

- **[TYPESCRIPT_IMPLEMENTATION_GUIDE.md](./TYPESCRIPT_IMPLEMENTATION_GUIDE.md)**
  - Type-safe API generation from MCP specifications
  - Integration with existing orchestration package
  - LangGraph workflow nodes for code execution
  - V8 isolation and security features

#### Python Implementation  

- **[PYTHON_IMPLEMENTATION_GUIDE.md](./PYTHON_IMPLEMENTATION_GUIDE.md)**
  - FastMCP server integration with pyproject.toml structure
  - Thermal monitoring and adaptive execution
  - Safe code execution with AST validation
  - cortex-py service integration

#### Rust Implementation

- **[RUST_IMPLEMENTATION_GUIDE.md](./RUST_IMPLEMENTATION_GUIDE.md)**
  - Edition 2024 code generation and execution
  - Temporary Cargo project creation
  - A2A stdio bridge integration
  - Performance optimization with rayon

## Key Concepts

### Traditional Tool Calling vs Code Mode

**Traditional Approach:**

```json
[
  {"tool": "filesystem_read", "args": {"path": "file1.ts"}},
  {"tool": "filesystem_read", "args": {"path": "file2.ts"}},
  {"tool": "filesystem_read", "args": {"path": "file3.ts"}}
]
```

**brAInwav Code Mode:**

```typescript
// Model generates efficient code instead
const files = await filesystem.listDir('/src');
for (const file of files.filter(f => f.endsWith('.ts'))) {
  const content = await filesystem.read(file);
  // Process multiple files in a loop
}
```

### Benefits

1. **Token Efficiency**: 3-5x reduction in token usage
2. **Performance**: Batch operations instead of sequential calls
3. **Complex Logic**: Loops, conditionals, error handling
4. **Natural for Models**: Code patterns vs tool schemas
5. **Cross-Language**: TypeScript, Python, Rust support

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| TypeScript API Generator | Planned | `packages/mcp-core/src/codegen/` |
| Python Code Executor | Planned | `packages/cortex-mcp/code_executor.py` |
| Rust Code Mode Tool | Planned | `apps/cortex-code/codex-rs/mcp-server/src/` |
| LangGraph Integration | Planned | `packages/orchestration/src/langgraph/` |
| Multi-Language Testing | Planned | `tests/integration/` |

## Integration Points

### Existing Cortex-OS Systems

1. **Orchestration Package**: `dispatchTools` integration
2. **MCP Infrastructure**: Server specifications and tool registry
3. **A2A Events**: Cross-language coordination
4. **Thermal Monitoring**: Adaptive execution strategies
5. **LangGraph Workflows**: Code mode execution nodes

### Security Features

- **TypeScript**: V8 isolates with restricted globals
- **Python**: AST validation and import restrictions  
- **Rust**: Temporary project sandboxing
- **All Languages**: Resource limits and timeout enforcement

## Usage Examples

### Batch Processing Pattern

All three languages support efficient batch processing:

```typescript
// TypeScript
const results = await Promise.all(
  batches.map(batch => processAPI.batch(batch))
);
```

```python
# Python with thermal awareness
for batch in chunks(items, adaptive_batch_size):
    results = await process_api.batch(batch)
    if await thermal.is_critical():
        await asyncio.sleep(30)
```

```rust
// Rust with parallel processing
let results: Vec<_> = batches
    .par_iter()
    .map(|batch| process_batch(batch))
    .collect::<Result<Vec<_>>>()?;
```

### Error Handling and Recovery

Each implementation provides robust error handling:

```typescript
try {
  const result = await complexOperation();
  await logSuccess(result);
} catch (error) {
  await notificationAPI.alert({
    title: 'brAInwav Operation Failed',
    message: error.message
  });
}
```

## Testing Strategy

### Unit Tests

- API generation correctness
- Code execution safety
- brAInwav branding validation

### Integration Tests  

- Cross-language coordination
- A2A event propagation
- Thermal monitoring integration

### Performance Tests

- Token efficiency measurements
- Execution speed comparisons
- Resource usage monitoring

### Quality Gate Expectations

- **Coverage**: Maintain at least 65% branch coverage on every merge candidate, with teams targeting 90%+ statements/branches/functions and 95% lines for release readiness, as mandated in CODESTYLE §10.
- **Mutation testing**: Keep Stryker mutation scores above the 75% threshold defined in CODESTYLE §10 and refresh the metrics whenever code paths change.
- **Performance budgets**: Define and monitor bundle, latency, and memory budgets for Code Mode services; budgets must fail fast in CI when exceeded to satisfy the observability requirements in CODESTYLE §15.

## Development Workflow

1. **Phase 19 Planning**: Complete architectural design
2. **TDD Implementation**: Red-green-refactor for each component
3. **Security Validation**: Comprehensive safety testing
4. **Performance Benchmarking**: Efficiency measurements
5. **Integration Testing**: Multi-language coordination
6. **Production Deployment**: Gradual rollout with monitoring

## Future Enhancements

1. **WebAssembly Support**: Additional execution target
2. **GPU Code Generation**: CUDA/Metal for compute tasks
3. **Distributed Execution**: Code spanning multiple nodes
4. **Visual Code Building**: Drag-and-drop interfaces
5. **AI Code Optimization**: Automatic performance tuning

## Deployment Considerations

### Environment Variables

```bash
# Enable code mode across languages
CORTEX_CODE_MODE_ENABLED=true
CORTEX_CODE_MODE_LANGUAGES=typescript,python,rust

# Security settings
CORTEX_CODE_EXECUTION_TIMEOUT=30000
CORTEX_CODE_MEMORY_LIMIT=512MB
CORTEX_CODE_SANDBOX_ENABLED=true

# brAInwav branding
CORTEX_BRAINWAV_ATTRIBUTION=true
```

### Dependencies

**TypeScript:**

- Existing orchestration package
- V8 isolate libraries
- MCP core and registry

**Python (pyproject.toml):**

- FastMCP 2.0+
- Restricted execution libraries
- cortex-py integration

**Rust (edition 2024):**

- Temporary file management
- Cargo project templates
- A2A stdio bridge

## Contributing

All code mode implementations follow brAInwav development standards:

1. **TDD Approach**: Tests before implementation
2. **Security First**: Validation and sandboxing
3. **Performance Focus**: Efficiency measurements
4. **brAInwav Branding**: Consistent attribution
5. **Cross-Language**: Coordinated development

## Related Documentation

- [LANGGRAPH_INTEGRATION_PLAN.md](../../LANGGRAPH_INTEGRATION_PLAN.md) - Phase 19 details
- [packages/orchestration/README.md](../../packages/orchestration/README.md) - Tool dispatch
- [packages/cortex-mcp/README.md](../../packages/cortex-mcp/README.md) - Python MCP
- [apps/cortex-code/README.md](../../apps/cortex-code/README.md) - Rust tools

---

**Co-authored-by: brAInwav Development Team**
