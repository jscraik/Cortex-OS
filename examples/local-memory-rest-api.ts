/**
 * Local Memory REST API Integration Examples for Cortex-OS
 * 
 * This file demonstrates how to integrate Local Memory's REST API
 * with the Cortex-OS nO (Master Agent Loop) implementation.
 * 
 * Base URL: http://localhost:3002/api/v1/
 * Full API Documentation: 25 endpoints across 7 categories
 */

import { z } from 'zod';

// ====================
// TYPE DEFINITIONS
// ====================

export const MemorySchema = z.object({
    id: z.string().uuid(),
    content: z.string(),
    importance: z.number().min(1).max(10),
    tags: z.array(z.string()),
    session_id: z.string(),
    domain: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});

export const CreateMemorySchema = z.object({
    content: z.string(),
    tags: z.array(z.string()).optional(),
    domain: z.string().optional(),
    importance: z.number().min(1).max(10).optional(),
    source: z.string().optional(),
});

export const SearchResultSchema = z.object({
    memory: MemorySchema,
    relevance_score: z.number(),
});

export const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    message: z.string(),
});

export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemory = z.infer<typeof CreateMemorySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// ====================
// LOCAL MEMORY CLIENT
// ====================

export class LocalMemoryClient {
    private baseUrl: string;

    constructor(baseUrl = 'http://localhost:3002/api/v1') {
        this.baseUrl = baseUrl;
    }

    // Core Memory Operations
    async storeMemory(memory: CreateMemory): Promise<Memory> {
        const response = await fetch(`${this.baseUrl}/memories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memory),
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return MemorySchema.parse(parsed.data);
    }

    async getMemory(id: string): Promise<Memory> {
        const response = await fetch(`${this.baseUrl}/memories/${id}`);
        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return MemorySchema.parse(parsed.data);
    }

    async searchMemories(query: string, limit = 10): Promise<SearchResult[]> {
        const params = new URLSearchParams({ query, limit: limit.toString() });
        const response = await fetch(`${this.baseUrl}/memories/search?${params}`);
        const result = await response.json();

        if (!result.data) {
            return [];
        }

        return result.data.map((item: unknown) => SearchResultSchema.parse(item));
    }

    async updateMemory(id: string, updates: Partial<CreateMemory>): Promise<Memory> {
        const response = await fetch(`${this.baseUrl}/memories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return MemorySchema.parse(parsed.data);
    }

    async deleteMemory(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/memories/${id}`, {
            method: 'DELETE',
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }
    }

    // AI-Powered Analysis
    async analyzeMemories(query: string, analysisType = 'insights'): Promise<unknown> {
        const response = await fetch(`${this.baseUrl}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, analysis_type: analysisType }),
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return parsed.data;
    }

    // Relationship Discovery
    async discoverRelationships(memoryId?: string, limit = 10): Promise<unknown> {
        const body: Record<string, unknown> = { limit };
        if (memoryId) body.memory_id = memoryId;

        const response = await fetch(`${this.baseUrl}/relationships/discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return parsed.data;
    }

    // Temporal Analysis
    async analyzeTemporalPatterns(
        analysisType: 'learning_progression' | 'knowledge_gaps' | 'concept_evolution',
        timeframe: 'week' | 'month' | 'quarter' | 'year',
        concept?: string
    ): Promise<unknown> {
        const body: Record<string, unknown> = { analysis_type: analysisType, timeframe };
        if (concept) body.concept = concept;

        const response = await fetch(`${this.baseUrl}/temporal/patterns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return parsed.data;
    }

    // System Operations
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        const response = await fetch(`${this.baseUrl}/health`);
        const result = await response.json();
        const parsed = ApiResponseSchema.parse(result);

        if (!parsed.success) {
            throw new Error(parsed.message);
        }

        return parsed.data;
    }
}

// ====================
// CORTEX-OS INTEGRATION EXAMPLES
// ====================

export class CortexOSMemoryService {
    public client: LocalMemoryClient;

    constructor() {
        this.client = new LocalMemoryClient();
    }

    // Store TDD progress and decisions
    async recordTDDProgress(
        phase: string,
        testDescription: string,
        implementation: string,
        status: 'red' | 'green' | 'refactor' = 'red'
    ): Promise<Memory> {
        return await this.client.storeMemory({
            content: `TDD ${status.toUpperCase()}: ${testDescription}\n\nImplementation: ${implementation}`,
            tags: ['cortex-os', 'tdd', 'no-architecture', `phase-${phase}`, status],
            domain: 'orchestration',
            importance: status === 'red' ? 9 : 7, // Higher importance for failing tests
        });
    }

    // Store architectural decisions
    async recordArchitecturalDecision(
        decision: string,
        context: string,
        consequences: string,
        component: string
    ): Promise<Memory> {
        return await this.client.storeMemory({
            content: `Architectural Decision: ${decision}\n\nContext: ${context}\n\nConsequences: ${consequences}`,
            tags: ['cortex-os', 'architecture', 'no-architecture', 'adr', component],
            domain: 'orchestration',
            importance: 8,
        });
    }

    // Store agent coordination patterns
    async recordAgentCoordinationPattern(
        pattern: string,
        description: string,
        useCase: string,
        performance: string
    ): Promise<Memory> {
        return await this.client.storeMemory({
            content: `Agent Coordination Pattern: ${pattern}\n\nDescription: ${description}\n\nUse Case: ${useCase}\n\nPerformance: ${performance}`,
            tags: ['cortex-os', 'agent-coordination', 'patterns', 'no-architecture'],
            domain: 'orchestration',
            importance: 7,
        });
    }

    // Search for implementation examples
    async findImplementationExamples(component: string): Promise<SearchResult[]> {
        return await this.client.searchMemories(`${component} implementation example`, 5);
    }

    // Analyze project progress
    async analyzeProjectProgress(): Promise<unknown> {
        return await this.client.analyzeMemories(
            'nO Master Agent Loop implementation progress and next steps',
            'insights'
        );
    }

    // Track learning progression for specific concepts
    async trackLearningProgression(concept: string): Promise<unknown> {
        return await this.client.analyzeTemporalPatterns(
            'learning_progression',
            'month',
            concept
        );
    }

    // Identify knowledge gaps in implementation
    async identifyKnowledgeGaps(): Promise<unknown> {
        return await this.client.analyzeTemporalPatterns(
            'knowledge_gaps',
            'month'
        );
    }
}

// ====================
// USAGE EXAMPLES
// ====================

export async function runExamples() {
    const memoryService = new CortexOSMemoryService();

    try {
        // Example 1: Record TDD progress for BasicScheduler
        console.log('Recording TDD progress...');
        const tddMemory = await memoryService.recordTDDProgress(
            '1',
            'BasicScheduler should create execution plan from simple request',
            'Create BasicScheduler class implementing IntelligenceScheduler interface',
            'red'
        );
        console.log('TDD Memory stored:', tddMemory.id);

        // Example 2: Record architectural decision
        console.log('Recording architectural decision...');
        const adrMemory = await memoryService.recordArchitecturalDecision(
            'Use Contract-first Design with Zod schemas',
            'Need type safety and runtime validation for agent communication',
            'Better error handling, API documentation, and IDE support',
            'intelligence-scheduler'
        );
        console.log('ADR Memory stored:', adrMemory.id);

        // Example 3: Search for related memories
        console.log('Searching for scheduler implementations...');
        const examples = await memoryService.findImplementationExamples('BasicScheduler');
        console.log('Found examples:', examples.length);

        // Example 4: Analyze project progress
        console.log('Analyzing project progress...');
        const analysis = await memoryService.analyzeProjectProgress();
        console.log('Progress analysis:', analysis);

        // Example 5: Health check
        const client = new LocalMemoryClient();
        const health = await client.healthCheck();
        console.log('System health:', health);

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// ====================
// INTEGRATION WITH ORCHESTRATION PACKAGE
// ====================

export interface OrchestrationMemoryAdapter {
    // Store execution plan and results
    recordExecutionPlan(plan: Record<string, unknown>): Promise<string>;
    recordExecutionResult(result: Record<string, unknown>): Promise<string>;

    // Store agent state and decisions
    recordAgentState(agentId: string, state: Record<string, unknown>): Promise<string>;
    recordAgentDecision(agentId: string, decision: Record<string, unknown>): Promise<string>;

    // Query for patterns and insights
    findSimilarPatterns(context: string): Promise<Memory[]>;
    analyzePerformancePatterns(): Promise<unknown>;

    // Store tool layer invocations
    recordToolInvocation(layer: string, tool: string, result: any): Promise<string>;
}

export class LocalMemoryOrchestrationAdapter implements OrchestrationMemoryAdapter {
    private service: CortexOSMemoryService;

    constructor() {
        this.service = new CortexOSMemoryService();
    }

    async recordExecutionPlan(plan: Record<string, unknown>): Promise<string> {
        const memory = await this.service.client.storeMemory({
            content: `Execution Plan: ${JSON.stringify(plan, null, 2)}`,
            tags: ['execution-plan', 'orchestration', 'no-architecture'],
            domain: 'orchestration',
            importance: 6,
        });
        return memory.id;
    }

    async recordExecutionResult(result: Record<string, unknown>): Promise<string> {
        const memory = await this.service.client.storeMemory({
            content: `Execution Result: ${JSON.stringify(result, null, 2)}`,
            tags: ['execution-result', 'orchestration', 'no-architecture'],
            domain: 'orchestration',
            importance: 5,
        });
        return memory.id;
    }

    async recordAgentState(agentId: string, state: Record<string, unknown>): Promise<string> {
        const memory = await this.service.client.storeMemory({
            content: `Agent ${agentId} State: ${JSON.stringify(state, null, 2)}`,
            tags: ['agent-state', 'orchestration', agentId],
            domain: 'orchestration',
            importance: 4,
        });
        return memory.id;
    }

    async recordAgentDecision(agentId: string, decision: Record<string, unknown>): Promise<string> {
        const memory = await this.service.client.storeMemory({
            content: `Agent ${agentId} Decision: ${JSON.stringify(decision, null, 2)}`,
            tags: ['agent-decision', 'orchestration', agentId],
            domain: 'orchestration',
            importance: 6,
        });
        return memory.id;
    }

    async findSimilarPatterns(context: string): Promise<Memory[]> {
        const results = await this.service.client.searchMemories(context, 10);
        return results.map(r => r.memory);
    }

    async analyzePerformancePatterns(): Promise<unknown> {
        return await this.service.client.analyzeMemories(
            'agent coordination performance patterns and optimization opportunities',
            'patterns'
        );
    }

    async recordToolInvocation(layer: string, tool: string, result: Record<string, unknown>): Promise<string> {
        const memory = await this.service.client.storeMemory({
            content: `Tool Invocation - Layer: ${layer}, Tool: ${tool}\nResult: ${JSON.stringify(result, null, 2)}`,
            tags: ['tool-invocation', layer, tool, 'orchestration'],
            domain: 'orchestration',
            importance: 3,
        });
        return memory.id;
    }
}

// Export for use in orchestration package
export default LocalMemoryOrchestrationAdapter;
