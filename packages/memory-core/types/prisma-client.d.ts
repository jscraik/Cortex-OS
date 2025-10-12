declare module '@prisma/client' {
  export type JsonPrimitive = string | number | boolean | null;
  export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
  export interface JsonObject {
    [Key: string]: JsonValue;
  }
  export interface JsonArray extends Array<JsonValue> {}

  export namespace Prisma {
    export type JsonValue = import('@prisma/client').JsonValue;
    export type JsonObject = import('@prisma/client').JsonObject;
    export type JsonArray = import('@prisma/client').JsonArray;
  }

  export enum GraphNodeType {
    ADR = 'ADR',
    API = 'API',
    AGENT = 'AGENT',
    CONTRACT = 'CONTRACT',
    DOC = 'DOC',
    EVENT = 'EVENT',
    FILE = 'FILE',
    PACKAGE = 'PACKAGE',
    PORT = 'PORT',
    SERVICE = 'SERVICE',
    TOOL = 'TOOL'
  }

  export enum GraphEdgeType {
    CALLS_TOOL = 'CALLS_TOOL',
    DECIDES_WITH = 'DECIDES_WITH',
    DEPENDS_ON = 'DEPENDS_ON',
    EMITS_EVENT = 'EMITS_EVENT',
    EXPOSES_PORT = 'EXPOSES_PORT',
    IMPLEMENTS_CONTRACT = 'IMPLEMENTS_CONTRACT',
    IMPORTS = 'IMPORTS',
    REFERENCES_DOC = 'REFERENCES_DOC'
  }

  export interface GraphNode {
    id: string;
    key: string;
    type: GraphNodeType;
    label: string;
    meta?: JsonObject | null;
  }

  export interface ChunkRef {
    id: string;
    nodeId: string;
    qdrantId: string;
    path: string;
    lineStart?: number | null;
    lineEnd?: number | null;
    meta?: JsonObject | null;
    createdAt?: string | Date;
    node: GraphNode;
  }

  type Resolver<T> = (args?: any) => Promise<T>;

  export class PrismaClient {
    constructor(options?: { datasourceUrl?: string } | undefined);
    graphNode: {
      findMany: Resolver<GraphNode[]>;
      upsert: Resolver<GraphNode>;
      groupBy: Resolver<Array<{ type: GraphNodeType; _count: { type: number } }>>;
    };
    graphEdge: {
      findMany: Resolver<
        Array<{
          id: string;
          srcId: string;
          dstId: string;
          type: GraphEdgeType;
          weight?: number | null;
          meta?: JsonObject | null;
        }>
      >;
      groupBy: Resolver<Array<{ type: GraphEdgeType; _count: { type: number } }>>;
    };
    chunkRef: {
      findMany: Resolver<ChunkRef[]>;
      deleteMany: Resolver<{ count: number }>;
      createMany: Resolver<{ count: number }>;
      count: Resolver<number>;
    };
    $transaction<T>(promises: Array<Promise<T>>): Promise<T[]>;
    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
    $disconnect(): Promise<void>;
  }
}
