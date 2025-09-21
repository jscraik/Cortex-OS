import type { VectorIndex } from './vector-index.js';

type Space = 'cosine' | 'l2' | 'ip';

export interface HNSWIndexOptions {
	space?: Space;
	M?: number;
	efConstruction?: number;
	efSearch?: number;
}

// Native index surface we rely on (minimal)
interface HNSWNativeIndex {
	initIndex(maxElements: number, M: number, efConstruction: number, randomSeed?: number): void;
	setEf(ef: number): void;
	addPoint(vec: Float32Array, label: number): void;
	searchKnn(
		vec: Float32Array,
		topK: number,
	): { neighbors: ArrayLike<number>; distances: ArrayLike<number> };
	getMaxElements(): number;
	resizeIndex(newMax: number): void;
	saveIndex(path: string): void;
	loadIndex(path: string): void;
}

interface HNSWModule {
	HierarchicalNSW: new (space: string, dim: number) => HNSWNativeIndex;
}

// We load hnswlib-node dynamically to keep it optional
async function loadHnsw(): Promise<HNSWModule> {
	// @ts-expect-error dynamic import of optional dependency (computed to avoid bundler pre-resolution)
	const lib = 'hnswlib-node';
	const mod = await import(lib);
	return mod as unknown as HNSWModule;
}

export class HNSWIndex implements VectorIndex {
	private dim = 0;
	private index: HNSWNativeIndex | undefined;
	private space: Space;
	private M: number;
	private efConstruction: number;
	private efSearch: number;
	private idToLabel = new Map<string, number>();
	private labelToId = new Map<number, string>();
	private nextLabel = 0;

	constructor(opts: HNSWIndexOptions = {}) {
		this.space = opts.space ?? 'cosine';
		this.M = opts.M ?? 16;
		this.efConstruction = opts.efConstruction ?? 200;
		this.efSearch = opts.efSearch ?? 64;
	}

	async init(dimension: number): Promise<void> {
		this.dim = dimension;
		const { HierarchicalNSW } = await loadHnsw();
		this.index = new HierarchicalNSW(this.space, this.dim);
		this.index.initIndex(1000, this.M, this.efConstruction, 100); // maxElements grows dynamically via resizeIndex
		this.index.setEf(this.efSearch);
	}

	private ensureCapacity(extra: number) {
		if (!this.index) throw new Error('Index not initialized');
		const currentMax = this.index.getMaxElements();
		const needed = this.size() + extra;
		if (needed > currentMax) {
			// Resize with headroom
			const newMax = Math.max(needed, Math.ceil(currentMax * 1.5));
			this.index.resizeIndex(newMax);
		}
	}

	async add(id: string, vector: number[]): Promise<void> {
		if (vector.length !== this.dim)
			throw new Error(`Vector dimension ${vector.length} != index dimension ${this.dim}`);
		if (this.idToLabel.has(id)) return; // idempotent add
		this.ensureCapacity(1);
		const label = this.nextLabel++;
		this.idToLabel.set(id, label);
		this.labelToId.set(label, id);
		if (!this.index) throw new Error('Index not initialized');
		this.index.addPoint(Float32Array.from(vector), label);
	}

	async addBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void> {
		this.ensureCapacity(entries.length);
		for (const e of entries) await this.add(e.id, e.vector);
	}

	async query(vector: number[], topK: number): Promise<Array<{ id: string; distance: number }>> {
		if (vector.length !== this.dim)
			throw new Error(`Vector dimension ${vector.length} != index dimension ${this.dim}`);
		if (!this.index) throw new Error('Index not initialized');
		const result = this.index.searchKnn(Float32Array.from(vector), topK);
		const labels: number[] = Array.from(result.neighbors);
		const distances: number[] = Array.from(result.distances);
		return labels.map((lbl, i) => {
			const id = this.labelToId.get(lbl);
			if (!id) throw new Error(`Unknown label ${lbl} returned by HNSW index`);
			return { id, distance: distances[i] };
		});
	}

	size(): number {
		return this.idToLabel.size;
	}

	// Persistence helpers (non-VectorIndex API but used by tests)
	async save(path: string): Promise<void> {
		if (!this.index) throw new Error('Index not initialized');
		// Persist both HNSW graph and label mapping
		const fs = await import('node:fs');
		const base = path.endsWith('.bin') ? path.slice(0, -4) : path;
		this.index.saveIndex(`${base}.bin`);
		const meta = {
			dim: this.dim,
			space: this.space,
			M: this.M,
			efConstruction: this.efConstruction,
			efSearch: this.efSearch,
			nextLabel: this.nextLabel,
			idToLabel: Array.from(this.idToLabel.entries()),
		};
		fs.writeFileSync(`${base}.meta.json`, JSON.stringify(meta));
	}

	async load(path: string): Promise<void> {
		const { HierarchicalNSW } = await loadHnsw();
		const fs = await import('node:fs');
		const base = path.endsWith('.bin') ? path.slice(0, -4) : path;
		const meta = JSON.parse(fs.readFileSync(`${base}.meta.json`, 'utf-8'));
		this.dim = meta.dim;
		this.space = meta.space;
		this.M = meta.M;
		this.efConstruction = meta.efConstruction;
		this.efSearch = meta.efSearch;
		this.nextLabel = meta.nextLabel;
		this.idToLabel = new Map(meta.idToLabel);
		this.labelToId = new Map(
			Array.from(this.idToLabel.entries()).map(([id, lbl]: [string, number]) => [lbl, id]),
		);
		this.index = new HierarchicalNSW(this.space, this.dim);
		this.index.loadIndex(`${base}.bin`);
		this.index.setEf(this.efSearch);
	}
}
