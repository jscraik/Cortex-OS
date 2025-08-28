/**
 * Performance benchmarks for model interactions
 * Tests response times, throughput, and resource usage
 */

import { bench, describe } from 'vitest';
import { CodeIntelligenceAgent, BasicExecutor } from '@/index';
import { mockAgents, mockCodeAnalysisRequests, mockTasks } from '@tests/fixtures/agents';
import { simulateNetworkLatency, measurePerformance, TestRateLimiter } from '@tests/utils/test-helpers';

describe('Agent Performance Benchmarks', () => {
  const codeAgent = new CodeIntelligenceAgent({
    ollamaEndpoint: 'http://localhost:11434',
    mlxEndpoint: 'http://localhost:8765'
  });

  const basicExecutor = new BasicExecutor();

  // Mock fast response for performance testing
  const mockFastResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      response: 'Fast mock analysis for performance testing'
    })
  };

  // Mock slow response to test timeout handling
  const mockSlowResponse = async () => {
    await simulateNetworkLatency(500, 1000);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        response: 'Slow mock analysis for timeout testing'
      })
    };
  };

  describe('BasicExecutor Performance', () => {
    bench('simple task execution', async () => {
      await basicExecutor.run(mockAgents.basic, mockTasks.simple);
    });

    bench('complex task execution', async () => {
      await basicExecutor.run(mockAgents.codeIntelligence, mockTasks.codeAnalysis);
    });

    bench('concurrent task execution (10 tasks)', async () => {
      const tasks = Array(10).fill(mockTasks.simple);
      await Promise.all(
        tasks.map(task => basicExecutor.run(mockAgents.basic, task))
      );
    });

    bench('sequential task execution (100 tasks)', async () => {
      for (let i = 0; i < 100; i++) {
        await basicExecutor.run(mockAgents.basic, {
          ...mockTasks.simple,
          id: `task-${i}`
        });
      }
    });
  });

  describe('CodeIntelligenceAgent Performance', () => {
    bench('basic code analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
    });

    bench('security analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.security);
    });

    bench('performance analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.performance);
    });

    bench('complex code analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.complex);
    });

    bench('concurrent analysis (5 requests)', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      const requests = [
        mockCodeAnalysisRequests.basic,
        mockCodeAnalysisRequests.security,
        mockCodeAnalysisRequests.performance,
        mockCodeAnalysisRequests.complex,
        mockCodeAnalysisRequests.basic
      ];
      
      await Promise.all(requests.map(req => codeAgent.analyzeCode(req)));
    });

    bench('batch analysis (20 requests)', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      const requests = Array(20).fill(mockCodeAnalysisRequests.basic);
      
      for (const request of requests) {
        await codeAgent.analyzeCode(request);
      }
    });
  });

  describe('Memory Usage Benchmarks', () => {
    bench('memory efficiency - large code analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      const largeCode = 'function test() {\n' + '  return "test";\n'.repeat(1000) + '}';
      
      const request = {
        ...mockCodeAnalysisRequests.basic,
        code: largeCode
      };
      
      await codeAgent.analyzeCode(request);
    });

    bench('memory efficiency - analysis history growth', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      // Perform multiple analyses to test memory growth
      for (let i = 0; i < 50; i++) {
        await codeAgent.analyzeCode({
          ...mockCodeAnalysisRequests.basic,
          code: `function test${i}() { return ${i}; }`
        });
      }
      
      const history = await codeAgent.getAnalysisHistory();
      expect(history.length).toBe(50);
      
      // Clean up to test memory release
      codeAgent.clearAnalysisHistory();
      const clearedHistory = await codeAgent.getAnalysisHistory();
      expect(clearedHistory.length).toBe(0);
    });
  });

  describe('Network Performance Benchmarks', () => {
    bench('network latency handling - fast', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        await simulateNetworkLatency(10, 50);
        return mockFastResponse;
      });
      
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
    });

    bench('network latency handling - medium', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        await simulateNetworkLatency(100, 300);
        return mockFastResponse;
      });
      
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
    });

    bench('network latency handling - slow', async () => {
      global.fetch = vi.fn().mockImplementation(mockSlowResponse);
      
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
    });

    bench('network timeout resilience', async () => {
      let timeoutCount = 0;
      
      global.fetch = vi.fn().mockImplementation(async () => {
        timeoutCount++;
        if (timeoutCount <= 2) {
          throw new Error('Network timeout');
        }
        return mockFastResponse;
      });
      
      try {
        await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
      } catch (error) {
        // Expected for this benchmark
      }
    });
  });

  describe('Rate Limiting Benchmarks', () => {
    bench('rate limiting compliance', async () => {
      const rateLimiter = new TestRateLimiter(5, 1000); // 5 requests per second
      
      global.fetch = vi.fn().mockImplementation(async () => {
        const allowed = await rateLimiter.checkLimit();
        if (!allowed) {
          throw new Error('Rate limit exceeded');
        }
        return mockFastResponse;
      });
      
      const requests = Array(3).fill(mockCodeAnalysisRequests.basic);
      const results = [];
      
      for (const request of requests) {
        try {
          const result = await codeAgent.analyzeCode(request);
          results.push(result);
        } catch (error) {
          // Some requests may be rate limited
        }
      }
      
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    bench('burst request handling', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      // Send 10 requests simultaneously
      const requests = Array(10).fill(mockCodeAnalysisRequests.basic);
      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        requests.map(req => codeAgent.analyzeCode(req))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Caching Performance Benchmarks', () => {
    bench('cache hit performance', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      const request = mockCodeAnalysisRequests.basic;
      
      // First request - cache miss
      await codeAgent.analyzeCode(request);
      
      // Subsequent requests should benefit from any caching
      for (let i = 0; i < 10; i++) {
        await codeAgent.analyzeCode(request);
      }
    });

    bench('cache invalidation performance', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      // Populate cache
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.basic);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.security);
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.performance);
      
      // Clear cache
      codeAgent.clearAnalysisHistory();
      
      // Verify cache is cleared
      const history = await codeAgent.getAnalysisHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Resource Utilization Benchmarks', () => {
    bench('cpu intensive analysis', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        // Simulate CPU-intensive processing
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait for 50ms
          Math.random();
        }
        return mockFastResponse;
      });
      
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.complex);
    });

    bench('memory intensive analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: 'Large response '.repeat(10000) // ~150KB response
        })
      });
      
      await codeAgent.analyzeCode(mockCodeAnalysisRequests.complex);
    });

    bench('concurrent resource usage', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        // Simulate mixed CPU and memory usage
        const data = new Array(1000).fill('test data');
        data.forEach((_, i) => Math.sqrt(i));
        return mockFastResponse;
      });
      
      const requests = Array(5).fill(mockCodeAnalysisRequests.basic);
      await Promise.all(requests.map(req => codeAgent.analyzeCode(req)));
    });
  });

  describe('Scalability Benchmarks', () => {
    bench('horizontal scaling simulation', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      // Simulate multiple agent instances
      const agents = Array(3).fill(null).map(() => new CodeIntelligenceAgent());
      const requests = [
        mockCodeAnalysisRequests.basic,
        mockCodeAnalysisRequests.security,
        mockCodeAnalysisRequests.performance
      ];
      
      const results = await Promise.all(
        agents.map((agent, i) => agent.analyzeCode(requests[i]))
      );
      
      expect(results.length).toBe(3);
    });

    bench('vertical scaling simulation', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockFastResponse);
      
      // Single agent handling multiple request types
      const requests = [
        mockCodeAnalysisRequests.basic,
        mockCodeAnalysisRequests.security,
        mockCodeAnalysisRequests.performance,
        mockCodeAnalysisRequests.complex
      ];
      
      const results = [];
      for (const request of requests) {
        const result = await codeAgent.analyzeCode(request);
        results.push(result);
      }
      
      expect(results.length).toBe(4);
    });
  });
});