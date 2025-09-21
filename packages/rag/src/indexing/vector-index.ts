export interface VectorIndex {
	init(dimension: number): Promise<void>;
	add(id: string, vector: number[]): Promise<void>;
	addBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void>;
	query(vector: number[], topK: number): Promise<Array<{ id: string; distance: number }>>;
	size(): number;
}

export type DistanceMetric = 'cosine' | 'l2';
