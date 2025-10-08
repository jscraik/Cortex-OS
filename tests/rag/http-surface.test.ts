import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createServer } from '@cortex-os/rag-http';
import type { RagHttpServerOptions } from '@cortex-os/rag-http';
import type { SelfRagController } from '@cortex-os/rag';

type GraphRagResult = {
  answer?: string;
  sources: Array<{ path?: string; score?: number }>;
  graphContext: {
    focusNodes: number;
    expandedNodes: number;
    totalChunks: number;
    edgesTraversed: number;
  };
  metadata: Record<string, unknown>;
  citations?: Array<Record<string, unknown>>;
};

type GraphService = RagHttpServerOptions['graph'];
type IngestService = RagHttpServerOptions['ingest'];

function buildServer(overrides?: Partial<RagHttpServerOptions>): FastifyInstance {
  const graph: GraphService = {
    query: vi.fn(async ({ question }: { question: string }) => {
      if (question.includes('SLO')) {
      return {
          answer: 'Vendors A and B impact current SLO risk',
          sources: [],
          graphContext: {
            focusNodes: 2,
            expandedNodes: 3,
            totalChunks: 5,
            edgesTraversed: 2,
          },
        metadata: {
            brainwavPowered: true,
            brainwavSource: 'brAInwav GraphRAG',
            retrievalDurationMs: 42,
            queryTimestamp: new Date().toISOString(),
          },
          citations: [
            { path: 'vendor-a.md', relevanceScore: 0.93 },
            { path: 'vendor-b.md', relevanceScore: 0.91 },
            { path: 'risk-register.md', relevanceScore: 0.89 },
          ],
        };
      }

      if (question.includes('chart')) {
        return {
          answer: 'The chart on page 3 indicates rising latency.',
          sources: [],
          graphContext: {
            focusNodes: 1,
            expandedNodes: 0,
            totalChunks: 1,
            edgesTraversed: 0,
          },
          metadata: {
            brainwavPowered: true,
            brainwavSource: 'brAInwav GraphRAG',
            retrievalDurationMs: 21,
            queryTimestamp: new Date().toISOString(),
          },
          citations: [
            { path: 'report.pdf#page=3', relevanceScore: 0.95 },
          ],
        };
      }

      return {
        answer: 'Neural networks combine semantic insights with facts.',
        sources: [
          { path: 'neural-networks.md', score: 0.88 },
          { path: 'deep-learning.md', score: 0.86 },
          { path: 'ml-basics.md', score: 0.82 },
          { path: 'ai-overview.md', score: 0.81 },
        ],
        graphContext: {
          focusNodes: 1,
          expandedNodes: 1,
          totalChunks: 4,
          edgesTraversed: 0,
        },
        metadata: {
          brainwavPowered: true,
          brainwavSource: 'brAInwav GraphRAG',
          retrievalDurationMs: 18,
          queryTimestamp: new Date().toISOString(),
        },
      } satisfies GraphRagResult;
    }),
  };

  const ingest: IngestService = {
    ingest: vi.fn(async (request: Parameters<IngestService['ingest']>[0]) => ({
      documentId: request.documentId,
      chunks: Math.ceil(request.text.length / 500),
        metadata: request.metadata ?? {},
    })),
  };

  const server = createServer({ graph, ingest, ...overrides });
  return server;
}

function parseBody(response: Awaited<ReturnType<FastifyInstance['inject']>>) {
  const json = response.json();
  return json as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RAG HTTP surfaces', () => {
  it('returns hierarchical spans with ≥3 citations (AT-HRAG-01)', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/rag/hier-query',
      payload: {
        query: 'termination clauses',
        top_k: 24,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    const citations = (body.citations ?? []) as unknown[];
    expect(citations.length).toBeGreaterThanOrEqual(3);
    await server.close();
  });

  it('traverses vendor→KPI edges when graph_walk=true (AT-GRAPH-02)', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/rag/hier-query',
      payload: {
        query: 'Which vendors impact SLO breach risk?',
        graph_walk: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    const graph = body.graph as { edgesTraversed: number };
    expect(graph.edgesTraversed).toBeGreaterThanOrEqual(1);
    await server.close();
  });

  it('answers a table+image question when multimodal=true (AT-MM-03)', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/rag/hier-query',
      payload: {
        query: 'What does the chart on page 3 imply?',
        multimodal: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = parseBody(response);
    expect(String(body.answer)).toMatch(/chart/i);
    await server.close();
  });

  it('accepts hierarchical ingest payloads and returns 202', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/rag/ingest',
      payload: {
        documentId: 'doc-001',
        source: 'ingest/manual',
        text: 'BrAInwav ingestion payload for the hybrid search demo.',
      },
    });

    expect(response.statusCode).toBe(202);
    const body = parseBody(response);
    expect(body.status).toBe('accepted');
    expect(body.documentId).toBe('doc-001');
    await server.close();
  });

  it('rejects invalid payloads with 400', async () => {
    const server = buildServer();
    const response = await server.inject({
      method: 'POST',
      url: '/rag/ingest',
      payload: {
        documentId: '',
        source: '',
        text: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = parseBody(response);
    expect(body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    await server.close();
  });

  it('skips retrieval when self-rag controller provides cached answer (AT-SRAG-04)', async () => {
    const graph: GraphService = {
      query: vi.fn(async () => ({
        answer: 'Should not be called',
        sources: [],
        graphContext: { focusNodes: 0, expandedNodes: 0, totalChunks: 0, edgesTraversed: 0 },
        metadata: {},
      } satisfies GraphRagResult),
    };

    const controller: SelfRagController = {
      run: async ({ initialQuery }) => ({
        result: {
          answer: 'brAInwav is the company name.',
          sources: [],
          graphContext: { focusNodes: 0, expandedNodes: 0, totalChunks: 0, edgesTraversed: 0 },
          metadata: {
            brainwavPowered: true,
            queryTimestamp: new Date().toISOString(),
            brainwavSource: 'brAInwav SelfRAG',
          },
          citations: [],
        },
        metrics: {
          finalQuery: initialQuery,
          retrievalCalls: 0,
          rounds: 0,
          critiques: [],
        },
      }),
    };

    const server = buildServer({ graph, selfRag: controller });
    const response = await server.inject({
      method: 'POST',
      url: '/rag/hier-query',
      payload: {
        query: 'What is our company name?',
        self_rag: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(graph.query).not.toHaveBeenCalled();
    const body = parseBody(response);
    expect(body.answer).toMatch(/brAInwav/);
    expect(body.selfRag).toMatchObject({ retrievalCalls: 0, rounds: 0 });
    await server.close();
  });
});
