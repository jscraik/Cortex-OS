const DEFAULT_DENSE_DIMENSION = Math.max(
	32,
	Number(process.env.GRAPH_RAG_DENSE_DIMENSION ?? '128'),
);
const DEFAULT_SPARSE_BUCKETS = Math.max(
	512,
	Number(process.env.GRAPH_RAG_SPARSE_BUCKETS ?? '2048'),
);

export interface GraphRagEmbeddings {
	dense: (text: string) => Promise<number[]>;
	sparse: (text: string) => Promise<{ indices: number[]; values: number[] }>;
}

export function createGraphRagEmbeddings(): GraphRagEmbeddings {
	const dense = async (text: string): Promise<number[]> => {
		const dimension = DEFAULT_DENSE_DIMENSION;
		const vector = new Array<number>(dimension).fill(0);
		for (const char of text) {
			vector[char.codePointAt(0)! % dimension] += 1;
		}
		const norm = Math.hypot(...vector) || 1;
		return vector.map((value) => value / norm);
	};

	const sparse = async (text: string): Promise<{ indices: number[]; values: number[] }> => {
		const tokens = text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);
		const counts = new Map<number, number>();
		for (const token of tokens) {
			let hash = 0;
			for (const char of token) {
				hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
			}
			const bucket = hash % DEFAULT_SPARSE_BUCKETS;
			counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
		}
		const total = tokens.length || 1;
		const indices: number[] = [];
		const values: number[] = [];
		for (const [index, count] of counts.entries()) {
			indices.push(index);
			values.push(count / total);
		}
		return { indices, values };
	};

	return { dense, sparse };
}
