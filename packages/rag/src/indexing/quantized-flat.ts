import type { VectorIndex } from './vector-index.js';

// Helper: L2 distance
function l2(a: number[] | Float32Array, b: number[] | Float32Array): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) {
		const d = Number(a[i]) - Number(b[i]);
		s += d * d;
	}
	return Math.sqrt(s);
}

// Helper: normalize vector to unit norm (for cosine similarity via L2)
function normalize(v: number[]): Float32Array {
	let n2 = 0;
	for (let i = 0; i < v.length; i++) n2 += v[i] * v[i];
	const n = Math.sqrt(n2) || 1;
	const out = new Float32Array(v.length);
	for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
	return out;
}

// Scalar quantization: per-dimension uniform 8-bit
export class ScalarQuantizedFlatIndex implements VectorIndex {
	private dim = 0;
	private codes: Array<{ id: string; q: Uint8Array }> = [];
	private scale: Float32Array | undefined;
	private zero: Float32Array | undefined;

	async init(dimension: number): Promise<void> {
		this.dim = dimension;
		this.codes = [];
		this.scale = undefined;
		this.zero = undefined;
	}

	private ensureParams(entries: Array<{ id: string; vector: number[] }>) {
		if (this.scale && this.zero) return;
		const min = new Float32Array(this.dim);
		const max = new Float32Array(this.dim);
		min.fill(Infinity);
		max.fill(-Infinity);
		for (const e of entries) {
			for (let i = 0; i < this.dim; i++) {
				const v = e.vector[i];
				if (v < min[i]) min[i] = v;
				if (v > max[i]) max[i] = v;
			}
		}
		const scale = new Float32Array(this.dim);
		const zero = new Float32Array(this.dim);
		for (let i = 0; i < this.dim; i++) {
			const range = max[i] - min[i] || 1e-9;
			scale[i] = range / 255;
			zero[i] = min[i];
		}
		this.scale = scale;
		this.zero = zero;
	}

	private quantizeVec(vec: number[]): Uint8Array {
		if (!this.scale || !this.zero) throw new Error('Quantizer not initialized');
		const q = new Uint8Array(this.dim);
		for (let i = 0; i < this.dim; i++) {
			const qv = Math.max(0, Math.min(255, Math.round((vec[i] - this.zero[i]) / this.scale[i])));
			q[i] = qv;
		}
		return q;
	}

	private dequantize(q: Uint8Array): Float32Array {
		if (!this.scale || !this.zero) throw new Error('Quantizer not initialized');
		const v = new Float32Array(this.dim);
		for (let i = 0; i < this.dim; i++) v[i] = this.zero[i] + this.scale[i] * q[i];
		return v;
	}

	async add(id: string, vector: number[]): Promise<void> {
		if (vector.length !== this.dim)
			throw new Error(`Vector dimension ${vector.length} != index dimension ${this.dim}`);
		if (!this.scale || !this.zero) this.ensureParams([{ id, vector }]);
		const q = this.quantizeVec(vector);
		this.codes.push({ id, q });
	}

	async addBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void> {
		this.ensureParams(entries);
		for (const e of entries) await this.add(e.id, e.vector);
	}

	async query(vector: number[], topK: number): Promise<Array<{ id: string; distance: number }>> {
		// Approximate cosine by L2 on normalized dequantized codes
		const qnorm = normalize(vector);
		const scored = this.codes.map((e) => {
			const v = this.dequantize(e.q);
			const vnorm = normalize(Array.from(v));
			return { id: e.id, distance: l2(qnorm, vnorm) };
		});
		scored.sort((a, b) => a.distance - b.distance);
		return scored.slice(0, topK);
	}

	size(): number {
		return this.codes.length;
	}
}

// Simple Product Quantization implementation (training with tiny k-means per subspace)
export interface PQOptions {
	m?: number; // number of subspaces (must divide dim)
	k?: number; // centroids per subspace (e.g., 16 or 256)
	iters?: number; // training iterations
}

export class PQFlatIndex implements VectorIndex {
	private dim = 0;
	private m = 8;
	private k = 16;
	private iters = 5;
	private subDim = 0;
	// codebooks: m arrays of k centroids (Float32Array of length subDim for each centroid)
	private codebooks: Float32Array[] = [];
	// stored codes: for each vector, Uint8Array of length m (code per subspace)
	private codes: Array<{ id: string; codes: Uint8Array }> = [];
	private trained = false;
	private trainBuffer: number[][] = [];

	private concatCodebooks(): Buffer {
		const totalCb = this.codebooks.reduce((s, cb) => s + cb.byteLength, 0);
		const out = Buffer.allocUnsafe(totalCb);
		let off = 0;
		for (const cb of this.codebooks) {
			const buf = Buffer.from(cb.buffer, cb.byteOffset, cb.byteLength);
			buf.copy(out, off);
			off += cb.byteLength;
		}
		return out;
	}

	private buildCodesBuffer(): Buffer {
		const buf = Buffer.allocUnsafe(this.codes.length * this.m);
		for (let i = 0; i < this.codes.length; i++) {
			Buffer.from(this.codes[i].codes).copy(buf, i * this.m);
		}
		return buf;
	}

	constructor(opts: PQOptions = {}) {
		if (opts.m) this.m = opts.m;
		if (opts.k) this.k = opts.k;
		if (opts.iters) this.iters = opts.iters;
	}

	async init(dimension: number): Promise<void> {
		this.dim = dimension;
		if (this.dim % this.m !== 0)
			throw new Error(`dim ${this.dim} must be divisible by m=${this.m}`);
		this.subDim = this.dim / this.m;
		this.codebooks = [];
		this.codes = [];
		this.trained = false;
		this.trainBuffer = [];
	}

	private subvec(v: number[] | Float32Array, si: number): Float32Array {
		const start = si * this.subDim;
		return Float32Array.from((v as number[]).slice(start, start + this.subDim));
	}

	private kmeans(data: Float32Array[], k: number, iters: number): Float32Array[] {
		// Initialize centroids by sampling
		const centroids: Float32Array[] = [];
		for (let i = 0; i < k; i++) centroids.push(data[Math.floor((i * data.length) / k)]);
		const assign = new Array<number>(data.length).fill(0);
		for (let it = 0; it < iters; it++) {
			// Assign
			for (let i = 0; i < data.length; i++) {
				let best = 0;
				let bestD = Infinity;
				for (let c = 0; c < k; c++) {
					const d = l2(data[i], centroids[c]);
					if (d < bestD) {
						bestD = d;
						best = c;
					}
				}
				assign[i] = best;
			}
			// Update
			const sums: number[][] = Array.from({ length: k }, () => Array(this.subDim).fill(0));
			const counts = new Array<number>(k).fill(0);
			for (let i = 0; i < data.length; i++) {
				const a = assign[i];
				counts[a]++;
				for (let d = 0; d < this.subDim; d++) sums[a][d] += data[i][d];
			}
			for (let c = 0; c < k; c++) {
				if (counts[c] === 0) continue;
				const centroid = new Float32Array(this.subDim);
				for (let d = 0; d < this.subDim; d++) centroid[d] = sums[c][d] / counts[c];
				centroids[c] = centroid;
			}
		}
		return centroids;
	}

	private train(data: number[][]): void {
		// Build codebooks per subspace
		this.codebooks = [];
		for (let si = 0; si < this.m; si++) {
			const subData = data.map((v) => this.subvec(v, si));
			const cb = this.kmeans(subData, this.k, this.iters);
			// Flatten codebook for efficient lookup
			const flat = new Float32Array(this.k * this.subDim);
			for (let c = 0; c < this.k; c++) flat.set(cb[c], c * this.subDim);
			this.codebooks.push(flat);
		}
		this.trained = true;
	}

	private encodeVec(v: number[]): Uint8Array {
		if (!this.trained) throw new Error('PQ not trained');
		const codes = new Uint8Array(this.m);
		for (let si = 0; si < this.m; si++) {
			const sub = this.subvec(v, si);
			const book = this.codebooks[si];
			let best = 0;
			let bestD = Infinity;
			for (let c = 0; c < this.k; c++) {
				const centroid = book.subarray(c * this.subDim, (c + 1) * this.subDim);
				const d = l2(sub, centroid);
				if (d < bestD) {
					bestD = d;
					best = c;
				}
			}
			codes[si] = best;
		}
		return codes;
	}

	private adcDistance(query: number[], codes: Uint8Array): number {
		// Asymmetric distance: sum L2 between query subvec and centroid for each subspace
		let sum = 0;
		for (let si = 0; si < this.m; si++) {
			const code = codes[si];
			const centroid = this.codebooks[si].subarray(code * this.subDim, (code + 1) * this.subDim);
			const sub = this.subvec(query, si);
			const d = l2(sub, centroid);
			sum += d;
		}
		return sum;
	}

	async add(id: string, vector: number[]): Promise<void> {
		if (vector.length !== this.dim)
			throw new Error(`Vector dimension ${vector.length} != index dimension ${this.dim}`);
		// Buffer until trained
		if (!this.trained) {
			this.trainBuffer.push(vector);
			// Train once buffer reaches threshold (k * some factor)
			if (this.trainBuffer.length >= this.k * 10) {
				this.train(this.trainBuffer);
				// Encode buffered
				for (const v of this.trainBuffer)
					this.codes.push({ id: `buf-${this.codes.length}`, codes: this.encodeVec(v) });
				this.trainBuffer = [];
			}
			// For now, also encode if trained already
		}
		if (this.trained) {
			this.codes.push({ id, codes: this.encodeVec(vector) });
		}
	}

	async addBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void> {
		if (!this.trained) {
			this.train(entries.map((e) => e.vector));
		}
		for (const e of entries) await this.add(e.id, e.vector);
	}

	async query(vector: number[], topK: number): Promise<Array<{ id: string; distance: number }>> {
		if (!this.trained) throw new Error('PQ not trained');
		// Normalize to make ADC approximate cosine when vectors are unit
		const vnorm = Array.from(normalize(vector));
		const scored = this.codes.map((e) => ({
			id: e.id,
			distance: this.adcDistance(vnorm, e.codes),
		}));
		scored.sort((a, b) => a.distance - b.distance);
		return scored.slice(0, topK);
	}

	size(): number {
		return this.codes.length;
	}

	// --- Persistence (non-VectorIndex API) ---
	// Saves codebooks and codes with ids. Writes three files using the given base path.
	async save(basePath: string): Promise<void> {
		if (!this.trained) throw new Error('PQ not trained');
		const fs = await import('node:fs');
		const path = await import('node:path');
		const base = basePath.endsWith('.pq') ? basePath.slice(0, -3) : basePath;
		try {
			fs.mkdirSync(path.dirname(base), { recursive: true });
		} catch {
			// ignore: directory may already exist or filesystem may be read-only in tests
		}
		const meta = {
			dim: this.dim,
			m: this.m,
			k: this.k,
			iters: this.iters,
			subDim: this.subDim,
			size: this.codes.length,
		};
		fs.writeFileSync(`${base}.pq.meta.json`, JSON.stringify(meta));
		fs.writeFileSync(`${base}.pq.codebooks.bin`, this.concatCodebooks());
		const ids = this.codes.map((c) => c.id);
		fs.writeFileSync(`${base}.pq.ids.json`, JSON.stringify(ids));
		fs.writeFileSync(`${base}.pq.codes.bin`, this.buildCodesBuffer());
	}

	// Loads codebooks and codes saved by save(). Clears any existing state.
	async load(basePath: string): Promise<void> {
		const fs = await import('node:fs');
		const base = basePath.endsWith('.pq') ? basePath.slice(0, -3) : basePath;
		const meta = JSON.parse(fs.readFileSync(`${base}.pq.meta.json`, 'utf-8')) as {
			dim: number;
			m: number;
			k: number;
			iters: number;
			subDim: number;
			size: number;
		};
		this.dim = meta.dim;
		this.m = meta.m;
		this.k = meta.k;
		this.iters = meta.iters;
		this.subDim = meta.subDim;
		// Rebuild codebooks
		const cbRaw = fs.readFileSync(`${base}.pq.codebooks.bin`);
		const perCbBytes = this.k * this.subDim * 4;
		this.codebooks = [];
		for (let si = 0; si < this.m; si++) {
			const start = si * perCbBytes;
			const slice = cbRaw.subarray(start, start + perCbBytes);
			this.codebooks.push(new Float32Array(slice.buffer, slice.byteOffset, slice.byteLength / 4));
		}
		// Load ids and codes
		const ids: string[] = JSON.parse(fs.readFileSync(`${base}.pq.ids.json`, 'utf-8'));
		const codesRaw = fs.readFileSync(`${base}.pq.codes.bin`);
		this.codes = new Array(ids.length);
		for (let i = 0; i < ids.length; i++) {
			const view = new Uint8Array(codesRaw.buffer, codesRaw.byteOffset + i * this.m, this.m);
			this.codes[i] = { id: ids[i], codes: Uint8Array.from(view) };
		}
		this.trained = true;
		this.trainBuffer = [];
	}
}

// Storage estimators (approximate): useful for tests/benchmarks without heavy memory sampling
export const estimateFlatBytes = (N: number, dim: number): number => {
	if (N <= 0 || dim <= 0) return 0;
	return N * dim * 4; // float32 approximation
};

export const estimatePQBytes = (N: number, dim: number, m: number, k: number): number => {
	if (N <= 0 || dim <= 0 || m <= 0 || k <= 0) return 0;
	const subDim = Math.floor(dim / m) || 1;
	const codebooksBytes = m * k * subDim * 4; // float32 codebooks
	const codesBytes = N * m; // 1 byte per subspace code
	// minimal meta/ids overhead ignored for estimation
	return codebooksBytes + codesBytes;
};
