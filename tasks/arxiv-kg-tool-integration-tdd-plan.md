# arXiv Knowledge Graph Tool Integration - TDD Plan

## Overview

This Test-Driven Development (TDD) plan outlines the comprehensive implementation of arXiv MCP (Model Context Protocol) tool integration with the Cortex-OS GraphRAG system and Agent framework. The implementation follows strict TDD principles with failing tests first, followed by implementation, and refactoring.

## Phase 1: External Knowledge Abstraction (RED)

### 1.1 External Knowledge Interface Definition
**Test**: `packages/memory-core/__tests__/external/ExternalKnowledge.test.ts`
```typescript
// Test: Should define and validate external citation structure
expect(() => normalizeCitation({})).toThrow('Citation path is required');
expect(() => normalizeCitation({
  path: 'test:123',
  title: 'Test',
  content: 'Content',
  published: 'invalid-date'
})).toThrow('Invalid ISO-8601 date');
```

### 1.2 MCP Provider Configuration Validation
**Test**: `packages/memory-core/__tests__/external/MCPKnowledgeProvider.test.ts`
```typescript
// Test: Should validate MCP provider configuration
expect(() => {
  const provider = new MCPKnowledgeProvider();
  return provider.initialize({ provider: 'mcp', settings: {} });
}).rejects.toThrow('slug is required');
```

## Phase 2: MCP Knowledge Provider Implementation (GREEN)

### 2.1 Basic MCP Client Integration
**Implementation**: `packages/memory-core/src/services/external/MCPKnowledgeProvider.ts`
- Create MCP client connection
- Implement basic tool invocation
- Add error handling and timeouts

### 2.2 arXiv Response Processing
**Implementation**: Response transformation logic
- Parse arXiv API responses
- Normalize citation data
- Apply confidence scoring

### 2.3 Circuit Breaker and Fallback
**Implementation**: Resilience patterns
- Implement timeout handling
- Add retry logic with exponential backoff
- Graceful degradation on failures

## Phase 3: GraphRAG Service Integration (REFACTOR)

### 3.1 External Provider Selection
**Test**: `packages/memory-core/__tests__/GraphRAGService.external.test.ts`
```typescript
// Test: Should select correct provider based on configuration
const neo4jService = createGraphRAGService({
  externalKg: { enabled: true, provider: 'neo4j', /* ... */ }
});
expect(neo4jService['externalKg']).toBeDefined();

const mcpService = createGraphRAGService({
  externalKg: { enabled: true, provider: 'mcp', /* ... */ }
});
expect(mcpService['externalProvider']).toBeDefined();
```

### 3.2 Citation Merging Logic
**Test**: Verify citation deduplication and merging
```typescript
// Test: Should deduplicate citations by path
const result = await service.query({
  question: 'test',
  includeCitations: true
});
const paths = result.citations?.map(c => c.path);
expect(new Set(paths)).toHaveLength(paths?.length || 0);
```

### 3.3 Configuration Schema Updates
**Implementation**: Update GraphRAGServiceConfigSchema
- Add provider selection enum
- Extend with MCP-specific settings
- Maintain backward compatibility

## Phase 4: Agent Tool Integration (RED)

### 4.1 ArxivMCPTools Interface
**Test**: `packages/agents/__tests__/mcp/ArxivMCPTools.test.ts`
```typescript
// Test: Should provide correct tool descriptors
const tools = arxivTools.getTools();
expect(tools).toHaveLength(2);
expect(tools[0].name).toBe('arxiv_search');
expect(tools[1].name).toBe('arxiv_download');

// Test: Should validate tool parameters
expect(() => {
  tools[0].schema.parse({}); // Missing required query
}).toThrow();
```

### 4.2 Tool Registration in ToolLayerAgent
**Test**: `packages/agents/__tests__/subagents/ToolLayerAgent.arxiv.test.ts`
```typescript
// Test: Should register arXiv tools when enabled
const agent = createToolLayerAgent({
  enableArxivResearch: true,
  arxivServerSlug: 'arxiv-1'
});
const availableTools = agent.getAvailableTools();
expect(availableTools).toContain('arxiv_search');
```

## Phase 5: Tool Implementation (GREEN)

### 5.1 Search Tool Handler
**Implementation**: `packages/agents/src/mcp/ArxivMCPTools.ts`
- Implement arXiv paper search
- Add parameter validation
- Handle search response transformation

### 5.2 Download Tool Handler
**Implementation**: Download functionality
- Implement paper download requests
- Support multiple formats (PDF, TeX, source)
- Add progress tracking for large downloads

### 5.3 ToolLayerAgent Integration
**Implementation**: Agent orchestration
- Register tools in constructor
- Add asynchronous initialization
- Implement tool selection logic

## Phase 6: LangGraph Routing Enhancement (REFACTOR)

### 6.1 Research Intent Detection
**Test**: `packages/agents/__tests__/langgraph/nodes.research.test.ts`
```typescript
// Test: Should detect research intent
const intent = analyzeIntent('find academic papers about machine learning');
expect(intent.primary).toBe('research');
expect(intent.confidence).toBeGreaterThan(0.5);
```

### 6.2 Capability Mapping
**Implementation**: Update `packages/agents/src/langgraph/nodes.ts`
- Add research intent to analyzer
- Map research capabilities to arXiv tools
- Enhance tool selection logic

### 6.3 Tool Execution Enhancement
**Implementation**: Execute arXiv tools via LangGraph
- Add arXiv tool execution support
- Implement proper error handling
- Add execution logging

## Phase 7: MCP Marketplace Enhancement (RED)

### 7.1 Fallback Server Metadata
**Test**: `packages/mcp-registry/tests/mcp-marketplace-integration.test.ts`
```typescript
// Test: Should import arXiv server with enhanced metadata
const servers = await readAll();
const arxivServer = servers.find(s => s.slug === 'arxiv-1');
expect(arxivServer?.metadata?.remoteTools).toHaveLength(2);
expect(arxivServer?.metadata?.tags).toContain('academic');
```

### 7.2 Registry Integration
**Implementation**: `packages/mcp-registry/src/providers/mcpmarket.ts`
- Enhance FALLBACK_SERVERS with metadata
- Add tool descriptions and parameters
- Include capability documentation

## Phase 8: End-to-End Integration Testing (GREEN)

### 8.1 Full Stack Integration
**Test**: `tests/integration/arxiv-integration.test.ts`
```typescript
// Test: Should perform end-to-end arXiv search
const agent = createToolLayerAgent({ enableArxivResearch: true });
const result = await agent.execute('search for papers about transformers');
expect(result.toolResults).toContainEqual(
  expect.objectContaining({
    tool: 'arxiv_search',
    status: 'success'
  })
);
```

### 8.2 GraphRAG Enrichment Flow
**Test**: Complete GraphRAG with arXiv enrichment
```typescript
// Test: Should enrich GraphRAG results with arXiv citations
const service = createGraphRAGService({
  externalKg: { enabled: true, provider: 'mcp', slug: 'arxiv-1' }
});
const result = await service.query({
  question: 'latest developments in GANs',
  includeCitations: true
});
expect(result.citations?.some(c => c.path.startsWith('arxiv:'))).toBe(true);
```

## Environment Setup and Prerequisites

### Development Environment
```bash
# Required environment variables
export EXTERNAL_KG_PROVIDER=mcp
export ARXIV_MCP_SLUG=arxiv-1
export ARXIV_MCP_SEARCH_TOOL=search_papers
export ARXIV_MCP_MAX_RESULTS=5
export ARXIV_MCP_REQUEST_TIMEOUT=10000

# MCP server registration
npm run mcp:register arxiv-1
```

### MCP Server Requirements
- arXiv MCP server must be registered in the registry
- Server must support `search_papers` and `download_paper` tools
- Network connectivity for arXiv API access

## Evidence Capture and Validation

### Code Quality Gates
- **Coverage**: ≥90% for all new code
- **Type Safety**: Strict TypeScript mode
- **Linting**: No ESLint violations
- **Security**: Pass Semgrep scanning

### Performance Requirements
- **Search Response**: <5 seconds for typical queries
- **Download Timeout**: Configurable, default 20 seconds
- **Citation Processing**: <500ms for 10 citations
- **Memory Usage**: <50MB for MCP provider

### Integration Validation
1. **Unit Tests**: All components in isolation
2. **Integration Tests**: Cross-component interactions
3. **E2E Tests**: Full workflow validation
4. **Performance Tests**: Load and stress testing

## Rollout and Deployment Strategy

### Phase 1: Feature Flag
```typescript
// Environment-based enablement
const enableArxivIntegration = process.env.ENABLE_ARXIV_INTEGRATION === 'true';
```

### Phase 2: Gradual Rollout
- Deploy to development environment
- Run integration test suite
- Enable for 10% of production traffic
- Monitor performance and error rates

### Phase 3: Full Rollout
- Enable for all production traffic
- Monitor system health
- Document performance benchmarks
- Create runbooks for common issues

### Rollback Procedures
```bash
# Immediate rollback
export EXTERNAL_KG_PROVIDER=none
export ENABLE_ARXIV_INTEGRATION=false

# Service restart
systemctl restart cortex-os-graphrag
systemctl restart cortex-os-agents
```

## Test Commands and Validation

### Development Testing
```bash
# Run all arXiv-related tests
pnpm test --grep "arxiv"

# Coverage for specific packages
pnpm --filter memory-core test --coverage
pnpm --filter agents test --coverage
pnpm --filter mcp-registry test --coverage
```

### Integration Testing
```bash
# Run integration test suite
pnpm test:integration

# E2E testing with live MCP server
MCP_NETWORK_EGRESS=enabled pnpm test:e2e
```

### Performance Testing
```bash
# Load testing for search functionality
npm run load-test:arxiv-search

# Memory profiling for MCP provider
npm run profile:mcp-provider
```

## Success Criteria

### Functional Requirements
✅ arXiv paper search returns relevant results
✅ Paper download supports multiple formats
✅ Citations are properly formatted and deduplicated
✅ GraphRAG enrichment adds value to responses
✅ Agent routing correctly identifies research intent

### Non-Functional Requirements
✅ Response times meet performance targets
✅ Error handling is graceful and informative
✅ System remains stable under load
✅ Security scanning passes without violations
✅ Documentation is comprehensive and accurate

### Integration Requirements
✅ MCP registry correctly resolves arXiv server
✅ ToolLayerAgent seamlessly uses arXiv tools
✅ LangGraph routing handles research queries
✅ GraphRAG citations include arXiv references
✅ Health checks monitor all components

## Conclusion

This TDD plan provides a comprehensive approach to implementing arXiv MCP tool integration while maintaining code quality, performance, and reliability. The phase-based approach ensures incremental development with continuous validation, reducing risk and ensuring a robust final implementation.

The plan follows Cortex-OS development best practices and integrates seamlessly with existing architectural patterns while providing significant new capabilities for academic research and knowledge enrichment.