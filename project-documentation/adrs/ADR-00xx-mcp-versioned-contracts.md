# ADR-00xx: MCP Versioned Contracts Implementation

## Status
**Accepted** - 2025-01-15

## Context
The Model Context Protocol (MCP) provides a standardized way for AI assistants to interact with external tools and resources. However, the base MCP specification lacks:

1. **Real-time change notifications** for prompts, resources, and tools
2. **Versioning support** for tool contracts (SEP-1575 proposal)
3. **Resource subscription capabilities** with change notifications
4. **Client compatibility** for clients that don't support notifications

Cortex-OS needs these capabilities to provide a robust, production-ready MCP implementation that can handle dynamic content updates and maintain backward compatibility.

## Decision
We will implement a comprehensive MCP versioned contracts system with the following components:

### 1. MCP Protocol Extensions
- **Capabilities**: Advertise `listChanged` for prompts/resources/tools and `subscribe` for resources
- **Notifications**: Emit standard MCP notifications for real-time updates
- **Versioning**: Implement SEP-1575 semantic versioning for tools
- **Compatibility**: Provide manual refresh tool for notification-incompatible clients

### 2. File System Integration
- **Watcher**: Debounced file system monitoring for prompt/resource/tool changes
- **Auto-loading**: Dynamic loading of tool contracts and resource definitions
- **Change detection**: Coalesced change detection with configurable debouncing

### 3. Version Management
- **SemVer constraints**: Full semantic version constraint resolution
- **Tool registry**: Versioned tool registry with constraint satisfaction
- **Backward compatibility**: Graceful fallback for version mismatches

### 4. Security & Performance
- **Validation**: Schema validation for all contracts and metadata
- **Rate limiting**: Configurable notification rate limits
- **Access controls**: Security metadata enforcement

## Detailed Design

### MCP Capabilities
```typescript
interface MCPServerCapabilities {
  prompts: {
    listChanged: boolean;
  };
  resources: {
    subscribe: boolean;
    listChanged: boolean;
  };
  tools: {
    listChanged: boolean;
  };
}
```

### Notification Types
- `notifications/prompts/list_changed`
- `notifications/resources/list_changed`
- `notifications/resources/updated`
- `notifications/tools/list_changed`

### Version Constraints (SEP-1575)
```typescript
interface ToolCallParams {
  name: string;
  arguments?: any;
  tool_requirements?: Record<string, string>; // SemVer constraints
}
```

### File System Watcher
```typescript
interface FSWatcherConfig {
  promptsPath?: string;
  resourcesPath?: string;
  toolsPath?: string;
  debounceMs?: number;
  ignored?: string[];
}
```

## Implementation Components

### 1. Core MCP Server Extensions
- **Location**: `packages/mcp/src/server.ts`
- **Features**: Extended capability advertisement, notification emission
- **Branding**: brAInwav structured logging throughout

### 2. Capability Modules
- **Location**: `packages/mcp/src/capabilities/`
- **Modules**: `prompts.ts`, `resources.ts`, `tools.ts`
- **Features**: Capability registration, notification emission

### 3. File System Watcher
- **Location**: `packages/mcp/src/notifications/fsWatcher.ts`
- **Features**: Debounced watching, change coalescing, event emission
- **Dependencies**: `chokidar`, `lodash-es`

### 4. Versioned Tool Registry
- **Location**: `packages/mcp/src/registry/toolRegistry.ts`
- **Features**: SemVer constraint resolution, tool loading, version management
- **Dependencies**: `semver`

### 5. Tool Call Handler
- **Location**: `packages/mcp/src/handlers/toolsCall.ts`
- **Features**: SEP-1575 constraint validation, version-aware execution
- **Security**: Constraint validation, error handling

### 6. Manual Refresh Tool
- **Location**: `packages/mcp/src/tools/refresh.ts`
- **Features**: Client compatibility, manual refresh capabilities
- **Compatibility**: Works with notification-incompatible clients

### 7. Configuration Management
- **Location**: `apps/cortex-os/src/config/mcp.ts`
- **Features**: Environment-based configuration, validation, profiles
- **Standards**: brAInwav configuration patterns

### 8. Schema Definitions
- **Location**: `schemas/`
- **Files**: `mcp.tool.contract.schema.json`, `prompt.schema.json`, `resource.meta.schema.json`
- **Validation**: JSON Schema validation for all contracts

## Configuration

### Environment Variables
```bash
# MCP Capabilities
CORTEX_MCP_PROMPTS_LIST_CHANGED=true
CORTEX_MCP_RESOURCES_LIST_CHANGED=true
CORTEX_MCP_RESOURCES_SUBSCRIBE=true
CORTEX_MCP_TOOLS_LIST_CHANGED=true

# Versioning Features
CORTEX_MCP_TOOLS_VERSIONING=false  # Experimental
CORTEX_MCP_PROMPTS_VERSIONING=true
CORTEX_MCP_RESOURCES_VERSIONING=true

# File System Watching
CORTEX_MCP_FS_WATCHER_ENABLED=true
CORTEX_MCP_FS_WATCHER_DEBOUNCE_MS=250

# Security & Performance
CORTEX_MCP_ENABLE_SECURITY_VALIDATION=true
CORTEX_MCP_MAX_CONCURRENT_NOTIFICATIONS=10
CORTEX_MCP_NOTIFICATION_TIMEOUT_MS=5000
```

### Configuration Profiles
- **Development**: Fast debouncing, debug logging, experimental features enabled
- **Test**: File watching disabled, relaxed security
- **Production**: Conservative settings, full security validation

## Security Considerations

### 1. Input Validation
- All tool contracts validated against JSON schemas
- SemVer constraints validated before resolution
- File system access restricted to configured paths

### 2. Access Control
- Security metadata enforced for tool execution
- Resource subscription validation
- Rate limiting for notification emissions

### 3. Audit Trail
- Structured logging with correlation IDs
- Tool version resolution tracking
- Notification emission auditing

## Migration Strategy

### Phase 1: Core Infrastructure
1. Implement base MCP server extensions
2. Add capability modules
3. Create file system watcher
4. Basic notification emission

### Phase 2: Versioning Support
1. Implement tool registry
2. Add SemVer constraint resolution
3. Create enhanced tool call handler
4. Manual refresh tool

### Phase 3: Integration & Testing
1. Cortex-OS integration
2. Configuration management
3. Comprehensive test suite
4. Documentation completion

### Phase 4: Production Rollout
1. Feature flag controlled rollout
2. Client compatibility validation
3. Performance monitoring
4. Security validation

## Testing Strategy

### 1. Unit Tests
- Schema validation
- SemVer constraint resolution
- File system watcher debouncing
- Notification emission logic

### 2. Integration Tests
- End-to-end notification flows
- Tool version constraint satisfaction
- File system change propagation
- Client compatibility scenarios

### 3. Contract Tests
- MCP protocol compliance
- SEP-1575 specification adherence
- Notification format validation
- Error response standardization

### 4. Performance Tests
- Notification throughput
- File system change detection latency
- Tool version resolution performance
- Memory usage under load

## Monitoring & Observability

### 1. Metrics
- Tool registration and resolution counts
- Notification emission rates and latency
- File system change detection performance
- Version constraint satisfaction rates

### 2. Logging
- Structured logging with brAInwav branding
- Correlation ID tracking across operations
- Security event logging
- Performance metrics logging

### 3. Health Checks
- MCP server capability validation
- File system watcher health
- Tool registry integrity
- Notification system status

## Alternatives Considered

### 1. External Message Queue
- **Pros**: Reliable delivery, scalable
- **Cons**: Additional complexity, external dependency
- **Decision**: In-memory notification system with debouncing sufficient for current needs

### 2. Database-backed Version Registry
- **Pros**: Persistent storage, complex queries
- **Cons**: Additional infrastructure, overhead
- **Decision**: File-based registry with in-memory caching provides better performance and simplicity

### 3. Custom Versioning Scheme
- **Pros**: Tailored to specific needs
- **Cons**: Non-standard, compatibility issues
- **Decision**: Adopt SemVer and SEP-1575 for industry standard compatibility

## Risks and Mitigations

### 1. Client Compatibility
- **Risk**: Clients may not support notifications
- **Mitigation**: Manual refresh tool provides fallback compatibility

### 2. Performance Impact
- **Risk**: File system watching and notification overhead
- **Mitigation**: Debouncing, rate limiting, configurable settings

### 3. Security Risks
- **Risk**: Dynamic tool loading could introduce vulnerabilities
- **Mitigation**: Schema validation, security metadata, access controls

### 4. Complexity
- **Risk**: Implementation complexity could affect maintainability
- **Mitigation**: Modular design, comprehensive testing, clear documentation

## Future Enhancements

### 1. Advanced Versioning
- Dependency resolution between tools
- Automated version migration
- Version deprecation workflows

### 2. Enhanced Security
- Cryptographic signing of tool contracts
- Fine-grained access controls
- Security scanning integration

### 3. Performance Optimization
- Notification caching and batching
- Incremental file system watching
- Tool version caching strategies

### 4. Tool Ecosystem
- Tool marketplace integration
- Automatic tool discovery
- Tool dependency management

## Conclusion

This implementation provides a robust, standards-compliant MCP versioned contracts system that:

1. **Maintains Protocol Compatibility**: Follows MCP specification exactly
2. **Provides Real-time Updates**: Efficient notification system with debouncing
3. **Supports Versioning**: Full SemVer constraint resolution for tools
4. **Ensures Compatibility**: Manual refresh tool for all client types
5. **Prioritizes Security**: Comprehensive validation and access controls
6. **Enables Observability**: Structured logging and performance monitoring

The modular design allows for incremental implementation and testing while maintaining the flexibility to adapt to future MCP specification changes and evolving requirements.

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [SEP-1575: Tool Semantic Versioning](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1575)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [brAInwav Development Standards](../.cortex/rules/RULES_OF_AI.md)
- [Cortex-OS Architecture](../docs/cortex/cortex-system-architecture.md)