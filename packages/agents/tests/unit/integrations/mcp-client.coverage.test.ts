// Minimal clean MCP client coverage test (fully reset)
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAgentMCPClient } from '../../../src/integrations/mcp-client.js';

interface JsonRpcEnvelope { result: unknown }

describe('AgentMCPClient integration (mock fetch)', () => {
  const responses: JsonRpcEnvelope[] = [];
  let originalFetch: typeof fetch;
  const push = (r: unknown) => responses.push({ result: r });

  beforeAll(() => {
    originalFetch = global.fetch as typeof fetch;
    global.fetch = vi.fn(async () => {
      const next = responses.shift() ?? { result: {} };
      return { ok: true, json: async () => next } as Response;
    }) as any;
  });
  afterAll(() => { global.fetch = originalFetch; });

  it('covers happy path once', async () => {
    // queue mock responses in call order
    push({}); // connect
    push([{ name: 'toolA', description: 'demo', inputSchema: { properties: { p1: { type: 'string' } } }, capabilities: ['x'] }]); // list tools
    push({ ok: true }); // call tool
    push([{ id: 'k1', title: 'Doc', content: 'text', score: 0.9, source: 'kb', metadata: {}, created_at: new Date().toISOString() }]); // search
    push({ id: 't1', title: 'Task', description: 'desc', status: 'open', priority: 'medium', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); // create task
    push({}); // update task status
    push({ id: 'doc1' }); // upload document
    push({ healthy: true }); // health
    push({}); // disconnect

    const client = createAgentMCPClient({ mcpServerUrl: 'http://fake-host:9999', webUrl: 'http://web', apiKey: 'k' });
    const events: string[] = [];
    client.on('connected', () => events.push('connected'));
    client.on('tool_called', () => events.push('tool_called'));
    client.on('knowledge_searched', () => events.push('knowledge_searched'));
    client.on('task_created', () => events.push('task_created'));
    client.on('task_updated', () => events.push('task_updated'));
    client.on('document_uploaded', () => events.push('document_uploaded'));
    client.on('disconnected', () => events.push('disconnected'));

    await client.initialize();
    const tools = await client.getAvailableTools();
    expect(tools[0].id).toBe('toolA');
    await client.callTool('toolA', { p1: 'v' });
    const kb = await client.searchKnowledgeBase('query');
    expect(kb).toHaveLength(1);
    const created = await client.createTask('Title', 'Body');
    expect(created.taskId).toBe('t1');
    await client.updateTaskStatus('t1', 'in_progress', 'working');
    const upload = await client.uploadDocument('content', 'file.txt', { tags: ['t'] });
    expect(upload.documentId).toBe('doc1');
    const healthy = await client.healthCheck();
    expect(healthy).toBe(true);
    await client.disconnect();

    expect(events).toEqual([
      'connected', 'tool_called', 'knowledge_searched', 'task_created', 'task_updated', 'document_uploaded', 'disconnected'
    ]);
  });
});

// EOF
