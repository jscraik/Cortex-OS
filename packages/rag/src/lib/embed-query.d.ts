export interface Embedder {
  embed(queries: string[]): Promise<any[]>;
}
export declare function embedQuery(embedder: Embedder, query: string): Promise<any>;
//# sourceMappingURL=embed-query.d.ts.map
