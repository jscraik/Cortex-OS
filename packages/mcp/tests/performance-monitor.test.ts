/**
 * @file Performance Monitor Tests
 * @description TDD tests for MCP performance monitoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MCPPerformanceMonitor } from '../src/lib/performance-monitor.js';

describe('MCP Performance Monitor', () => {
  let monitor: MCPPerformanceMonitor;

  beforeEach(() => {
    monitor = new MCPPerformanceMonitor();
  });

  describe('Operation Tracking', () => {
    it('should track successful operation performance', async () => {
      const result = await monitor.trackOperation('test-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
      const summary = monitor.getSummary('test-op');
      expect(summary.totalOperations).toBe(1);
      expect(summary.successRate).toBe(100);
      expect(summary.averageResponseTime).toBeGreaterThanOrEqual(10);
    });

    it('should track failed operation performance', async () => {
      await expect(
        monitor.trackOperation('test-op', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      const summary = monitor.getSummary('test-op');
      expect(summary.totalOperations).toBe(1);
      expect(summary.successRate).toBe(0);
      expect(summary.errorCount).toBe(1);
    });
  });

  describe('Performance Summary', () => {
    it('should calculate accurate performance statistics', async () => {
      // Track multiple operations with known timing
      const timings = [5, 10, 15, 20, 25]; // ms

      for (const timing of timings) {
        await monitor.trackOperation('perf-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, timing));
          return 'ok';
        });
      }

      const summary = monitor.getSummary('perf-test');
      expect(summary.totalOperations).toBe(5);
      expect(summary.successRate).toBe(100);
      expect(summary.averageResponseTime).toBeGreaterThanOrEqual(15);
      expect(summary.p95ResponseTime).toBeGreaterThanOrEqual(20);
    });

    it('should handle empty metrics gracefully', () => {
      const summary = monitor.getSummary('non-existent');
      expect(summary.totalOperations).toBe(0);
      expect(summary.averageResponseTime).toBe(0);
      expect(summary.successRate).toBe(0);
    });
  });

  describe('Industrial Standards Validation', () => {
    it('should validate tools/list performance standards', async () => {
      // Simulate fast tools/list operation
      await monitor.trackOperation('tools/list', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return [];
      });

      const validation = monitor.validatePerformanceStandards('tools/list');
      expect(validation.compliant).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should detect performance violations', async () => {
      // Simulate slow tools/call operation
      await monitor.trackOperation('tools/call', async () => {
        await new Promise((resolve) => setTimeout(resolve, 150)); // Exceeds 50ms standard
        return 'result';
      });

      const validation = monitor.validatePerformanceStandards('tools/call');
      expect(validation.compliant).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
    });

    it('should handle unknown operations gracefully', () => {
      const validation = monitor.validatePerformanceStandards('unknown-operation');
      expect(validation.compliant).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('Metrics Management', () => {
    it('should provide metrics for time windows', async () => {
      await monitor.trackOperation('windowed-test', async () => 'result');

      // Get metrics from last second
      const windowMetrics = monitor.getMetricsWindow(1000);
      expect(windowMetrics.length).toBe(1);
      expect(windowMetrics[0].operation).toBe('windowed-test');
    });

    it('should clear all metrics', async () => {
      await monitor.trackOperation('clear-test', async () => 'result');
      expect(monitor.getSummary().totalOperations).toBe(1);

      monitor.clear();
      expect(monitor.getSummary().totalOperations).toBe(0);
    });
  });

  describe('MCP Operation Performance Standards', () => {
    const mcpOperations = [
      { name: 'tools/list', maxTime: 5 }, // Well within 10ms standard
      { name: 'tools/call', maxTime: 30 }, // Well within 50ms standard
      { name: 'resources/list', maxTime: 8 }, // Well within 15ms standard
      { name: 'resources/read', maxTime: 60 }, // Well within 100ms standard
      { name: 'prompts/list', maxTime: 5 }, // Well within 10ms standard
      { name: 'prompts/get', maxTime: 20 }, // Well within 30ms standard
      { name: 'initialize', maxTime: 2 }, // Well within 5ms standard
    ];

    mcpOperations.forEach(({ name, maxTime }) => {
      it(`should meet performance standards for ${name}`, async () => {
        await monitor.trackOperation(name, async () => {
          // Simulate optimized operation well within standards
          await new Promise((resolve) => setTimeout(resolve, maxTime));
          return 'success';
        });

        const validation = monitor.validatePerformanceStandards(name);
        if (!validation.compliant) {
          console.log(`Performance violations for ${name}:`, validation.violations);
        }
        expect(validation.compliant).toBe(true);
      });
    });
  });
});
