/**
 * @fileoverview Test suite for Execution Tool Layer
 * @module ExecutionToolLayer.test
 * @description TDD tests for nO architecture execution tool layer - Phase 3.3
 * @author brAInwav Development Team
 * @version 3.3.0
 * @since 2024-12-09
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExecutionToolLayer } from '../execution-tool-layer';

describe('ExecutionToolLayer', () => {
  let executionLayer: ExecutionToolLayer;

  beforeEach(() => {
    executionLayer = new ExecutionToolLayer();
  });

  afterEach(async () => {
    await executionLayer.shutdown();
  });

  describe('Execution Tool Layer Initialization', () => {
    it('should provide direct execution capabilities', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'read',
        path: '/test'
      });
      expect(result.success).toBeTruthy();
      expect(result.operation).toBe('read');
      expect(result.path).toBe('/test');
    });

    it('should initialize with execution-specific tools', () => {
      const availableTools = executionLayer.getAvailableTools();
      expect(availableTools).toContain('file-system-operation');
      expect(availableTools).toContain('process-management');
      expect(availableTools).toContain('network-operation');
      expect(availableTools).toContain('tool-chain-executor');
      expect(availableTools).toContain('resource-manager');
    });

    it('should have correct layer type and capabilities', () => {
      expect(executionLayer.getLayerType()).toBe('execution');
      expect(executionLayer.getCapabilities()).toContain('file-system');
      expect(executionLayer.getCapabilities()).toContain('process-management');
      expect(executionLayer.getCapabilities()).toContain('network-operations');
    });
  });

  describe('File System Operations', () => {
    it('should handle file read operations', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'read',
        path: '/tmp/test.txt',
        encoding: 'utf8',
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('read');
      expect(result.path).toBe('/tmp/test.txt');
      expect(result.metadata.encoding).toBe('utf8');
      expect(result.content).toBeDefined();
    });

    it('should handle file write operations', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'write',
        path: '/tmp/output.txt',
        content: 'Hello, World!',
        options: { overwrite: true },
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('write');
      expect(result.path).toBe('/tmp/output.txt');
      expect(result.metadata.bytesWritten).toBeGreaterThan(0);
      expect(result.metadata.overwrite).toBe(true);
    });

    it('should handle directory operations', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'list',
        path: '/tmp',
        options: { recursive: false, includeHidden: false },
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('list');
      expect(result.items).toBeInstanceOf(Array);
      expect(result.metadata.totalItems).toBeGreaterThanOrEqual(0);
    });

    it('should validate file system paths for security', async () => {
      await expect(
        executionLayer.invoke('file-system-operation', {
          operation: 'read',
          path: '../../etc/passwd', // Path traversal attempt
        })
      ).rejects.toThrow('Invalid file path: security violation detected');
    });

    it('should handle file operations with permissions', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'chmod',
        path: '/tmp/test.txt',
        permissions: '644',
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('chmod');
      expect(result.metadata.oldPermissions).toBeDefined();
      expect(result.metadata.newPermissions).toBe('644');
    });
  });

  describe('Process Management', () => {
    it('should execute system commands safely', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'execute',
        command: 'echo',
        args: ['Hello', 'World'],
        options: { timeout: 5000, shell: false },
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('execute');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello World');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle process monitoring', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'monitor',
        processId: 1234,
        metrics: ['cpu', 'memory', 'status'],
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('monitor');
      expect(result.processInfo).toEqual(
        expect.objectContaining({
          pid: 1234,
          status: expect.any(String),
          cpu: expect.any(Number),
          memory: expect.any(Number),
        })
      );
    });

    it('should manage process lifecycle', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'start',
        command: 'sleep',
        args: ['10'],
        options: { detached: true, background: true },
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('start');
      expect(result.processId).toBeGreaterThan(0);
      expect(result.status).toBe('running');
    });

    it('should validate command execution for security', async () => {
      await expect(
        executionLayer.invoke('process-management', {
          action: 'execute',
          command: 'rm -rf /', // Dangerous command
          args: [],
        })
      ).rejects.toThrow('Command execution denied: security violation');
    });

    it('should handle process termination', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'terminate',
        processId: 1234,
        signal: 'SIGTERM',
        graceful: true,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('terminate');
      expect(result.processId).toBe(1234);
      expect(result.signal).toBe('SIGTERM');
      expect(result.terminated).toBe(true);
    });
  });

  describe('Network Operations', () => {
    it('should handle HTTP requests', async () => {
      const result = await executionLayer.invoke('network-operation', {
        type: 'http',
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('http');
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.data).toBeDefined();
    });

    it('should handle network connectivity checks', async () => {
      const result = await executionLayer.invoke('network-operation', {
        type: 'ping',
        host: 'google.com',
        count: 3,
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('ping');
      expect(result.packetsTransmitted).toBe(3);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.packetLoss).toBeLessThanOrEqual(100);
    });

    it('should perform DNS lookups', async () => {
      const result = await executionLayer.invoke('network-operation', {
        type: 'dns',
        hostname: 'example.com',
        recordType: 'A',
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('dns');
      expect(result.hostname).toBe('example.com');
      expect(result.records).toBeInstanceOf(Array);
      expect(result.records.length).toBeGreaterThan(0);
    });

    it('should validate network operations for security', async () => {
      await expect(
        executionLayer.invoke('network-operation', {
          type: 'http',
          method: 'GET',
          url: 'file:///etc/passwd', // Local file access attempt
        })
      ).rejects.toThrow('Network operation denied: invalid URL scheme');
    });
  });

  describe('Tool Chain Execution', () => {
    it('should execute tool chains with dependencies', async () => {
      const toolChain = {
        id: 'data-processing-chain',
        steps: [
          {
            id: 'read-file',
            tool: 'file-system-operation',
            input: { operation: 'read', path: '/tmp/input.txt' },
          },
          {
            id: 'process-data',
            tool: 'process-management',
            input: { action: 'execute', command: 'sort' },
            dependencies: ['read-file'],
          },
          {
            id: 'write-output',
            tool: 'file-system-operation',
            input: { operation: 'write', path: '/tmp/output.txt' },
            dependencies: ['process-data'],
          },
        ],
      };

      const result = await executionLayer.invoke('tool-chain-executor', {
        chain: toolChain,
        parallelExecution: false,
        failFast: true,
      });

      expect(result.success).toBe(true);
      expect(result.chainId).toBe('data-processing-chain');
      expect(result.stepsExecuted).toBe(3);
      expect(result.stepsSuccessful).toBe(3);
      expect(result.executionOrder).toEqual(['read-file', 'process-data', 'write-output']);
    });

    it('should handle parallel tool chain execution', async () => {
      const parallelChain = {
        id: 'parallel-chain',
        steps: [
          {
            id: 'task-1',
            tool: 'process-management',
            input: { action: 'execute', command: 'echo', args: ['task1'] },
          },
          {
            id: 'task-2',
            tool: 'process-management',
            input: { action: 'execute', command: 'echo', args: ['task2'] },
          },
          {
            id: 'merge',
            tool: 'file-system-operation',
            input: { operation: 'write', path: '/tmp/merged.txt' },
            dependencies: ['task-1', 'task-2'],
          },
        ],
      };

      const result = await executionLayer.invoke('tool-chain-executor', {
        chain: parallelChain,
        parallelExecution: true,
        maxConcurrency: 2,
      });

      expect(result.success).toBe(true);
      expect(result.parallelSteps).toBe(2);
      expect(result.totalExecutionTime).toBeLessThan(
        result.steps['task-1'].executionTime + result.steps['task-2'].executionTime
      );
    });

    it('should handle tool chain failures with rollback', async () => {
      const failingChain = {
        id: 'failing-chain',
        steps: [
          {
            id: 'create-file',
            tool: 'file-system-operation',
            input: { operation: 'write', path: '/tmp/test.txt', content: 'test' },
            rollback: { operation: 'delete', path: '/tmp/test.txt' },
          },
          {
            id: 'failing-step',
            tool: 'process-management',
            input: { action: 'execute', command: 'false' }, // Always fails
            dependencies: ['create-file'],
          },
        ],
      };

      const result = await executionLayer.invoke('tool-chain-executor', {
        chain: failingChain,
        enableRollback: true,
        failFast: true,
      });

      expect(result.success).toBe(false);
      expect(result.stepsExecuted).toBe(2);
      expect(result.stepsSuccessful).toBe(1);
      expect(result.rollbackExecuted).toBe(true);
      expect(result.rollbackSteps).toHaveLength(1);
    });
  });

  describe('Resource Management', () => {
    it('should monitor system resources', async () => {
      const result = await executionLayer.invoke('resource-manager', {
        action: 'monitor',
        resources: ['cpu', 'memory', 'disk', 'network'],
        interval: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('monitor');
      expect(result.resources).toEqual(
        expect.objectContaining({
          cpu: expect.objectContaining({
            usage: expect.any(Number),
            cores: expect.any(Number),
          }),
          memory: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          }),
          disk: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          }),
        })
      );
    });

    it('should enforce resource limits', async () => {
      const result = await executionLayer.invoke('resource-manager', {
        action: 'enforce-limits',
        limits: {
          maxMemory: '512MB',
          maxCpu: '50%',
          maxDiskIo: '100MB/s',
        },
        processId: 1234,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('enforce-limits');
      expect(result.processId).toBe(1234);
      expect(result.limitsApplied).toEqual(
        expect.objectContaining({
          memory: '512MB',
          cpu: '50%',
          diskIo: '100MB/s',
        })
      );
    });

    it('should allocate and deallocate resources', async () => {
      const allocResult = await executionLayer.invoke('resource-manager', {
        action: 'allocate',
        resourceType: 'memory',
        amount: '256MB',
        priority: 'high',
      });

      expect(allocResult.success).toBe(true);
      expect(allocResult.action).toBe('allocate');
      expect(allocResult.resourceId).toBeDefined();
      expect(allocResult.allocated.amount).toBe('256MB');

      const deallocResult = await executionLayer.invoke('resource-manager', {
        action: 'deallocate',
        resourceId: allocResult.resourceId,
      });

      expect(deallocResult.success).toBe(true);
      expect(deallocResult.action).toBe('deallocate');
      expect(deallocResult.deallocated).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle execution timeouts gracefully', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'execute',
        command: 'sleep',
        args: ['10'],
        options: { timeout: 100 }, // Very short timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.terminated).toBe(true);
      expect(result.signal).toBe('SIGKILL');
    });

    it('should provide detailed error information', async () => {
      const result = await executionLayer.invoke('file-system-operation', {
        operation: 'read',
        path: '/nonexistent/file.txt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe('ENOENT');
      expect(result.errorCategory).toBe('file-system');
      expect(result.recoverable).toBe(false);
    });

    it('should implement retry mechanisms for transient failures', async () => {
      const result = await executionLayer.invoke('network-operation', {
        type: 'http',
        method: 'GET',
        url: 'https://unreliable-api.example.com/data',
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      });

      expect(result.retryAttempts).toBeGreaterThan(0);
      expect(result.retryAttempts).toBeLessThanOrEqual(3);
      expect(result.totalTime).toBeGreaterThan(1000);
    });
  });

  describe('Security and Validation', () => {
    it('should validate all tool inputs', async () => {
      await expect(
        executionLayer.invoke('file-system-operation', {
          operation: 'invalid-operation',
          path: '/tmp/test.txt',
        })
      ).rejects.toThrow('Invalid operation: invalid-operation');
    });

    it('should enforce security policies', async () => {
      const result = await executionLayer.invoke('process-management', {
        action: 'execute',
        command: 'ls',
        args: ['-la', '/'],
        securityPolicy: 'restricted',
      });

      expect(result.securityChecks).toEqual(
        expect.objectContaining({
          commandWhitelisted: true,
          argumentsValidated: true,
          pathAccessAllowed: true,
        })
      );
    });

    it('should log all execution activities for audit', async () => {
      const auditEvents: any[] = [];
      executionLayer.on('execution-audit', (event) => auditEvents.push(event));

      await executionLayer.invoke('file-system-operation', {
        operation: 'read',
        path: '/tmp/audit-test.txt',
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toEqual(
        expect.objectContaining({
          toolId: 'file-system-operation',
          layerType: 'execution',
          operation: 'read',
          path: '/tmp/audit-test.txt',
          timestamp: expect.any(Date),
          userId: expect.any(String),
          success: expect.any(Boolean),
        })
      );
    });
  });

  describe('Performance and Optimization', () => {
    it('should track execution performance metrics', async () => {
      // Execute multiple operations
      await executionLayer.invoke('file-system-operation', { operation: 'read', path: '/tmp/test1.txt' });
      await executionLayer.invoke('process-management', { action: 'execute', command: 'echo', args: ['test'] });
      await executionLayer.invoke('network-operation', { type: 'ping', host: 'localhost', count: 1 });

      const metrics = executionLayer.getExecutionMetrics();
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.toolUsage).toEqual(
        expect.objectContaining({
          'file-system-operation': 1,
          'process-management': 1,
          'network-operation': 1,
        })
      );
    });

    it('should optimize resource usage during execution', async () => {
      const result = await executionLayer.invoke('tool-chain-executor', {
        chain: {
          id: 'resource-optimized-chain',
          steps: Array.from({ length: 10 }, (_, i) => ({
            id: `step-${i}`,
            tool: 'process-management',
            input: { action: 'execute', command: 'echo', args: [`step-${i}`] },
          })),
        },
        resourceOptimization: true,
        maxConcurrency: 3,
      });

      expect(result.success).toBe(true);
      expect(result.resourceOptimization.enabled).toBe(true);
      expect(result.resourceOptimization.maxConcurrency).toBe(3);
      expect(result.resourceOptimization.peakMemoryUsage).toBeDefined();
    });
  });

  describe('Integration with Tool Layer', () => {
    it('should properly integrate with base tool layer', () => {
      expect(executionLayer.getLayerType()).toBe('execution');
      expect(executionLayer.getCapabilities()).toEqual(
        expect.arrayContaining(['file-system', 'process-management', 'network-operations'])
      );
    });

    it('should emit proper tool execution events', async () => {
      const events: any[] = [];
      executionLayer.on('tool-executed', (event) => events.push(event));

      await executionLayer.invoke('file-system-operation', { operation: 'read', path: '/tmp/test.txt' });

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          toolId: 'file-system-operation',
          layerType: 'execution',
          success: expect.any(Boolean),
          executionTime: expect.any(Number),
        })
      );
    });
  });
});
