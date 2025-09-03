import type { Embedder, Store } from "../lib";
export declare function query(args: {
    q: string;
    topK?: number;
}, E: Embedder, S: Store): Promise<(import("../lib").Chunk & {
    score?: number;
})[]>;
//# sourceMappingURL=query.d.ts.map
