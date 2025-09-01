# Task T1: Eliminate `any` Types in Agents Package
**Priority**: HIGH  
**Estimated Time**: 3 days  
**Risk Level**: Medium - Type Safety Issues

## Problem Statement
The agents package contains 15+ files with `any` type usage, creating runtime type safety risks. Key files include:
- `/packages/agents/src/agents/code-analysis-agent.ts` (lines 189-190, 341)
- `/apps/cortex-marketplace-api/src/registry.ts` (line 5 ESLint disable)
- Multiple test files and utility functions

## Test-First Implementation

### Step 1: RED - Write Failing Type Safety Tests
```typescript
// packages/agents/src/__tests__/type-safety.test.ts
import { describe, it, expect } from 'vitest';
import { createCodeAnalysisAgent } from '../agents/code-analysis-agent';
import type { CodeAnalysisInput, CodeAnalysisOutput } from '../agents/code-analysis-agent';

describe('Agents Type Safety', () => {
  const mockConfig = {
    provider: {
      generate: vi.fn().mockResolvedValue({ text: '{"suggestions": []}', latencyMs: 100 })
    },
    eventBus: {
      publish: vi.fn()
    },
    mcpClient: {}
  };

  it('should have strict typing for error events', async () => {
    const agent = createCodeAnalysisAgent(mockConfig);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

    try {
      await agent.execute({} as CodeAnalysisInput);
    } catch (error) {
      // Verify published error event has strict typing
      const publishedEvent = mockConfig.eventBus.publish.mock.calls[0]?.[0];
      expect(publishedEvent).toBeDefined();
      expect(publishedEvent.type).toBe('agent.failed');
      
      const eventData = publishedEvent.data;
      
      // These should be properly typed, not 'any'
      expect(typeof eventData.agentId).toBe('string');
      expect(typeof eventData.traceId).toBe('string');
      expect(typeof eventData.error).toBe('string');
      
      // Optional fields should be typed or undefined
      if (eventData.errorCode !== undefined) {
        expect(typeof eventData.errorCode).toBe('string');
      }
      if (eventData.status !== undefined) {
        expect(typeof eventData.status).toBe('number');
      }
    }
    
    consoleSpy.mockRestore();
  });

  it('should have strict typing for parseAnalysisResponse', () => {
    // This function currently uses 'any' - should be strongly typed
    const agent = createCodeAnalysisAgent(mockConfig);
    
    const mockResponse = {
      text: '{"suggestions": [], "complexity": {"cyclomatic": 5}, "confidence": 0.9}',
      latencyMs: 150
    };

    // Should not throw type errors and return properly typed result
    const result = (agent as any).parseAnalysisResponse(mockResponse, 'typescript', 'review');
    
    expect(result).toMatchObject({
      suggestions: expect.any(Array),
      complexity: expect.objectContaining({
        cyclomatic: expect.any(Number),
        maintainability: expect.any(String)
      }),
      confidence: expect.any(Number)
    });
  });

  it('should reject malformed analysis responses', () => {
    const agent = createCodeAnalysisAgent(mockConfig);
    
    const malformedResponse = {
      text: 'invalid json',
      latencyMs: 100
    };

    // Should handle malformed responses gracefully without 'any' types
    expect(() => {
      (agent as any).parseAnalysisResponse(malformedResponse, 'typescript', 'review');
    }).not.toThrow();
  });
});

// Type-level tests (compile-time validation)
describe('Agent Type Constraints', () => {
  it('should enforce strict event data types', () => {
    interface StrictEventData {
      agentId: string;
      traceId: string;
      capability: string;
      error: string;
      errorCode?: string;
      status?: number;
      metrics: {
        latencyMs: number;
      };
      timestamp: string;
    }

    // This should compile without errors
    const eventData: StrictEventData = {
      agentId: 'test-id',
      traceId: 'trace-123',
      capability: 'code-analysis',
      error: 'Test error',
      metrics: { latencyMs: 100 },
      timestamp: new Date().toISOString()
    };

    expect(eventData).toBeDefined();
  });
});
```

### Step 2: GREEN - Implement Type Safety Fixes

#### Fix 1: Code Analysis Agent Error Handling
```typescript
// packages/agents/src/agents/code-analysis-agent.ts
import { z } from 'zod';

// Define strict error types
interface AgentError {
  message: string;
  code?: string;
  status?: number;
}

interface HttpError extends Error {
  status: number;
  code?: string;
}

interface ValidationError extends Error {
  code: string;
}

// Type guards for error handling
function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'status' in error && typeof (error as any).status === 'number';
}

function isValidationError(error: unknown): error is ValidationError {
  return error instanceof Error && 'code' in error && typeof (error as any).code === 'string';
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && 
         typeof (error as Record<string, unknown>).code === 'string';
}

// Strict event data interfaces
interface AgentStartedEventData {
  agentId: string;
  traceId: string;
  capability: string;
  input: CodeAnalysisInput;
  timestamp: string;
}

interface AgentCompletedEventData {
  agentId: string;
  traceId: string;
  capability: string;
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    suggestionsCount: number;
  };
  timestamp: string;
}

interface AgentFailedEventData {
  agentId: string;
  traceId: string;
  capability: string;
  error: string;
  errorCode?: string;
  status?: number;
  metrics: {
    latencyMs: number;
  };
  timestamp: string;
}

// Updated parseAnalysisResponse with strict typing
const parseAnalysisResponse = (
  response: { text: string; latencyMs?: number },
  language: string,
  analysisType: string,
): CodeAnalysisOutput => {
  let parsedResponse: unknown;

  try {
    // Try to parse JSON from response text
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    // Fallback: create structured response from raw text
    parsedResponse = createFallbackAnalysisResponse(response.text, language, analysisType);
  }

  // Validate structure with runtime type checking
  if (!isAnalysisResponseStructure(parsedResponse)) {
    parsedResponse = createFallbackAnalysisResponse(response.text, language, analysisType);
  }

  const typed = parsedResponse as ParsedAnalysisResponse;

  // Ensure all required fields are present with proper defaults
  return {
    suggestions: Array.isArray(typed.suggestions) ? typed.suggestions : [],
    complexity: {
      cyclomatic: typeof typed.complexity?.cyclomatic === 'number' ? typed.complexity.cyclomatic : 5,
      cognitive: typeof typed.complexity?.cognitive === 'number' ? typed.complexity.cognitive : 3,
      maintainability: isValidMaintainability(typed.complexity?.maintainability) 
        ? typed.complexity.maintainability 
        : 'good' as const,
    },
    security: {
      vulnerabilities: Array.isArray(typed.security?.vulnerabilities) ? typed.security.vulnerabilities : [],
      riskLevel: isValidRiskLevel(typed.security?.riskLevel) ? typed.security.riskLevel : 'low' as const,
    },
    performance: {
      bottlenecks: Array.isArray(typed.performance?.bottlenecks) ? typed.performance.bottlenecks : [],
      memoryUsage: isValidMemoryUsage(typed.performance?.memoryUsage) 
        ? typed.performance.memoryUsage 
        : 'low' as const,
      algorithmicComplexity: typeof typed.performance?.algorithmicComplexity === 'string'
        ? typed.performance.algorithmicComplexity
        : undefined,
    },
    confidence: typeof typed.confidence === 'number' ? typed.confidence : 0.85,
    analysisTime: typeof typed.analysisTime === 'number' 
      ? typed.analysisTime 
      : response.latencyMs || 1500,
  };
};

// Runtime type checking helpers
interface ParsedAnalysisResponse {
  suggestions?: unknown;
  complexity?: {
    cyclomatic?: unknown;
    cognitive?: unknown;
    maintainability?: unknown;
  };
  security?: {
    vulnerabilities?: unknown;
    riskLevel?: unknown;
  };
  performance?: {
    bottlenecks?: unknown;
    memoryUsage?: unknown;
    algorithmicComplexity?: unknown;
  };
  confidence?: unknown;
  analysisTime?: unknown;
}

function isAnalysisResponseStructure(obj: unknown): obj is ParsedAnalysisResponse {
  return typeof obj === 'object' && obj !== null;
}

function isValidMaintainability(value: unknown): value is 'poor' | 'fair' | 'good' | 'excellent' {
  return typeof value === 'string' && ['poor', 'fair', 'good', 'excellent'].includes(value);
}

function isValidRiskLevel(value: unknown): value is 'low' | 'medium' | 'high' | 'critical' {
  return typeof value === 'string' && ['low', 'medium', 'high', 'critical'].includes(value);
}

function isValidMemoryUsage(value: unknown): value is 'low' | 'medium' | 'high' {
  return typeof value === 'string' && ['low', 'medium', 'high'].includes(value);
}

// Updated error event creation
const createErrorEvent = (
  agentId: string,
  traceId: string,
  error: unknown,
  executionTime: number
): { type: string; data: AgentFailedEventData } => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  let errorCode: string | undefined;
  let status: number | undefined;

  if (isHttpError(error)) {
    status = error.status;
    errorCode = error.code;
  } else if (isValidationError(error)) {
    errorCode = error.code;
  } else if (isErrorWithCode(error)) {
    errorCode = error.code;
  }

  return {
    type: 'agent.failed',
    data: {
      agentId,
      traceId,
      capability: 'code-analysis',
      error: errorMessage,
      errorCode,
      status,
      metrics: {
        latencyMs: executionTime,
      },
      timestamp: new Date().toISOString(),
    },
  };
};

// Updated execute method with strict typing
const execute = async (input: CodeAnalysisInput): Promise<CodeAnalysisOutput> => {
  const traceId = generateTraceId();
  const startTime = Date.now();

  // Validate input
  const validatedInput = validateSchema<CodeAnalysisInput>(codeAnalysisInputSchema, input);

  // Emit agent started event with strict typing
  const startedEvent: { type: string; data: AgentStartedEventData } = {
    type: 'agent.started',
    data: {
      agentId,
      traceId,
      capability: 'code-analysis',
      input: validatedInput,
      timestamp: new Date().toISOString(),
    },
  };
  
  config.eventBus.publish(startedEvent);

  try {
    const result = await withTimeout(
      analyzeCode(validatedInput, config),
      timeout,
      `Code analysis timed out after ${timeout}ms`,
    );

    const executionTime = Date.now() - startTime;

    // Emit agent completed event with strict typing
    const completedEvent: { type: string; data: AgentCompletedEventData } = {
      type: 'agent.completed',
      data: {
        agentId,
        traceId,
        capability: 'code-analysis',
        metrics: {
          latencyMs: executionTime,
          tokensUsed: estimateTokens(validatedInput.sourceCode),
          suggestionsCount: result.suggestions.length,
        },
        timestamp: new Date().toISOString(),
      },
    };

    config.eventBus.publish(completedEvent);
    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorEvent = createErrorEvent(agentId, traceId, error, executionTime);
    config.eventBus.publish(errorEvent);
    throw error;
  }
};
```

#### Fix 2: Registry Type Safety
```typescript
// apps/cortex-marketplace-api/src/registry.ts
// Remove the ESLint disable comment and fix the underlying issues

import { z } from 'zod';
import type { Fuse } from 'fuse.js';

// Define strict types for search results
interface SearchResult<T> {
  item: T;
  refIndex: number;
  score?: number;
}

interface TypedSearchIndex {
  search(pattern: string): SearchResult<ServerManifest>[];
}

export class TypedMarketplaceRegistry {
  private registry: RegistryIndex | null = null;
  private searchIndex: TypedSearchIndex | null = null;
  private healthStatus = new Map<string, ServerHealth>();
  private lastUpdate: Date | null = null;

  // Remove all 'any' types and add proper error handling
  async fetchRegistry(): Promise<void> {
    try {
      // Security: Validate URL to prevent SSRF attacks
      if (!validateRegistryUrl(this.registryUrl)) {
        throw new Error(`Invalid registry URL rejected for security: ${this.registryUrl}`);
      }

      const response = await fetch(this.registryUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`);
      }

      // Type-safe JSON parsing
      const data: unknown = await response.json();
      const result = RegistryIndexSchema.safeParse(data);

      if (!result.success) {
        throw new Error(`Invalid registry format: ${result.error.message}`);
      }

      this.registry = result.data;
      this.lastUpdate = new Date();

      // Cache the registry
      await this.saveToCache();

      console.log(`✅ Registry updated: ${this.registry.serverCount} servers available`);
    } catch (error) {
      console.error('Failed to fetch registry:', error);
      throw error;
    }
  }

  // Type-safe search implementation
  async searchServers(request: SearchRequest): Promise<ApiResponse<ServerManifest[]>> {
    if (!this.registry) {
      return {
        success: false,
        error: { code: 'REGISTRY_NOT_LOADED', message: 'Registry not initialized' },
      };
    }

    let results: ServerManifest[] = [...this.registry.servers];

    // Text search using type-safe Fuse.js
    if (request.q && this.searchIndex) {
      const searchResults = this.searchIndex.search(request.q);
      results = searchResults.map((result: SearchResult<ServerManifest>) => result.item);
    }

    // Apply filters with type safety
    results = this.applyFilters(results, request);

    // Sort and paginate
    results = this.sortResults(results);
    const paginatedResults = this.paginateResults(results, request);

    return {
      success: true,
      data: paginatedResults.items,
      meta: {
        total: results.length,
        offset: request.offset,
        limit: request.limit,
      },
    };
  }

  private applyFilters(results: ServerManifest[], request: SearchRequest): ServerManifest[] {
    // Category filter
    if (request.category) {
      results = results.filter((server) => server.category === request.category);
    }

    // Capabilities filter
    if (request.capabilities && request.capabilities.length > 0) {
      results = results.filter((server) =>
        request.capabilities!.every((cap) => 
          cap in server.capabilities && server.capabilities[cap]
        )
      );
    }

    // Verified filter
    if (request.verified !== undefined) {
      results = results.filter((server) => server.publisher.verified === request.verified);
    }

    return results;
  }

  private sortResults(results: ServerManifest[]): ServerManifest[] {
    // Sort by featured first, then by downloads
    return results.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.downloads - a.downloads;
    });
  }

  private paginateResults(results: ServerManifest[], request: SearchRequest): { items: ServerManifest[] } {
    return {
      items: results.slice(request.offset, request.offset + request.limit)
    };
  }
}
```

### Step 3: REFACTOR - Add Comprehensive Type Validation
```typescript
// packages/agents/src/lib/type-guards.ts
export function isValidAnalysisType(value: unknown): value is 'review' | 'refactor' | 'optimize' | 'architecture' | 'security' {
  return typeof value === 'string' && 
         ['review', 'refactor', 'optimize', 'architecture', 'security'].includes(value);
}

export function isValidLanguage(value: unknown): value is 'javascript' | 'typescript' | 'python' | 'java' | 'go' | 'rust' | 'csharp' | 'php' | 'ruby' {
  const validLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'csharp', 'php', 'ruby'];
  return typeof value === 'string' && validLanguages.includes(value);
}

// Runtime schema validation
export const RuntimeCodeAnalysisInputSchema = z.object({
  sourceCode: z.string().min(1),
  language: z.string().refine(isValidLanguage),
  analysisType: z.string().refine(isValidAnalysisType),
  focus: z.array(z.enum(['complexity', 'performance', 'security', 'maintainability'])).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  includeMetrics: z.boolean().optional(),
  includeSuggestions: z.boolean().optional(),
  seed: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().max(4096).optional(),
});
```

## Acceptance Criteria
- [ ] Zero `any` types in core agent logic
- [ ] All error handling uses strict typing
- [ ] Runtime type validation for external data
- [ ] ESLint suppressions removed
- [ ] TypeScript strict mode enabled
- [ ] All existing functionality preserved
- [ ] Performance regression < 5%

## Rollback Strategy
1. **Feature Flag**: `ENABLE_STRICT_TYPING=false`
2. **Gradual Migration**: Enable strict typing per agent type
3. **Monitoring**: Track type-related runtime errors
4. **Fallback**: Automatic fallback to permissive typing on errors

## Validation Commands
```bash
# Type checking
npx tsc --noEmit --strict

# Run type safety tests
npm test -- type-safety.test.ts

# Full test suite with coverage
npm run test:coverage:threshold

# ESLint compliance
npx eslint packages/agents/src --fix
```

## Files Modified
- `/packages/agents/src/agents/code-analysis-agent.ts` - Remove any types
- `/packages/agents/src/lib/type-guards.ts` - New type guard utilities
- `/apps/cortex-marketplace-api/src/registry.ts` - Remove ESLint suppressions
- `/packages/agents/src/__tests__/type-safety.test.ts` - New type safety tests
- `/tsconfig.base.json` - Enable strict mode
