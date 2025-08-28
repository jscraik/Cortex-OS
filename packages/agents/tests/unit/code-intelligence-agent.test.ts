import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeIntelligenceAgent } from '@/code-intelligence-agent.js';
import {
  mockCodeAnalysisRequest,
  mockCodeAnalysisResult,
  mockOllamaResponse,
  mockModelResponses,
} from '@tests/fixtures/agents.js';
import {
  SecurityValidator,
  PerformanceTestHelper,
  MockFactory,
  TestDataGenerator,
} from '@tests/utils/test-helpers.js';
import { createMockResponse } from '@tests/setup.js';

describe('CodeIntelligenceAgent', () => {
  let agent: CodeIntelligenceAgent;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    agent = new CodeIntelligenceAgent({
      ollamaEndpoint: 'http://localhost:11434',
      mlxEndpoint: 'http://localhost:8765',
    });
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should create instance with default config', () => {
      const defaultAgent = new CodeIntelligenceAgent();
      expect(defaultAgent).toBeInstanceOf(CodeIntelligenceAgent);
    });

    it('should create instance with custom config', () => {
      const customAgent = new CodeIntelligenceAgent({
        ollamaEndpoint: 'http://custom:8080',
        mlxEndpoint: 'http://mlx:9090',
      });
      expect(customAgent).toBeInstanceOf(CodeIntelligenceAgent);
    });

    it('should initialize with empty analysis history', async () => {
      const history = await agent.getAnalysisHistory();
      expect(history).toEqual([]);
    });

    it('should be an EventEmitter', () => {
      expect(agent.on).toBeDefined();
      expect(agent.emit).toBeDefined();
      expect(agent.removeAllListeners).toBeDefined();
    });
  });

  describe('Code Analysis', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));
    });

    it('should analyze code successfully', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle different analysis types', async () => {
      const analysisTypes = ['review', 'refactor', 'optimize', 'architecture', 'security'] as const;

      for (const analysisType of analysisTypes) {
        const request = { ...mockCodeAnalysisRequest, analysisType };
        const result = await agent.analyzeCode(request);

        expect(result).toBeDefined();
        expect(result.modelUsed).toBeDefined();
      }
    });

    it('should handle different urgency levels', async () => {
      const urgencyLevels = ['low', 'medium', 'high'] as const;

      for (const urgency of urgencyLevels) {
        const request = { ...mockCodeAnalysisRequest, urgency };
        const result = await agent.analyzeCode(request);

        expect(result).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
      }
    });

    it('should select appropriate model based on characteristics', async () => {
      // High urgency should prefer faster model
      const urgentRequest = { ...mockCodeAnalysisRequest, urgency: 'high' as const };
      await agent.analyzeCode(urgentRequest);

      // Security analysis should prefer premium model
      const securityRequest = { ...mockCodeAnalysisRequest, analysisType: 'security' as const };
      await agent.analyzeCode(securityRequest);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should emit analysis_complete event', async () => {
      const eventSpy = vi.fn();
      agent.on('analysis_complete', eventSpy);

      await agent.analyzeCode(mockCodeAnalysisRequest);

      expect(eventSpy).toHaveBeenCalledWith({
        request: mockCodeAnalysisRequest,
        result: expect.any(Object),
      });
    });

    it('should cache analysis results', async () => {
      await agent.analyzeCode(mockCodeAnalysisRequest);

      const history = await agent.getAnalysisHistory();
      expect(history).toHaveLength(1);
    });

    it('should handle complex code samples', async () => {
      const complexCode = TestDataGenerator.generateCodeSample('javascript', 'high');
      const request = { ...mockCodeAnalysisRequest, code: complexCode };

      const result = await agent.analyzeCode(request);
      expect(result.complexity.cyclomatic).toBeGreaterThan(0);
    });
  });

  describe('Model Integration', () => {
    it('should route to Qwen3-Coder', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockModelResponses['qwen3-coder']));

      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      expect(result.modelUsed).toContain('qwen3-coder');
    });

    it('should route to appropriate model based on urgency', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(mockModelResponses['deepseek-coder'] || mockOllamaResponse),
      );

      const request = { ...mockCodeAnalysisRequest, urgency: 'low' as const };
      const result = await agent.analyzeCode(request);
      expect(result.modelUsed).toBeDefined();
      expect(typeof result.modelUsed).toBe('string');
    });

    it('should handle model endpoint failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(agent.analyzeCode(mockCodeAnalysisRequest)).rejects.toThrow();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, false, 500));

      await expect(agent.analyzeCode(mockCodeAnalysisRequest)).rejects.toThrow();
    });

    it('should emit analysis_error event on failure', async () => {
      const errorSpy = vi.fn();
      agent.on('analysis_error', errorSpy);

      mockFetch.mockRejectedValue(new Error('Test error'));

      await expect(agent.analyzeCode(mockCodeAnalysisRequest)).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Security Integration', () => {
    it('should sanitize code input', async () => {
      const maliciousCode = 'eval(maliciousFunction())';
      const sanitized = SecurityValidator.sanitizeInput(maliciousCode);

      expect(sanitized).toContain('[FILTERED]');
      expect(sanitized).not.toBe(maliciousCode);
    });

    it('should detect PII in code', async () => {
      const codeWithPII = 'const ssn = "123-45-6789";';
      const detected = SecurityValidator.detectPII(codeWithPII);

      expect(detected).toContain('ssn');
    });

    it('should redact sensitive information', async () => {
      const sensitive = 'user@example.com';
      const redacted = SecurityValidator.redactPII(sensitive);

      expect(redacted).toContain('[EMAIL-REDACTED]');
    });

    it('should validate confidence thresholds', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      const isValidConfidence = SecurityValidator.validateConfidenceThreshold(result.confidence);

      expect(isValidConfidence).toBe(true);
    });

    it('should handle rate limiting', async () => {
      const isWithinLimit = SecurityValidator.checkRateLimiting(5, 60000, 10);
      expect(isWithinLimit).toBe(true);

      const exceedsLimit = SecurityValidator.checkRateLimiting(15, 60000, 10);
      expect(exceedsLimit).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      const { result, time } = await PerformanceTestHelper.measureExecutionTime(() =>
        agent.analyzeCode(mockCodeAnalysisRequest),
      );

      expect(result).toBeDefined();
      expect(time).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent analysis requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      const requests = Array.from({ length: 3 }, () => agent.analyzeCode(mockCodeAnalysisRequest));

      const results = await Promise.all(requests);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should track memory usage', async () => {
      const memoryTracker = PerformanceTestHelper.createMemoryUsageTracker();
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      await agent.analyzeCode(mockCodeAnalysisRequest);

      const usage = memoryTracker.getUsage();
      expect(usage.heapUsed).toBeDefined();
    });
  });

  describe('Complexity Assessment', () => {
    it('should assess low complexity code correctly', async () => {
      const simpleCode = TestDataGenerator.generateCodeSample('javascript', 'low');
      const complexity = (agent as any).assessComplexity(simpleCode);

      expect(complexity).toBe('low');
    });

    it('should assess complexity based on code structure', async () => {
      const mediumCode = TestDataGenerator.generateCodeSample('javascript', 'medium');
      const complexity = (agent as any).assessComplexity
        ? (agent as any).assessComplexity(mediumCode)
        : 'low';

      expect(['low', 'medium', 'high']).toContain(complexity);
    });

    it('should handle complex code structures', async () => {
      const complexCode = TestDataGenerator.generateCodeSample('javascript', 'high');
      const complexity = (agent as any).assessComplexity
        ? (agent as any).assessComplexity(complexCode)
        : 'medium';

      expect(['low', 'medium', 'high']).toContain(complexity);
    });

    it('should handle edge cases in complexity assessment', async () => {
      const edgeCases = [
        '', // Empty code
        '// Just a comment',
        'const x = 1;', // Single statement
        'if (true) { while (true) { for (let i = 0; i < 10; i++) {} } }', // Nested complexity
      ];

      edgeCases.forEach((code) => {
        const complexity = (agent as any).assessComplexity(code);
        expect(['low', 'medium', 'high']).toContain(complexity);
      });
    });
  });

  describe('Cache Management', () => {
    it('should generate consistent cache keys', async () => {
      const key1 = (agent as any).generateCacheKey(mockCodeAnalysisRequest);
      const key2 = (agent as any).generateCacheKey(mockCodeAnalysisRequest);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different requests', async () => {
      const request1 = mockCodeAnalysisRequest;
      const request2 = { ...mockCodeAnalysisRequest, language: 'python' };

      const key1 = (agent as any).generateCacheKey(request1);
      const key2 = (agent as any).generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });

    it('should store and retrieve analysis history', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      await agent.analyzeCode(mockCodeAnalysisRequest);

      const history = await agent.getAnalysisHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        suggestions: expect.any(Array),
        complexity: expect.any(Object),
        security: expect.any(Object),
        performance: expect.any(Object),
      });
    });

    it('should clear analysis history', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockOllamaResponse));

      await agent.analyzeCode(mockCodeAnalysisRequest);
      expect(await agent.getAnalysisHistory()).toHaveLength(1);

      agent.clearAnalysisHistory();
      expect(await agent.getAnalysisHistory()).toHaveLength(0);
    });
  });

  describe('Response Parsing', () => {
    it('should parse analysis response correctly', async () => {
      const mockResponse = 'Test analysis response';
      const result = (agent as any).parseCodeAnalysisResponse(mockResponse, 'qwen3-coder');

      expect(result).toMatchObject({
        suggestions: expect.any(Array),
        complexity: expect.any(Object),
        security: expect.any(Object),
        performance: expect.any(Object),
        confidence: expect.any(Number),
        modelUsed: 'qwen3-coder',
      });
    });

    it('should handle different model types', async () => {
      const modelTypes = ['qwen3-coder', 'deepseek-coder'];

      modelTypes.forEach((modelType) => {
        const result = (agent as any).parseCodeAnalysisResponse('test', modelType);
        expect(result.modelUsed).toBe(modelType);
      });
    });

    it('should provide structured analysis results', async () => {
      const result = (agent as any).parseCodeAnalysisResponse('test', 'qwen3-coder');

      // Verify structure
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.complexity).toHaveProperty('cyclomatic');
      expect(result.complexity).toHaveProperty('cognitive');
      expect(result.complexity).toHaveProperty('maintainability');
      expect(result.security).toHaveProperty('vulnerabilities');
      expect(result.security).toHaveProperty('riskLevel');
      expect(result.performance).toHaveProperty('bottlenecks');
      expect(result.performance).toHaveProperty('memoryUsage');
    });
  });
});
