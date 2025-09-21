import type { VectorIndex } from './vector-index.js';

function dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

function norm(a: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * a[i];
    return Math.sqrt(s);
}

function cosineDistance(a: number[], b: number[]): number {
    const denom = norm(a) * norm(b);
    if (denom === 0) return 1; // maximal distance if degenerate
    const sim = dot(a, b) / denom;
    // distance = 1 - similarity
    return 1 - sim;
}

export class FlatIndex implements VectorIndex {
    private dim = 0;
    private entries: Array<{ id: string; vector: number[] }> = [];

    async init(dimension: number): Promise<void> {
        this.dim = dimension;
        this.entries = [];
    }

    async add(id: string, vector: number[]): Promise<void> {
        if (this.dim && vector.length !== this.dim) {
            throw new Error(`Vector dimension ${vector.length} != index dimension ${this.dim}`);
        }
        this.entries.push({ id, vector });
    }

    async addBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void> {
        for (const e of entries) await this.add(e.id, e.vector);
    }

    async query(vector: number[], topK: number): Promise<Array<{ id: string; distance: number }>> {
        const scored = this.entries.map((e) => ({ id: e.id, distance: cosineDistance(vector, e.vector) }));
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, topK);
    }

    size(): number {
        return this.entries.length;
    }
}
