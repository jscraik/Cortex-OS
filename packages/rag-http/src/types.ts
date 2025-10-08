import type { FastifyInstance } from 'fastify';
import type { SelfRagController } from '@cortex-os/rag';

export interface GraphRagQuery {
  question: string;
  k?: number;
  maxHops?: number;
  includeCitations?: boolean;
  namespace?: string | undefined;
  filters?: Record<string, unknown> | undefined;
}

export interface GraphRagCitation {
  path: string;
  lines?: string;
  nodeType?: string;
  relevanceScore?: number;
  brainwavIndexed?: boolean;
  graph?: {
    edgesTraversed?: number;
  };
}

export interface GraphRagResult {
  answer?: string;
  sources: Array<{ path?: string; content?: string; score?: number }>;
  metadata: {
    brainwavPowered?: boolean;
    retrievalDurationMs?: number;
    queryTimestamp?: string;
    brainwavSource?: string;
    [key: string]: unknown;
  };
  graphContext: {
    focusNodes: number;
    expandedNodes: number;
    totalChunks: number;
    edgesTraversed: number;
  };
  citations?: GraphRagCitation[];
}

export interface GraphRagService {
  query(request: GraphRagQuery): Promise<GraphRagResult>;
}

export interface IngestRequest {
  documentId: string;
  source: string;
  text: string;
  metadata?: Record<string, unknown>;
  hierarchical: boolean;
  multimodal?: Array<{
    type: string;
    url?: string;
    content?: string;
    caption?: string;
  }>;
}

export interface IngestResult {
  documentId: string;
  chunks: number;
  metadata?: Record<string, unknown>;
}

export interface IngestService {
  ingest(request: IngestRequest): Promise<IngestResult>;
}

export interface RagHttpServerOptions {
  graph: GraphRagService;
  ingest: IngestService;
  enableCors?: boolean;
  fastifyInstance?: FastifyInstance;
  selfRag?: SelfRagController;
}
