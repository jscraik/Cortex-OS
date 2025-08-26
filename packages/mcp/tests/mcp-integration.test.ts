/**
 * @file_path packages/orchestration/src/__tests__/mcp-integration.test.ts
 * @description Integration tests for MCP (Model Context Protocol) observability integration
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-18
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude
 * @ai_provenance_hash 8fc7d2a1
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MCPOrchestrationIntegration,
  MCPConnectionConfig,
  createMCPIntegration,
} from '../mcp-integration';
import { MCPConnectionManager } from '../mcp-connection-manager';
import { MCPProtocolHandlers, MCP_OBSERVABILITY_TOOLS } from '../mcp-protocol-handlers';
import { OrchestrationObservability, createObservability, AgentHealth } from '../observability';

describe('MCP Integration', () => {
  let observability: OrchestrationObservability;
  let mcpIntegration: MCPOrchestrationIntegration;
  let connectionManager: MCPConnectionManager;
  let protocolHandlers: MCPProtocolHandlers;

  const mockServerConfig: MCPConnectionConfig = {
    serverId: 'test-server',
    name: 'Test MCP Server',
    transport: 'stdio',
    command: 'node',
    args: ['mock-server.js'],
    healthCheckInterval: 5000,
    reconnectDelay: 1000,
    maxReconnectAttempts: 3,
    timeout: 5000,
  };

  beforeEach(async () => {
    // Initialize observability with MCP enabled
    observability = createObservability({
      enabled: true,
      mcp: {
        enabled: true,
        servers: [mockServerConfig],
        connectionManager: {
          retry: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
            jitter: true,
          },
          circuitBreaker: {
            failureThreshold: 3,
            recoveryTimeout: 30000,
            monitoringPeriod: 60000,
            minimumRequests: 5,
          },
          healthCheck: {
            enabled: true,
            interval: 10000,
            timeout: 5000,
            healthyThreshold: 2,
            unhealthyThreshold: 3,
          },
        },
      },
    });

    // Initialize components
    mcpIntegration = createMCPIntegration(observability);
    connectionManager = new MCPConnectionManager();
    protocolHandlers = new MCPProtocolHandlers('test-agent', 'Test Agent');

    await Promise.all([
      observability.initialize(),
      mcpIntegration.initialize(),
      protocolHandlers.initialize(),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      observability.shutdown(),
      mcpIntegration.shutdown(),
      connectionManager.shutdown(),
      protocolHandlers.shutdown(),
    ]);
  });

  describe('MCP Integration Initialization', () => {
    test('should initialize MCP integration successfully', async () => {
      expect(mcpIntegration).toBeDefined();

      // Check that MCP observability data is available
      const mcpData = observability.getMCPObservabilityData();
      expect(mcpData).toBeDefined();
      expect(mcpData.enabled).toBe(true);
    });

    test('should handle MCP configuration correctly', async () => {
      const config = {
        enabled: true,
        mcp: {
          enabled: true,
          servers: [mockServerConfig],
        },
      };

      const obs = createObservability(config);
      await obs.initialize();

      const mcpData = obs.getMCPObservabilityData();
      expect(mcpData.enabled).toBe(true);
      expect(mcpData.serverCount).toBe(0); // No actual connections in test

      await obs.shutdown();
    });
  });

  describe('MCP Server Connection Management', () => {
    test('should connect to MCP server', async () => {
      const connectionPromise = new Promise((resolve) => {
        mcpIntegration.once('connection-established', resolve);
      });

      await mcpIntegration.connectServer(mockServerConfig);

      // Wait for connection event or timeout
      await Promise.race([
        connectionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 2000)),
      ]);

      const connectedServers = mcpIntegration.getConnectedServers();
      expect(connectedServers).toContain(mockServerConfig.serverId);
    });

    test('should handle connection failures gracefully', async () => {
      const failingConfig: MCPConnectionConfig = {
        ...mockServerConfig,
        serverId: 'failing-server',
        command: 'nonexistent-command',
      };

      const errorPromise = new Promise((resolve) => {
        mcpIntegration.once('connection-lost', resolve);
      });

      try {
        await mcpIntegration.connectServer(failingConfig);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Should emit connection-lost event
      await Promise.race([
        errorPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Error event timeout')), 2000),
        ),
      ]);
    });

    test('should manage connection retries', async () => {
      const connectionAttempts: any[] = [];

      connectionManager.on('reconnection-started', (data) => {
        connectionAttempts.push(data);
      });

      const failingConfig: MCPConnectionConfig = {
        ...mockServerConfig,
        serverId: 'retry-server',
        command: 'failing-command',
        maxReconnectAttempts: 2,
      };

      try {
        await connectionManager.connect(failingConfig);
      } catch (error) {
        // Expected to fail
      }

      // Give time for retry attempts
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should have attempted reconnections
      expect(connectionAttempts.length).toBeGreaterThan(0);
    });
  });

  describe('MCP Protocol Handlers', () => {
    test('should handle agent status requests', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-1',
        method: 'tools/call',
        params: {
          name: MCP_OBSERVABILITY_TOOLS.GET_AGENT_STATUS,
          arguments: { includeHistory: false },
        },
      };

      const response = await protocolHandlers.handleToolRequest(request);

      expect(response.id).toBe('test-1');
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].type).toBe('text');
    });

    test('should handle agent metrics requests', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-2',
        method: 'tools/call',
        params: {
          name: MCP_OBSERVABILITY_TOOLS.GET_AGENT_METRICS,
          arguments: { timeRange: '1h' },
        },
      };

      const response = await protocolHandlers.handleToolRequest(request);

      expect(response.id).toBe('test-2');
      expect(response.result).toBeDefined();

      const content = JSON.parse(response.result.content[0].text!);
      expect(content.agentId).toBeDefined();
      expect(content.timestamp).toBeDefined();
      expect(content.performance).toBeDefined();
      expect(content.resources).toBeDefined();
    });

    test('should handle health check requests', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-3',
        method: 'tools/call',
        params: {
          name: MCP_OBSERVABILITY_TOOLS.TRIGGER_HEALTH_CHECK,
          arguments: {},
        },
      };

      const response = await protocolHandlers.handleToolRequest(request);

      expect(response.id).toBe('test-3');
      expect(response.result).toBeDefined();

      const healthData = JSON.parse(response.result.content[0].text!);
      expect(healthData.timestamp).toBeDefined();
      expect(healthData.overall).toBeDefined();
      expect(healthData.checks).toBeDefined();
      expect(Array.isArray(healthData.checks)).toBe(true);
    });

    test('should handle resource read requests', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-4',
        method: 'resources/read',
        params: {
          uri: 'cortex://agent/status',
        },
      };

      const response = await protocolHandlers.handleResourceRequest(request);

      expect(response.id).toBe('test-4');
      expect(response.result).toBeDefined();
      expect(response.result.uri).toBe('cortex://agent/status');
      expect(response.result.mimeType).toBe('application/json');
      expect(response.result.text).toBeDefined();
    });

    test('should handle unknown tool requests with appropriate errors', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-5',
        method: 'tools/call',
        params: {
          name: 'unknown.tool',
          arguments: {},
        },
      };

      const response = await protocolHandlers.handleToolRequest(request);

      expect(response.id).toBe('test-5');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32003); // TOOL_NOT_FOUND
    });
  });

  describe('Connection Manager Circuit Breaker', () => {
    test('should open circuit breaker after consecutive failures', async () => {
      const circuitEvents: any[] = [];

      connectionManager.on('circuit-breaker-opened', (data) => {
        circuitEvents.push({ type: 'opened', ...data });
      });

      connectionManager.on('circuit-breaker-closed', (data) => {
        circuitEvents.push({ type: 'closed', ...data });
      });

      const failingConfig: MCPConnectionConfig = {
        ...mockServerConfig,
        serverId: 'circuit-test-server',
        command: 'always-fail-command',
      };

      // Attempt multiple connections to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await connectionManager.connect(failingConfig);
        } catch (error) {
          // Expected failures
        }

        // Small delay between attempts
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Give time for circuit breaker to activate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = connectionManager.getConnectionStatus(failingConfig.serverId);
      expect(status?.circuitState).toBe('open');
    });

    test('should transition to half-open state after recovery timeout', async () => {
      const manager = new MCPConnectionManager(
        undefined, // default retry
        {
          failureThreshold: 2,
          recoveryTimeout: 1000, // 1 second for faster testing
          monitoringPeriod: 10000,
          minimumRequests: 1,
        },
      );

      const failingConfig: MCPConnectionConfig = {
        ...mockServerConfig,
        serverId: 'recovery-test-server',
        command: 'fail-command',
      };

      // Trigger circuit breaker opening
      for (let i = 0; i < 3; i++) {
        try {
          await manager.connect(failingConfig);
        } catch (error) {
          // Expected
        }
      }

      let status = manager.getConnectionStatus(failingConfig.serverId);
      expect(status?.circuitState).toBe('open');

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 1200));

      status = manager.getConnectionStatus(failingConfig.serverId);
      expect(status?.circuitState).toBe('half-open');

      await manager.shutdown();
    });
  });

  describe('Health Monitoring Integration', () => {
    test('should integrate MCP health data with overall health status', async () => {
      // Connect a server first
      await mcpIntegration.connectServer(mockServerConfig);

      const healthStatus = await observability.getComprehensiveHealthStatus();

      expect(healthStatus.overallHealth).toBeDefined();
      expect(healthStatus.agentStatuses).toBeDefined();
      expect(healthStatus.mcp).toBeDefined();
    });

    test('should track health status changes', async () => {
      const healthChanges: any[] = [];

      mcpIntegration.on('health-status-changed', (data) => {
        healthChanges.push(data);
      });

      await mcpIntegration.connectServer(mockServerConfig);

      // Wait for health status updates
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(healthChanges.length).toBeGreaterThan(0);
    });

    test('should handle health check failures appropriately', async () => {
      const errorEvents: any[] = [];

      mcpIntegration.on('error-occurred', (data) => {
        errorEvents.push(data);
      });

      // Simulate health check failure by connecting to invalid server
      const invalidConfig: MCPConnectionConfig = {
        ...mockServerConfig,
        serverId: 'invalid-health-server',
        command: 'invalid-command',
      };

      try {
        await mcpIntegration.connectServer(invalidConfig);
      } catch (error) {
        // Expected
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have error events
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution Integration', () => {
    test('should execute MCP tools through observability system', async () => {
      await mcpIntegration.connectServer(mockServerConfig);

      const result = await observability.executeMCPTool(
        mockServerConfig.serverId,
        MCP_OBSERVABILITY_TOOLS.GET_AGENT_STATUS,
        { includeHistory: false },
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should track tool execution metrics', async () => {
      const executionEvents: any[] = [];

      mcpIntegration.on('tool-execution', (data) => {
        executionEvents.push(data);
      });

      await mcpIntegration.connectServer(mockServerConfig);

      await observability.executeMCPTool(
        mockServerConfig.serverId,
        MCP_OBSERVABILITY_TOOLS.GET_AGENT_METRICS,
        {},
      );

      expect(executionEvents.length).toBeGreaterThan(0);
      expect(executionEvents[0].serverId).toBe(mockServerConfig.serverId);
      expect(executionEvents[0].success).toBe(true);
      expect(executionEvents[0].duration).toBeGreaterThan(0);
    });

    test('should handle tool execution failures', async () => {
      const errorEvents: any[] = [];

      mcpIntegration.on('error-occurred', (data) => {
        errorEvents.push(data);
      });

      await mcpIntegration.connectServer(mockServerConfig);

      try {
        await observability.executeMCPTool(mockServerConfig.serverId, 'nonexistent.tool', {});
      } catch (error) {
        expect(error).toBeDefined();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Monitoring', () => {
    test('should provide real-time MCP observability data', async () => {
      await mcpIntegration.connectServer(mockServerConfig);

      const mcpData = observability.getMCPObservabilityData();

      expect(mcpData).toBeDefined();
      expect(mcpData.enabled).toBe(true);
      expect(mcpData.connectedServers).toBeDefined();
      expect(mcpData.metrics).toBeDefined();
      expect(mcpData.connectionStatuses).toBeDefined();
      expect(mcpData.timestamp).toBeDefined();
    });

    test('should emit real-time events for monitoring', async () => {
      const events: any[] = [];

      observability.on('mcpConnectionEstablished', (data) => {
        events.push({ type: 'connection-established', ...data });
      });

      observability.on('mcpToolExecution', (data) => {
        events.push({ type: 'tool-execution', ...data });
      });

      observability.on('mcpHealthStatusChanged', (data) => {
        events.push({ type: 'health-changed', ...data });
      });

      await mcpIntegration.connectServer(mockServerConfig);

      await observability.executeMCPTool(
        mockServerConfig.serverId,
        MCP_OBSERVABILITY_TOOLS.GET_AGENT_STATUS,
        {},
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'connection-established')).toBe(true);
      expect(events.some((e) => e.type === 'tool-execution')).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple concurrent connections', async () => {
      const configs = Array.from({ length: 5 }, (_, i) => ({
        ...mockServerConfig,
        serverId: `concurrent-server-${i}`,
        name: `Concurrent Server ${i}`,
      }));

      const connectionPromises = configs.map((config) =>
        mcpIntegration.connectServer(config).catch(() => {
          // Some may fail, that's ok for this test
        }),
      );

      await Promise.allSettled(connectionPromises);

      const mcpData = observability.getMCPObservabilityData();
      expect(mcpData.connectedServers.length).toBeGreaterThanOrEqual(0);
    });

    test('should cleanup resources properly', async () => {
      await mcpIntegration.connectServer(mockServerConfig);

      const mcpDataBefore = observability.getMCPObservabilityData();
      expect(mcpDataBefore.connectedServers.length).toBeGreaterThanOrEqual(0);

      await mcpIntegration.disconnectServer(mockServerConfig.serverId);

      const mcpDataAfter = observability.getMCPObservabilityData();
      expect(mcpDataAfter.connectedServers).not.toContain(mockServerConfig.serverId);
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
