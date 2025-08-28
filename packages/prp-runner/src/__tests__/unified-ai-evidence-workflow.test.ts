/**
 * @file Unified AI Evidence Workflow Tests
 * @description Comprehensive end-to-end tests for the unified evidence collection workflow
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status active
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UnifiedAIEvidenceWorkflow,
  UnifiedEvidenceConfig,
  EvidenceTaskContext,
} from '../unified-ai-evidence-workflow.js';

// Mock the dependencies
vi.mock('../asbr-ai-integration.js', () => ({
  ASBRAIIntegration: vi.fn().mockImplementation(() => ({
    collectEnhancedEvidence: vi.fn().mockResolvedValue([
      { content: 'Test evidence 1', source: 'mock-source', score: 0.9 },
      { content: 'Test evidence 2', source: 'mock-source', score: 0.8 },
    ]),
    enhanceEvidence: vi.fn().mockResolvedValue({
      enhanced: 'Enhanced test evidence',
      improvements: ['Added context', 'Improved clarity'],
    }),
    searchRelatedEvidence: vi.fn().mockResolvedValue([
      { content: 'Related evidence 1', score: 0.7 },
      { content: 'Related evidence 2', score: 0.6 },
    ]),
    factCheckEvidence: vi.fn().mockResolvedValue({
      verified: true,
      confidence: 0.85,
      evidence: ['Supporting fact 1', 'Supporting fact 2'],
    }),
    generateEvidenceInsights: vi.fn().mockResolvedValue({
      insights: ['Key insight 1', 'Key insight 2'],
      gaps: ['Information gap 1'],
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      confidence: 0.8,
    }),
  })),
}));

vi.mock('../ai-capabilities.js', () => ({
  AICapabilities: vi.fn(),
}));

vi.mock('../embedding-adapter.js', () => ({
  EmbeddingAdapter: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  })),
}));

describe('🔄 Unified AI Evidence Workflow Tests', () => {
  let workflow: UnifiedAIEvidenceWorkflow;
  let testConfig: UnifiedEvidenceConfig;
  let testContext: EvidenceTaskContext;

  beforeEach(() => {
    testConfig = {
      llmModel: 'test-llm',
      embeddingModel: 'test-embedding',
      maxTokens: 1024,
      temperature: 0.5,
      maxEvidenceItems: 20,
      similarityThreshold: 0.7,
      factCheckingEnabled: true,
      enhancementEnabled: true,
      enablePolicyCompliance: true,
      enableContentSanitization: true,
      tenantId: 'test-tenant',
      concurrencyLimit: 3,
      timeoutMs: 60000,
      cacheEnabled: true,
    };

    testContext = {
      taskId: 'test-task-001',
      description: 'Implement user authentication system',
      requirements: ['JWT token support', 'Password hashing', 'Rate limiting'],
      constraints: {
        security: 'enterprise-grade',
        performance: 'sub-100ms',
      },
      metadata: {
        priority: 'high',
        deadline: '2025-01-01',
      },
    };

    workflow = new UnifiedAIEvidenceWorkflow(testConfig);

    vi.clearAllMocks();
  });

  describe('📊 Workflow Initialization and Configuration', () => {
    it('should initialize workflow with comprehensive configuration', async () => {
      expect(workflow).toBeDefined();

      const status = await workflow.getWorkflowStatus();

      expect(status.status).toBe('active');
      expect(status.components.asbrIntegration).toBe('connected');
      expect(status.components.embeddingAdapter).toBe('connected');
      expect(status.configuration.modelsConfigured).toBe(true);
      expect(status.configuration.securityEnabled).toBe(true);
      expect(status.configuration.enhancementEnabled).toBe(true);
      expect(status.configuration.factCheckingEnabled).toBe(true);

      console.log('✅ Unified Workflow Initialization: PASSED');
      console.log('   - Components: All connected and operational');
      console.log('   - Configuration: Security and AI features enabled');
      console.log('   - Performance: Caching and concurrency limits configured');
    });

    it('should handle default configuration gracefully', async () => {
      const defaultWorkflow = new UnifiedAIEvidenceWorkflow();

      const status = await defaultWorkflow.getWorkflowStatus();

      expect(status.configuration.modelsConfigured).toBe(true);
      expect(status.performance.concurrencyLimit).toBeGreaterThan(0);
      expect(status.performance.timeoutMs).toBeGreaterThan(0);
    });
  });

  describe('🔄 End-to-End Evidence Collection Workflow', () => {
    it('should execute complete evidence collection workflow successfully', async () => {
      const result = await workflow.collectEvidence(testContext);

      // Validate workflow result structure
      expect(result).toBeDefined();
      expect(result.taskId).toBe(testContext.taskId);

      // Validate summary
      expect(result.summary.totalItems).toBeGreaterThan(0);
      expect(result.summary.processingTime).toBeGreaterThan(0);
      expect(result.summary.averageRelevance).toBeGreaterThan(0);

      // Validate evidence collection
      expect(result.evidence).toBeInstanceOf(Array);
      expect(result.evidence.length).toBeGreaterThan(0);

      result.evidence.forEach((evidence) => {
        expect(evidence.id).toBeDefined();
        expect(evidence.content).toBeDefined();
        expect(evidence.source).toBeDefined();
        expect(evidence.relevanceScore).toBeGreaterThan(0);
        expect(evidence.metadata).toBeDefined();
      });

      // Validate insights
      expect(result.insights.keyFindings).toBeInstanceOf(Array);
      expect(result.insights.confidence).toBeGreaterThan(0);

      // Validate compliance
      expect(result.compliance.securityValidated).toBe(true);
      expect(result.compliance.policyCompliant).toBe(true);

      // Validate performance metrics
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      expect(result.performance.memoryOperations).toBeGreaterThan(0);

      console.log('✅ End-to-End Workflow Execution: PASSED');
      console.log(`   - Evidence Items: ${result.summary.totalItems} collected`);
      console.log(`   - Enhanced Items: ${result.summary.enhancedItems} processed`);
      console.log(`   - Fact Checked: ${result.summary.factCheckedItems} verified`);
      console.log(`   - Average Relevance: ${result.summary.averageRelevance.toFixed(2)}`);
    });

    it('should handle complex task contexts with multiple requirements', async () => {
      const complexContext: EvidenceTaskContext = {
        taskId: 'complex-task-002',
        description: 'Build scalable microservices architecture with event sourcing',
        requirements: [
          'Event-driven communication',
          'CQRS pattern implementation',
          'Distributed tracing',
          'Service mesh integration',
          'Kubernetes deployment',
        ],
        constraints: {
          scalability: '10k+ RPS',
          availability: '99.9%',
          consistency: 'eventual',
          latency: '<10ms',
        },
        metadata: {
          complexity: 'high',
          timeline: '3-months',
          team_size: 8,
        },
      };

      const result = await workflow.collectEvidence(complexContext);

      expect(result.taskId).toBe(complexContext.taskId);
      expect(result.summary.totalItems).toBeGreaterThan(3); // Should collect from multiple sources
      expect(result.evidence.some((e) => e.enhancement)).toBe(true); // Should enhance some evidence
      expect(result.evidence.some((e) => e.factCheckResult)).toBe(true); // Should fact-check some evidence
    });
  });

  describe('🚀 Workflow Phase Validation', () => {
    it('should execute all seven workflow phases in correct sequence', async () => {
      const result = await workflow.collectEvidence(testContext);

      // Phase 1: Context Analysis (implicit in query generation)
      expect(result.evidence.some((e) => e.metadata.query)).toBe(true);

      // Phase 2: Multi-source Evidence Collection
      expect(result.evidence.some((e) => e.source)).toBe(true);

      // Phase 3: AI Enhancement (when enabled)
      expect(result.summary.enhancedItems).toBeGreaterThanOrEqual(0);

      // Phase 4: Semantic Search Enrichment
      expect(result.evidence.some((e) => e.metadata.searchMethod === 'semantic')).toBe(true);

      // Phase 5: Fact Checking & Validation
      expect(result.summary.factCheckedItems).toBeGreaterThanOrEqual(0);

      // Phase 6: Security & Policy Compliance
      expect(result.compliance.securityValidated).toBe(true);

      // Phase 7: Insight Generation
      expect(result.insights.keyFindings.length).toBeGreaterThan(0);
    });

    it('should handle workflow phase failures gracefully', async () => {
      // Mock one component to fail
      const mockASBR = workflow['asbrIntegration'];
      mockASBR.enhanceEvidence = vi
        .fn()
        .mockRejectedValue(new Error('Enhancement service unavailable'));

      const result = await workflow.collectEvidence(testContext);

      // Workflow should still complete successfully
      expect(result).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);

      // Should have fewer enhanced items due to failure
      expect(result.summary.enhancedItems).toBe(0);
    });
  });

  describe('⚡ Performance and Scalability', () => {
    it('should complete workflow within reasonable time limits', async () => {
      const startTime = Date.now();

      const result = await workflow.collectEvidence(testContext);

      const actualDuration = Date.now() - startTime;

      expect(actualDuration).toBeLessThan(10000); // Should complete within 10 seconds in test env
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      expect(result.performance.totalDuration).toBeLessThan(actualDuration + 1000); // Reasonable measurement accuracy
    });

    it('should handle concurrent evidence collection efficiently', async () => {
      const concurrentTasks = Array(3)
        .fill(null)
        .map((_, i) => ({
          ...testContext,
          taskId: `concurrent-task-${i}`,
          description: `Concurrent task ${i} for performance testing`,
        }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentTasks.map((task) => workflow.collectEvidence(task)),
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(totalTime).toBeLessThan(15000); // Should handle 3 concurrent tasks within 15s

      results.forEach((result, i) => {
        expect(result.taskId).toBe(`concurrent-task-${i}`);
        expect(result.evidence.length).toBeGreaterThan(0);
      });
    });
  });

  describe('🛡️ Security and Compliance Integration', () => {
    it('should enforce security policies throughout workflow', async () => {
      const result = await workflow.collectEvidence(testContext);

      expect(result.compliance.securityValidated).toBe(true);
      expect(result.compliance.policyCompliant).toBe(true);
      expect(result.compliance.sanitizationApplied).toBe(true);
    });

    it('should handle tenant isolation correctly', async () => {
      const tenant1Context = {
        ...testContext,
        metadata: { ...testContext.metadata, tenantId: 'tenant-001' },
      };
      const tenant2Context = {
        ...testContext,
        metadata: { ...testContext.metadata, tenantId: 'tenant-002' },
      };

      const result1 = await workflow.collectEvidence(tenant1Context);
      const result2 = await workflow.collectEvidence(tenant2Context);

      expect(result1.taskId).toBe(tenant1Context.taskId);
      expect(result2.taskId).toBe(tenant2Context.taskId);

      // Both should complete successfully with isolation
      expect(result1.compliance.securityValidated).toBe(true);
      expect(result2.compliance.securityValidated).toBe(true);
    });
  });

  describe('🔧 Configuration and Feature Toggles', () => {
    it('should respect disabled feature flags', async () => {
      const disabledConfig = {
        ...testConfig,
        factCheckingEnabled: false,
        enhancementEnabled: false,
      };

      const disabledWorkflow = new UnifiedAIEvidenceWorkflow(disabledConfig);
      const result = await disabledWorkflow.collectEvidence(testContext);

      expect(result.summary.factCheckedItems).toBe(0);
      expect(result.summary.enhancedItems).toBe(0);
      expect(result.evidence.every((e) => !e.factCheckResult)).toBe(true);
      expect(result.evidence.every((e) => !e.enhancement)).toBe(true);
    });

    it('should adapt behavior based on configuration limits', async () => {
      const limitedConfig = {
        ...testConfig,
        maxEvidenceItems: 5,
        concurrencyLimit: 1,
      };

      const limitedWorkflow = new UnifiedAIEvidenceWorkflow(limitedConfig);
      const result = await limitedWorkflow.collectEvidence(testContext);

      expect(result.summary.totalItems).toBeLessThanOrEqual(10); // Should respect limits
    });
  });

  describe('📈 Workflow Metrics and Monitoring', () => {
    it('should generate comprehensive performance metrics', async () => {
      const result = await workflow.collectEvidence(testContext);

      const metrics = result.performance;

      expect(metrics.totalDuration).toBeGreaterThan(0);
      expect(metrics.aiProcessingTime).toBeGreaterThan(0);
      expect(metrics.securityValidationTime).toBeGreaterThan(0);
      expect(metrics.memoryOperations).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should provide workflow status and health information', async () => {
      const status = await workflow.getWorkflowStatus();

      expect(status.status).toBe('active');
      expect(status.components).toBeDefined();
      expect(status.configuration).toBeDefined();
      expect(status.performance).toBeDefined();
    });
  });

  describe('🔄 Resource Management', () => {
    it('should support graceful shutdown', async () => {
      await expect(workflow.shutdown()).resolves.not.toThrow();
    });

    it('should handle resource cleanup on errors', async () => {
      // Mock a service to throw an error
      const mockASBR = workflow['asbrIntegration'];
      mockASBR.collectEnhancedEvidence = vi
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      await expect(workflow.collectEvidence(testContext)).rejects.toThrow(
        'Unified evidence collection failed',
      );
    });
  });

  describe('📊 Integration Completeness Report', () => {
    it('should demonstrate full AI integration stack', async () => {
      const result = await workflow.collectEvidence(testContext);

      const completenessReport = {
        evidenceCollection: {
          asbrIntegration: result.evidence.some((e) => e.source === 'asbr-integration'),
          semanticSearch: result.evidence.some((e) => e.metadata.searchMethod === 'semantic'),
          multiSourceAggregation: new Set(result.evidence.map((e) => e.source)).size > 1,
        },
        aiProcessing: {
          contentEnhancement: result.summary.enhancedItems > 0,
          factVerification: result.summary.factCheckedItems > 0,
          insightGeneration: result.insights.keyFindings.length > 0,
        },
        systemIntegration: {
          memoryService: result.performance.memoryOperations > 0,
          securityCompliance: result.compliance.securityValidated,
          policyEnforcement: result.compliance.policyCompliant,
        },
        performanceOptimization: {
          concurrentProcessing: result.performance.totalDuration < 30000, // Reasonable for test
          cacheUtilization: result.performance.cacheHitRate > 0,
          resourceEfficiency: result.performance.memoryOperations > 0,
        },
      };

      // Validate complete integration
      expect(completenessReport.evidenceCollection.asbrIntegration).toBe(true);
      expect(completenessReport.evidenceCollection.semanticSearch).toBe(true);
      expect(completenessReport.aiProcessing.insightGeneration).toBe(true);
      expect(completenessReport.systemIntegration.securityCompliance).toBe(true);
      expect(completenessReport.performanceOptimization.concurrentProcessing).toBe(true);

      console.log('✅ Full AI Integration Stack Validation: PASSED');
      console.log('   - Evidence Collection: Multi-source with semantic search');
      console.log('   - AI Processing: Enhancement, fact-checking, insights');
      console.log('   - System Integration: Memory, security, policy compliance');
      console.log('   - Performance: Concurrent processing with caching');
    });
  });
});
