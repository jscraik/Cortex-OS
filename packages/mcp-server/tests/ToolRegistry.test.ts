/**
 * @file_path packages/mcp-server/tests/ToolRegistry.test.ts
 * @description Tests for ToolRegistry
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/ToolRegistry.js';
import { Tool } from '../src/tool.js';

// Mock tool for testing
class MockTool implements Tool {
  constructor(
    public name: string = 'mock_tool',
    public description: string = 'A mock tool for testing',
  ) {}

  async run(args: any): Promise<any> {
    return { success: true, args };
  }
}

class FailingTool implements Tool {
  name = 'failing_tool';
  description = 'A tool that always fails';

  async run(args: any): Promise<any> {
    throw new Error('Tool execution failed');
  }
}

class SlowTool implements Tool {
  name = 'slow_tool';
  description = 'A tool that takes time to execute';

  async run(args: any): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { slow: true, args };
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should register a valid tool', () => {
      const tool = new MockTool();

      expect(() => registry.register(tool)).not.toThrow();
      expect(registry.get('mock_tool')).toBe(tool);
    });

    it('should prevent registering duplicate tool names', () => {
      const tool1 = new MockTool('duplicate', 'First tool');
      const tool2 = new MockTool('duplicate', 'Second tool');

      registry.register(tool1);

      expect(() => registry.register(tool2)).toThrow(
        'Tool with name "duplicate" is already registered',
      );
    });

    it('should validate tool name format', () => {
      const invalidNameTool = new MockTool('invalid name!', 'Invalid tool');

      expect(() => registry.register(invalidNameTool)).toThrow(
        'Tool name must contain only alphanumeric characters, underscores, and hyphens',
      );
    });

    it('should validate tool has non-empty name', () => {
      const noNameTool = new MockTool('', 'Tool without name');

      expect(() => registry.register(noNameTool)).toThrow('Tool must have a non-empty name');
    });

    it('should validate tool has description', () => {
      const noDescTool = new MockTool('no_desc', '');

      expect(() => registry.register(noDescTool)).toThrow('Tool must have a description');
    });

    it('should validate tool has run method', () => {
      const invalidTool = {
        name: 'invalid',
        description: 'Invalid tool',
        // Missing run method
      } as Tool;

      expect(() => registry.register(invalidTool)).toThrow('Tool must have a run method');
    });
  });

  describe('Tool Management', () => {
    it('should list all registered tools', () => {
      const tool1 = new MockTool('tool1', 'First tool');
      const tool2 = new MockTool('tool2', 'Second tool');

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.list();
      expect(tools).toHaveLength(2);
      expect(tools).toContain(tool1);
      expect(tools).toContain(tool2);
    });

    it('should unregister tools', () => {
      const tool = new MockTool();
      registry.register(tool);

      expect(registry.get('mock_tool')).toBe(tool);

      const removed = registry.unregister('mock_tool');
      expect(removed).toBe(true);
      expect(registry.get('mock_tool')).toBeUndefined();
    });

    it('should return false when unregistering non-existent tool', () => {
      const removed = registry.unregister('nonexistent');
      expect(removed).toBe(false);
    });

    it('should get specific tool by name', () => {
      const tool = new MockTool('specific_tool', 'Specific tool');
      registry.register(tool);

      expect(registry.get('specific_tool')).toBe(tool);
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool successfully', async () => {
      const tool = new MockTool();
      registry.register(tool);

      const result = await registry.execute('mock_tool', { test: 'data' });

      expect(result.success).toBe(true);
      expect(result.result.success).toBe(true);
      expect(result.result.args.test).toBe('data');
      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(result.context.tool_name).toBe('mock_tool');
      expect(result.context.execution_id).toBeDefined();
    });

    it('should handle tool execution failures', async () => {
      const failingTool = new FailingTool();
      registry.register(failingTool);

      const result = await registry.execute('failing_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it('should handle non-existent tool execution', async () => {
      const result = await registry.execute('nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool "nonexistent" not found');
    });

    it('should track execution time', async () => {
      const slowTool = new SlowTool();
      registry.register(slowTool);

      const result = await registry.execute('slow_tool', {});

      // Inclusive to avoid timing boundary flake when setTimeout(100) resolves exactly at 100ms
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(100);
    });

    it('should include execution context', async () => {
      const tool = new MockTool();
      registry.register(tool);

      const contextData = {
        user_id: 'test-user',
        session_id: 'test-session',
      };

      const result = await registry.execute('mock_tool', {}, contextData);

      expect(result.context.user_id).toBe('test-user');
      expect(result.context.session_id).toBe('test-session');
      expect(result.context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Execution History', () => {
    it('should track execution history', async () => {
      const tool = new MockTool();
      registry.register(tool);

      await registry.execute('mock_tool', { first: true });
      await registry.execute('mock_tool', { second: true });

      const history = registry.getExecutionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].context.tool_name).toBe('mock_tool');
      expect(history[1].context.tool_name).toBe('mock_tool');
    });

    it('should filter execution history by tool name', async () => {
      const tool1 = new MockTool('tool1', 'Tool 1');
      const tool2 = new MockTool('tool2', 'Tool 2');

      registry.register(tool1);
      registry.register(tool2);

      await registry.execute('tool1', {});
      await registry.execute('tool2', {});
      await registry.execute('tool1', {});

      const tool1History = registry.getExecutionHistory('tool1');
      expect(tool1History).toHaveLength(2);
      tool1History.forEach((result) => {
        expect(result.context.tool_name).toBe('tool1');
      });

      const tool2History = registry.getExecutionHistory('tool2');
      expect(tool2History).toHaveLength(1);
      expect(tool2History[0].context.tool_name).toBe('tool2');
    });

    it('should limit execution history results', async () => {
      const tool = new MockTool();
      registry.register(tool);

      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        await registry.execute('mock_tool', { iteration: i });
      }

      const limitedHistory = registry.getExecutionHistory(undefined, 3);
      expect(limitedHistory).toHaveLength(3);

      // Should get the last 3 executions
      expect(limitedHistory[2].result.args.iteration).toBe(4);
      expect(limitedHistory[1].result.args.iteration).toBe(3);
      expect(limitedHistory[0].result.args.iteration).toBe(2);
    });

    it('should clear execution history', async () => {
      const tool = new MockTool();
      registry.register(tool);

      await registry.execute('mock_tool', {});
      expect(registry.getExecutionHistory()).toHaveLength(1);

      registry.clearHistory();
      expect(registry.getExecutionHistory()).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should provide registry statistics', async () => {
      const tool1 = new MockTool('tool1', 'Tool 1');
      const tool2 = new FailingTool();

      registry.register(tool1);
      registry.register(tool2);

      await registry.execute('tool1', {});
      await registry.execute('tool1', {});
      await registry.execute('failing_tool', {});

      const stats = registry.getStats();

      expect(stats.total_tools).toBe(2);
      expect(stats.total_executions).toBe(3);
      expect(stats.successful_executions).toBe(2);
      expect(stats.failed_executions).toBe(1);
      expect(stats.average_execution_time).toBeGreaterThan(0);

      // Tool-specific stats
      const tool1Stats = stats.tools.find((t) => t.name === 'tool1');
      expect(tool1Stats?.executions).toBe(2);
      expect(tool1Stats?.success_rate).toBe(1);

      const failingToolStats = stats.tools.find((t) => t.name === 'failing_tool');
      expect(failingToolStats?.executions).toBe(1);
      expect(failingToolStats?.success_rate).toBe(0);
    });

    it('should handle empty statistics', () => {
      const stats = registry.getStats();

      expect(stats.total_tools).toBe(0);
      expect(stats.total_executions).toBe(0);
      expect(stats.successful_executions).toBe(0);
      expect(stats.failed_executions).toBe(0);
      expect(stats.average_execution_time).toBe(0);
      expect(stats.tools).toHaveLength(0);
    });
  });

  describe('Registry Export/Import', () => {
    it('should export registry information', () => {
      const tool1 = new MockTool('tool1', 'Description 1');
      const tool2 = new MockTool('tool2', 'Description 2');

      registry.register(tool1);
      registry.register(tool2);

      const exported = registry.exportRegistry();

      expect(exported.total_tools).toBe(2);
      expect(exported.tools).toHaveLength(2);
      expect(exported.tools[0].name).toBe('tool1');
      expect(exported.tools[0].description).toBe('Description 1');
      expect(exported.timestamp).toBeDefined();
    });

    it('should import tools successfully', () => {
      const tools = [
        new MockTool('import1', 'Imported tool 1'),
        new MockTool('import2', 'Imported tool 2'),
      ];

      const result = registry.importTools(tools);

      expect(result.success).toBe(2);
      expect(result.failed).toHaveLength(0);
      expect(registry.get('import1')).toBeDefined();
      expect(registry.get('import2')).toBeDefined();
    });

    it('should handle import failures', () => {
      // Register a tool first to cause conflict
      const existingTool = new MockTool('conflict', 'Existing tool');
      registry.register(existingTool);

      const tools = [
        new MockTool('success', 'Should succeed'),
        new MockTool('conflict', 'Should fail due to duplicate name'),
        // Invalid tool that will fail validation
        { name: '', description: 'Invalid' } as any,
      ];

      const result = registry.importTools(tools);

      expect(result.success).toBe(1);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].tool).toBe('success');
      expect(result.failed[1].tool).toBe('');
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
