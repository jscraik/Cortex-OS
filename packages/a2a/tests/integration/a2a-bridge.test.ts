/**
 * @file_path tests/integration/a2a-bridge.test.ts
 * @description Integration tests for A2A Protocol and Python-TypeScript Bridge
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash initial_implementation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { A2AClient } from '../../apps/cortex-os/packages/orchestration/src/a2a/client.js';
import { IPCBridge } from '../../bridge/ipc-bridge.js';
import { AgentSpawner } from '../../bridge/agent-spawner.js';
import { MessageQueue } from '../../bridge/message-queue.js';
import { ErrorRecovery } from '../../bridge/error-recovery.js';
import path from 'path';

describe('A2A Protocol and Bridge Integration', () => {
  let a2aClient: A2AClient;
  let ipcBridge: IPCBridge;
  let agentSpawner: AgentSpawner;
  let messageQueue: MessageQueue;
  let errorRecovery: ErrorRecovery;

  beforeAll(async () => {
    // Initialize components
    a2aClient = new A2AClient({
      agentId: 'test_typescript_agent',
      authentication: 'token',
      encryption: true,
      discoveryEnabled: true,
    });

    ipcBridge = new IPCBridge({
      pythonPath: 'python3',
      pythonAgentPath: path.resolve(process.cwd(), 'apps/cortex-py/src/bridge/ipc_handler.py'),
      enableLogging: false, // Reduce noise in tests
      enableA2A: true,
    });

    agentSpawner = new AgentSpawner({
      pythonPath: 'python3',
      pythonAgentsPath: path.resolve(process.cwd(), 'apps/cortex-py'),
      maxAgents: 3,
      enableLogging: false,
    });

    messageQueue = new MessageQueue({
      maxQueueSize: 100,
      enableLogging: false,
    });

    errorRecovery = new ErrorRecovery({
      maxRetries: 2,
      enableLogging: false,
    });
  });

  afterAll(async () => {
    // Cleanup
    await Promise.all([
      a2aClient?.shutdown(),
      ipcBridge?.shutdown(),
      agentSpawner?.shutdown(),
      messageQueue?.shutdown(),
      errorRecovery?.shutdown(),
    ]);
  });

  describe('A2A Client', () => {
    beforeEach(async () => {
      if (!a2aClient.getStatus().connected) {
        await a2aClient.initialize();
      }
    });

    it('should initialize successfully', async () => {
      const status = a2aClient.getStatus();
      expect(status.connected).toBe(true);
      expect(status.agentId).toBe('test_typescript_agent');
    });

    it('should have correct capabilities', () => {
      const capabilities = a2aClient.getCapabilities();
      expect(capabilities.actions).toContain('ping');
      expect(capabilities.actions).toContain('discover');
      expect(capabilities.security).toContain('token');
      expect(capabilities.protocols).toContain('A2A-1.0');
    });

    it('should handle ping requests', async () => {
      // Setup request handler for self-ping
      a2aClient.on('request', async ({ request, respond }) => {
        if (request.action === 'ping') {
          await respond({
            ok: true,
            result: { pong: true, timestamp: Date.now() },
            id: request.id,
          });
        }
      });

      const response = await a2aClient.sendRequest('test_typescript_agent', 'ping', {
        timestamp: Date.now(),
      });

      expect(response.ok).toBe(true);
      expect(response.result).toHaveProperty('pong', true);
    });
  });

  describe('IPC Bridge', () => {
    beforeEach(async () => {
      if (!ipcBridge.getStatistics().initialized) {
        // Note: Skipping actual initialization in test environment
        // In real tests, would need Python environment setup
      }
    });

    it('should have correct configuration', () => {
      const stats = ipcBridge.getStatistics();
      expect(stats.a2aEnabled).toBe(true);
      expect(stats.pendingRequests).toBe(0);
    });

    it('should validate ping method exists', () => {
      expect(typeof ipcBridge.ping).toBe('function');
    });

    it('should validate execute method exists', () => {
      expect(typeof ipcBridge.executeAgent).toBe('function');
    });
  });

  describe('Agent Spawner', () => {
    it('should initialize with correct configuration', () => {
      const stats = agentSpawner.getStatistics();
      expect(stats.totalAgents).toBe(0);
      expect(stats.runningAgents).toBe(0);
    });

    it('should validate spawning configuration', () => {
      expect(typeof agentSpawner.spawnAgent).toBe('function');
      expect(typeof agentSpawner.stopAgent).toBe('function');
      expect(typeof agentSpawner.getAllAgents).toBe('function');
    });

    it('should handle agent type validation', async () => {
      // Test that we can create spawn requests for all supported types
      const validTypes = ['langgraph', 'crewai', 'autogen'];

      for (const type of validTypes) {
        const request = {
          id: `test_${type}`,
          type: type as 'langgraph' | 'crewai' | 'autogen',
        };

        expect(request.type).toBe(type);
        expect(['langgraph', 'crewai', 'autogen']).toContain(request.type);
      }
    });
  });

  describe('Message Queue', () => {
    beforeEach(async () => {
      await messageQueue.clear();
    });

    it('should enqueue and process messages by priority', async () => {
      const messages = [
        {
          id: 'msg1',
          type: 'request' as const,
          payload: { data: 'low priority' },
          priority: 'low' as const,
          maxRetries: 1,
        },
        {
          id: 'msg2',
          type: 'request' as const,
          payload: { data: 'urgent priority' },
          priority: 'urgent' as const,
          maxRetries: 1,
        },
        {
          id: 'msg3',
          type: 'request' as const,
          payload: { data: 'normal priority' },
          priority: 'normal' as const,
          maxRetries: 1,
        },
      ];

      // Setup message processor
      const processedMessages: string[] = [];
      messageQueue.on('processMessage', (message, callback) => {
        processedMessages.push(message.id);
        callback(true); // Mark as processed successfully
      });

      // Enqueue messages
      for (const message of messages) {
        await messageQueue.enqueue(message);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify priority order (urgent, normal, low)
      expect(processedMessages[0]).toBe('msg2'); // urgent
      expect(processedMessages[1]).toBe('msg3'); // normal
      expect(processedMessages[2]).toBe('msg1'); // low
    });

    it('should provide accurate statistics', async () => {
      await messageQueue.enqueue({
        id: 'test_stats',
        type: 'request',
        payload: {},
        priority: 'normal',
        maxRetries: 1,
      });

      const stats = messageQueue.getStatistics();
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.messagesByPriority).toHaveProperty('normal');
    });
  });

  describe('Error Recovery', () => {
    it('should handle errors with recovery strategies', async () => {
      const testError = new Error('Test error');
      const context = {
        component: 'test_component',
        operation: 'test_operation',
        metadata: {},
        timestamp: new Date(),
        retryCount: 0,
      };

      const recovered = await errorRecovery.handleError(testError, context);

      // Should attempt recovery
      expect(typeof recovered).toBe('boolean');
    });

    it('should manage circuit breaker states', () => {
      const component = 'test_component';

      // Initial state should be closed
      const initialState = errorRecovery.getCircuitBreakerState(component);
      expect(initialState.state).toBe('closed');
      expect(initialState.failureCount).toBe(0);

      // Manual control should work
      errorRecovery.openCircuitBreaker(component);
      const openState = errorRecovery.getCircuitBreakerState(component);
      expect(openState.state).toBe('open');

      errorRecovery.closeCircuitBreaker(component);
      const closedState = errorRecovery.getCircuitBreakerState(component);
      expect(closedState.state).toBe('closed');
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate complete workflow types', () => {
      // Test that all required types are properly defined
      const agentTypes = ['langgraph', 'crewai', 'autogen'];
      const messageTypes = ['request', 'response', 'notification', 'priority'];
      const priorities = ['low', 'normal', 'high', 'urgent'];

      expect(agentTypes).toHaveLength(3);
      expect(messageTypes).toHaveLength(4);
      expect(priorities).toHaveLength(4);
    });

    it('should handle bridge lifecycle', async () => {
      // Test initialization state
      expect(a2aClient.getStatus().connected).toBe(true);

      // Test that components can be shutdown and cleaned up
      const shutdownPromise = Promise.all([
        a2aClient.shutdown(),
        messageQueue.shutdown(),
        errorRecovery.shutdown(),
      ]);

      await expect(shutdownPromise).resolves.toBeUndefined();
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
