export interface Embedder {
    embed(queries: string[]): Promise<number[][]>;
}
export interface Chunk {
    id: string;
    text: string;
    source?: string;
    embedding?: number[];
}
export interface Store {
    upsert(chunks: Chunk[]): Promise<void>;
    query(embedding: number[], k?: number): Promise<Array<Chunk & {
        score?: number;
    }>>;
}
export interface Pipeline {
    ingest(chunks: Chunk[]): Promise<void>;
}
export interface Document {
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
    embedding?: number[];
    similarity?: number;
}
//# sourceMappingURL=types.d.ts.map