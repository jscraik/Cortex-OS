/**
 * Phase C.3: Client Stub Tool Invocation Tracking Tests (TDD - RED Phase)
 *
 * Test Suite 12: MCP Client Stub
 * 
 * Tests the tool call tracking, queue management, and inspection helpers
 * for testing MCP client interactions.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase C.3
 * @see tasks/wikidata-semantic-layer-integration/PHASE_C3_IMPLEMENTATION.md
 */

import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  createAgentMCPClientStub,
  type AgentMCPClientStub,
  type ToolCall,
  type ToolCallHistory,
} from '../../src/stubs/agent-mcp-client.js';

describe('brAInwav Phase C.3: Client Stub Tool Invocation Tracking', () => {
  describe('Test Suite 12: MCP Client Stub', () => {
    let stub: AgentMCPClientStub;

    beforeEach(() => {
      stub = createAgentMCPClientStub();
    });

    test('C.3.1: should queue callTool invocations for inspection', async () => {
      // Given: Stub with configured responses
      stub.mockCallTool('vector_search_items', { 
        results: [{ qid: 'Q34743', score: 0.95, title: 'Alexander Graham Bell' }] 
      });
      stub.mockCallTool('get_claims', { 
        claims: [{ guid: 'Q34743$abc123-def456', property: 'P569', value: '1847-03-03' }] 
      });

      // When: Execute multiple tool calls
      await stub.callTool('vector_search_items', { 
        query: 'Who invented the telephone?', 
        scope: 'facts',
        brand: 'brAInwav' 
      });
      await stub.callTool('get_claims', { 
        qid: 'Q34743', 
        brand: 'brAInwav' 
      });

      // Then: Should queue all calls for inspection
      const queue = stub.getCallQueue();
      expect(queue).toHaveLength(2);
      
      // Verify first call
      expect(queue[0].name).toBe('vector_search_items');
      expect(queue[0].args.query).toBe('Who invented the telephone?');
      expect(queue[0].args.scope).toBe('facts');
      expect(queue[0].brand).toBe('brAInwav');
      expect(queue[0].timestamp).toBeGreaterThan(0);
      
      // Verify second call
      expect(queue[1].name).toBe('get_claims');
      expect(queue[1].args.qid).toBe('Q34743');
      expect(queue[1].brand).toBe('brAInwav');
      expect(queue[1].timestamp).toBeGreaterThan(queue[0].timestamp);
    });

    test('C.3.2: should provide inspection helpers for test validation', async () => {
      // Given: Stub with configured responses
      stub.mockCallTool('vector_search_items', { 
        results: [{ qid: 'Q9316', score: 0.88, title: 'Albert Einstein' }] 
      });
      stub.mockCallTool('sparql', { 
        query: 'SELECT ?physicist WHERE { ?physicist wdt:P106 wd:Q169470 }',
        results: [{ physicist: 'Q9316' }]
      });

      // When: Execute tool calls
      await stub.callTool('vector_search_items', { 
        query: 'Einstein relativity theory', 
        scope: 'facts',
        matryoshkaDimension: 512 
      });
      await stub.callTool('vector_search_items', { 
        query: 'quantum mechanics', 
        scope: 'facts' 
      });
      await stub.callTool('sparql', { 
        query: 'SELECT ?physicist WHERE { ?physicist wdt:P106 wd:Q169470 }' 
      });

      // Then: Inspection helpers should provide accurate information
      
      // Tool call verification
      expect(stub.wasToolCalled('vector_search_items')).toBe(true);
      expect(stub.wasToolCalled('get_claims')).toBe(false);
      expect(stub.wasToolCalled('sparql')).toBe(true);
      
      // Call count verification
      expect(stub.getToolCallCount('vector_search_items')).toBe(2);
      expect(stub.getToolCallCount('get_claims')).toBe(0);
      expect(stub.getToolCallCount('sparql')).toBe(1);
      
      // Last call arguments verification
      const lastVectorArgs = stub.getLastCallArgs('vector_search_items');
      expect(lastVectorArgs?.query).toBe('quantum mechanics');
      expect(lastVectorArgs?.scope).toBe('facts');
      
      const lastSparqlArgs = stub.getLastCallArgs('sparql');
      expect(lastSparqlArgs?.query).toContain('SELECT ?physicist');
      
      // All calls verification
      const allCalls = stub.getAllCalls();
      expect(allCalls).toHaveLength(3);
      expect(allCalls.map(call => call.name)).toEqual([
        'vector_search_items',
        'vector_search_items', 
        'sparql'
      ]);
    });

    test('C.3.3: should track tool call history with timing and metadata', async () => {
      // Given: Stub with configured responses including delay
      stub.mockCallTool('sparql', { 
        query: 'SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 }',
        results: [
          { inventor: 'Q34743', label: 'Alexander Graham Bell' },
          { inventor: 'Q8743', label: 'Thomas Edison' }
        ]
      });

      // Mock a small delay to test timing
      const originalCallTool = stub.callTool.bind(stub);
      stub.callTool = async (name: string, args: Record<string, unknown>) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
        return originalCallTool(name, args);
      };

      // When: Execute tool call with timing
      const startTime = Date.now();
      const result = await stub.callTool('sparql', { 
        query: 'SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 . ?inventor wdt:P106 wd:Q901 }',
        brand: 'brAInwav'
      });
      const endTime = Date.now();

      // Then: Should track detailed call history with timing
      const history = stub.getCallHistory();
      expect(history).toHaveLength(1);
      
      const call = history[0];
      
      // Basic call information
      expect(call.name).toBe('sparql');
      expect(call.args.query).toBe('SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 . ?inventor wdt:P106 wd:Q901 }');
      expect(call.args.brand).toBe('brAInwav');
      
      // Timing information
      expect(call.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(call.timestamp).toBeLessThanOrEqual(endTime);
      expect(call.duration).toBeGreaterThan(5); // Should reflect the 10ms delay
      expect(call.duration).toBeLessThan(100); // Reasonable upper bound
      
      // Success and result tracking
      expect(call.success).toBe(true);
      expect(call.result).toBeDefined();
      expect((call.result as any).query).toBe('SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 }');
      expect((call.result as any).results).toHaveLength(2);
      
      // brAInwav branding
      expect(call.brand).toBe('brAInwav');
    });

    test('C.3.4: should handle errors and track failure metadata', async () => {
      // Given: Stub configured to return an error
      const testError = new Error('Network timeout');
      stub.mockError('get_claims', testError);

      // When: Execute tool call that will fail
      let thrownError: Error | undefined;
      const startTime = Date.now();
      
      try {
        await stub.callTool('get_claims', { qid: 'Q12345', brand: 'brAInwav' });
      } catch (error) {
        thrownError = error as Error;
      }
      
      const endTime = Date.now();

      // Then: Should track error in history
      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe('Network timeout');
      
      const history = stub.getCallHistory();
      expect(history).toHaveLength(1);
      
      const failedCall = history[0];
      expect(failedCall.name).toBe('get_claims');
      expect(failedCall.success).toBe(false);
      expect(failedCall.error).toBe('Network timeout');
      expect(failedCall.result).toBeUndefined();
      expect(failedCall.duration).toBeGreaterThan(0);
      expect(failedCall.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(failedCall.timestamp).toBeLessThanOrEqual(endTime);
      expect(failedCall.brand).toBe('brAInwav');
    });

    test('C.3.5: should provide queue and history management', async () => {
      // Given: Stub with some calls executed
      stub.mockCallTool('vector_search_items', { results: [] });
      stub.mockCallTool('get_claims', { claims: [] });

      await stub.callTool('vector_search_items', { query: 'test1' });
      await stub.callTool('get_claims', { qid: 'Q123' });

      // When: Check initial state
      expect(stub.getCallQueue()).toHaveLength(2);
      expect(stub.getAllCalls()).toHaveLength(2);
      expect(stub.getCallHistory()).toHaveLength(2);

      // When: Clear queue only
      stub.clearQueue();
      
      // Then: Queue should be empty but history preserved
      expect(stub.getCallQueue()).toHaveLength(0);
      expect(stub.getAllCalls()).toHaveLength(0);
      expect(stub.getCallHistory()).toHaveLength(2); // History still there

      // When: Execute more calls
      await stub.callTool('vector_search_items', { query: 'test2' });
      
      // Then: New calls should be tracked
      expect(stub.getCallQueue()).toHaveLength(1);
      expect(stub.getCallHistory()).toHaveLength(3); // Added to existing history

      // When: Clear history
      stub.clearHistory();
      
      // Then: History should be empty but queue preserved
      expect(stub.getCallQueue()).toHaveLength(1);
      expect(stub.getCallHistory()).toHaveLength(0);
    });

    test('C.3.6: should support brAInwav branding throughout tracking', async () => {
      // Given: Stub with standard response
      stub.mockCallTool('vector_search_items', { 
        results: [{ qid: 'Q123', title: 'Test Entity' }] 
      });

      // When: Execute call without explicit branding
      await stub.callTool('vector_search_items', { query: 'test query' });

      // Then: brAInwav branding should be automatically added
      const queue = stub.getCallQueue();
      expect(queue[0].brand).toBe('brAInwav');
      
      const history = stub.getCallHistory();
      expect(history[0].brand).toBe('brAInwav');
      
      // When: Execute call with explicit branding
      await stub.callTool('vector_search_items', { 
        query: 'another test', 
        brand: 'brAInwav' 
      });

      // Then: Explicit branding should be preserved
      const queueAfter = stub.getCallQueue();
      expect(queueAfter[1].brand).toBe('brAInwav');
      expect(queueAfter[1].args.brand).toBe('brAInwav');
    });
  });
});