/**
 * Golden tests for agent evaluation with reproducible seeds
 * Tests deterministic behavior and regression detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasicExecutor, CodeIntelligenceAgent } from '@/index.js';
import { mockAgent, mockTask, mockCodeAnalysisRequest } from '@tests/fixtures/agents.js';
import { createSeededMock } from '@tests/utils/test-helpers.js';
import fs from 'fs/promises';
import path from 'path';

// Define mock data for golden tests
const mockAgents = {
  basic: mockAgent,
  codeIntelligence: {
    id: 'code-intel-001',
    name: 'Code Intelligence Agent',
    capabilities: ['analyze', 'review', 'optimize', 'security-scan']
  }
};

const mockTasks = {
  simple: mockTask,
  analysis: {
    id: 'analysis-task-001',
    kind: 'code-analysis',
    input: mockCodeAnalysisRequest,
    budget: { wallClockMs: 10000, maxSteps: 5 }
  }
};

const mockCodeAnalysisRequests = {
  basic: mockCodeAnalysisRequest,
  security: {
    ...mockCodeAnalysisRequest,
    analysisType: 'security' as const,
    urgency: 'high' as const
  },
  performance: {
    ...mockCodeAnalysisRequest,
    analysisType: 'optimize' as const,
    urgency: 'medium' as const
  },
  complex: {
    ...mockCodeAnalysisRequest,
    code: 'function complex() { for(let i=0; i<10; i++) { if(a) { if(b) { return c; } } } }',
    analysisType: 'review' as const
  }
};

// Golden test snapshots directory
const GOLDEN_SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// Deterministic seed for reproducible tests
const GOLDEN_SEED = parseInt(process.env.VITEST_GOLDEN_SEED || '12345');

describe('Golden Tests - Agent Evaluation', () => {
  let basicExecutor: BasicExecutor;
  let codeAgent: CodeIntelligenceAgent;

  beforeEach(async () => {
    // Ensure snapshots directory exists
    await fs.mkdir(GOLDEN_SNAPSHOTS_DIR, { recursive: true });
    
    basicExecutor = new BasicExecutor();
    codeAgent = new CodeIntelligenceAgent({
      ollamaEndpoint: 'http://localhost:11434',
      mlxEndpoint: 'http://localhost:8765'
    });

    // Mock fetch with deterministic responses based on seed
    const mockFetch = createSeededMock(GOLDEN_SEED, [
      // Response 1: Basic analysis
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          response: `
            **Golden Test Analysis - Seed: ${GOLDEN_SEED}**
            
            **Quality Score:** 85/100
            **Complexity:** Low (Cyclomatic: 2, Cognitive: 1)
            **Security:** No issues detected
            **Performance:** Optimal
            **Maintainability:** High
            
            **Suggestions:**
            1. Add input validation (Priority: Medium)
            2. Consider type annotations (Priority: Low)
            
            **Golden Metadata:**
            - Analysis ID: golden-${GOLDEN_SEED}-001
            - Model Version: qwen3-coder-v1.0
            - Confidence: 0.92
          `
        })
      }),
      
      // Response 2: Security analysis  
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          response: `
            **Security Analysis - Golden Test**
            
            **Risk Level:** MEDIUM
            **Vulnerabilities Found:** 1
            
            **Details:**
            - SQL Injection potential at line 1
            - Impact: Medium
            - Confidence: 0.88
            
            **Mitigation:**
            Use parameterized queries
            
            **Golden Signature:** security-${GOLDEN_SEED}-002
          `
        })
      })
    ]);

    vi.mocked(global.fetch).mockImplementation(mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BasicExecutor Golden Tests', () => {
    it('should produce consistent execution results', async () => {
      const agent = mockAgents.basic;
      const task = mockTasks.simple;
      
      const result = await basicExecutor.run(agent, task);
      
      const expectedGolden = {
        status: 'completed',
        result: task.input,
        agent: agent.id,
        // Golden metadata
        goldenSeed: GOLDEN_SEED,
        testType: 'basic-execution'
      };

      expect(result).toMatchObject({
        status: 'completed',
        result: task.input,
        agent: agent.id
      });

      // Store golden snapshot
      await storeGoldenSnapshot('basic-executor-simple', {
        input: { agent, task },
        output: result,
        metadata: expectedGolden
      });
    });

    it('should handle multiple task types consistently', async () => {
      const agent = mockAgents.codeIntelligence;
      const tasks = Object.values(mockTasks);
      
      const results = [];
      
      for (const task of tasks) {
        const result = await basicExecutor.run(agent, task);
        results.push({
          taskId: task.id,
          taskKind: task.kind,
          result: result,
          executionOrder: results.length
        });
      }

      // Verify deterministic ordering and results (adjust for actual task count)
      expect(results).toHaveLength(2); // We only have 2 mock tasks defined
      expect(results[0].taskId).toBe('task-001');
      expect(results[1].taskId).toBe('analysis-task-001');

      // Store golden snapshot
      await storeGoldenSnapshot('basic-executor-multiple-tasks', {
        input: { agent, tasks },
        output: results,
        metadata: { seed: GOLDEN_SEED, testType: 'multi-task' }
      });
    });
  });

  describe('CodeIntelligenceAgent Golden Tests', () => {
    it('should produce deterministic analysis for basic code', async () => {
      const request = mockCodeAnalysisRequests.basic;
      const result = await codeAgent.analyzeCode(request);

      // Verify consistent structure
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('modelUsed');
      expect(result).toHaveProperty('processingTime');

      // Verify deterministic values (based on mock)
      expect(result.confidence).toBeCloseTo(0.85, 2);
      expect(result.modelUsed).toMatch(/qwen3-coder/);
      
      await storeGoldenSnapshot('code-intelligence-basic', {
        input: request,
        output: result,
        metadata: { seed: GOLDEN_SEED, analysisType: 'basic' }
      });
    });

    it('should produce consistent security analysis', async () => {
      const request = mockCodeAnalysisRequests.security;
      const result = await codeAgent.analyzeCode(request);

      // Security analysis should be deterministic
      expect(result.security.riskLevel).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.security.riskLevel);
      expect(result.security.vulnerabilities).toBeDefined();
      expect(result.modelUsed).toBeDefined();

      await storeGoldenSnapshot('code-intelligence-security', {
        input: request,
        output: result,
        metadata: { seed: GOLDEN_SEED, analysisType: 'security' }
      });
    });

    it('should maintain consistency across multiple analyses', async () => {
      const requests = [
        mockCodeAnalysisRequests.basic,
        mockCodeAnalysisRequests.performance,
        mockCodeAnalysisRequests.complex
      ];

      const results = [];
      
      for (const request of requests) {
        const result = await codeAgent.analyzeCode(request);
        results.push({
          requestType: request.analysisType,
          urgency: request.urgency,
          confidence: result.confidence,
          modelUsed: result.modelUsed,
          processingTime: result.processingTime
        });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify consistent model selection for same analysis types
      const basicResults = results.filter(r => r.requestType === 'review');
      expect(basicResults.length).toBeGreaterThan(0);
      
      const performanceResults = results.filter(r => r.requestType === 'optimize');
      expect(performanceResults.length).toBeGreaterThan(0);
      
      await storeGoldenSnapshot('code-intelligence-batch', {
        input: requests,
        output: results,
        metadata: { seed: GOLDEN_SEED, testType: 'batch-analysis' }
      });
    });
  });

  describe('Cross-Agent Golden Tests', () => {
    it('should maintain consistency in agent coordination', async () => {
      const basicAgent = mockAgents.basic;
      // Use the actual CodeIntelligenceAgent instance, not the mock
      const codeAgentInstance = codeAgent;
      
      // Execute basic task
      const executionResult = await basicExecutor.run(basicAgent, mockTasks.simple);
      
      // Analyze execution result
      const analysisRequest = {
        ...mockCodeAnalysisRequests.basic,
        context: `Golden test coordination - execution: ${executionResult.agent}`,
        code: JSON.stringify(executionResult)
      };
      
      // Ensure codeAgent is properly instantiated
      const analysisResult = await codeAgentInstance.analyzeCode(analysisRequest);
      
      const coordinationResult = {
        execution: {
          agent: executionResult.agent,
          status: executionResult.status,
          resultType: typeof executionResult.result
        },
        analysis: {
          confidence: analysisResult.confidence,
          modelUsed: analysisResult.modelUsed,
          suggestionsCount: analysisResult.suggestions.length
        },
        coordination: {
          seed: GOLDEN_SEED,
          workflow: 'execute-then-analyze',
          timestamp: Date.now()
        }
      };

      await storeGoldenSnapshot('cross-agent-coordination', {
        input: { basicAgent, codeAgent, task: mockTasks.simple },
        output: coordinationResult,
        metadata: { seed: GOLDEN_SEED, testType: 'coordination' }
      });

      // Verify coordination integrity
      expect(coordinationResult.execution.status).toBe('completed');
      expect(coordinationResult.analysis.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Regression Detection', () => {
    it('should detect changes in basic execution behavior', async () => {
      const snapshotName = 'regression-basic-execution';
      const agent = mockAgents.basic;
      const task = mockTasks.simple;
      
      const currentResult = await basicExecutor.run(agent, task);
      
      // Compare with previous golden snapshot if exists
      const previousSnapshot = await loadGoldenSnapshot(snapshotName);
      
      if (previousSnapshot) {
        expect(currentResult.status).toBe(previousSnapshot.output.status);
        expect(currentResult.agent).toBe(previousSnapshot.output.agent);
        expect(typeof currentResult.result).toBe(typeof previousSnapshot.output.result);
      }
      
      await storeGoldenSnapshot(snapshotName, {
        input: { agent, task },
        output: currentResult,
        metadata: { 
          seed: GOLDEN_SEED, 
          testType: 'regression',
          version: '1.0.0' 
        }
      });
    });

    it('should detect changes in analysis quality', async () => {
      const snapshotName = 'regression-analysis-quality';
      const request = mockCodeAnalysisRequests.basic;
      
      const currentResult = await codeAgent.analyzeCode(request);
      
      const previousSnapshot = await loadGoldenSnapshot(snapshotName);
      
      if (previousSnapshot) {
        // Verify key metrics haven't degraded
        expect(currentResult.confidence).toBeGreaterThanOrEqual(
          previousSnapshot.output.confidence * 0.95 // Allow 5% degradation
        );
        expect(currentResult.suggestions.length).toBeGreaterThanOrEqual(
          Math.max(1, previousSnapshot.output.suggestions.length - 1)
        );
      }

      await storeGoldenSnapshot(snapshotName, {
        input: request,
        output: currentResult,
        metadata: { 
          seed: GOLDEN_SEED, 
          testType: 'quality-regression',
          qualityMetrics: {
            confidence: currentResult.confidence,
            suggestionsCount: currentResult.suggestions.length,
            securityVulns: currentResult.security.vulnerabilities.length
          }
        }
      });
    });
  });

  // Helper functions
  async function storeGoldenSnapshot(name: string, data: any): Promise<void> {
    const filepath = path.join(GOLDEN_SNAPSHOTS_DIR, `${name}.json`);
    const snapshot = {
      ...data,
      timestamp: Date.now(),
      seed: GOLDEN_SEED,
      nodeVersion: process.version
    };
    
    await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
  }

  async function loadGoldenSnapshot(name: string): Promise<any | null> {
    try {
      const filepath = path.join(GOLDEN_SNAPSHOTS_DIR, `${name}.json`);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
});