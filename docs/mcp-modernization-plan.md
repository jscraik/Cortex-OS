# MCP Implementation Modernization Plan

## Current State
We currently have two parallel implementations:
1. **Official SDK**: Installed in `mcp-server` package and partially used in `mcp` package
2. **Custom Implementation**: Located in `packages/mcp/mcp-transport/src/` - reimplements functionality already available in the official SDK

## Problem
We're duplicating work that's already been done in the official SDK, creating:
- Maintenance burden
- Potential inconsistencies
- Security risks from custom implementations
- Code bloat

## Solution
Replace our custom transport implementations with the official SDK.

## Implementation Steps

### 1. Add Official SDK Dependency
Add `@modelcontextprotocol/sdk` as a direct dependency to the `mcp` package.

### 2. Replace Custom Transport Implementations
Replace our custom implementations with official SDK transports:
- `packages/mcp/mcp-transport/src/stdio.ts` → Official `@modelcontextprotocol/sdk/client/stdio`
- `packages/mcp/mcp-transport/src/sse.ts` → Official `@modelcontextprotocol/sdk/client/sse`
- `packages/mcp/mcp-transport/src/https.ts` → Official `@modelcontextprotocol/sdk/client/streamableHttp`

### 3. Update Client Factory
Modify `packages/mcp/mcp-core/src/client.ts` to use official SDK transports.

### 4. Remove Custom Implementation
Delete `packages/mcp/mcp-transport/src/` directory.

### 5. Update Tests
Update tests to use official SDK transports.

## Benefits
1. **Reduced Maintenance**: No need to maintain custom transport implementations
2. **Security**: Official SDK is regularly updated and security-reviewed
3. **Features**: Access to all official SDK features and improvements
4. **Compatibility**: Guaranteed compatibility with MCP specification
5. **Community**: Benefit from community contributions and bug fixes

## Migration Path

### Phase 1: Dependency Setup
1. Add `@modelcontextprotocol/sdk` to `packages/mcp/package.json`
2. Install dependencies

### Phase 2: Implementation Replacement
1. Update `packages/mcp/mcp-core/src/client.ts` to use official SDK
2. Update any other files that reference custom transports
3. Ensure all existing functionality is preserved

### Phase 3: Cleanup
1. Remove `packages/mcp/mcp-transport/` directory
2. Update documentation and examples
3. Update tests to use official SDK

### Phase 4: Validation
1. Run all existing tests
2. Verify functionality equivalence
3. Check for any breaking changes