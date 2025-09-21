export interface QwenEmbeddingOptions {
    dimensions?: number; // defaults to 1024
    maxBatchMemory?: number; // bytes, defaults to 64MB
}

// Minimal tensor-like object for tests
export class TestTensor {
    private released = false;
    private buffer: Float32Array;

    constructor(size: number) {
        this.buffer = new Float32Array(size);
    }

    data(): Float32Array {
        if (this.released) throw new Error('Tensor released');
        return this.buffer;
    }

    release(): void {
        this.released = true;
        // Help GC: drop reference
        // @ts-expect-error - explicit break reference for tests
        this.buffer = undefined;
    }
}

export class QwenEmbedding {
    private readonly dims: number;
    private readonly maxBatchBytes: number;

    constructor(opts: QwenEmbeddingOptions = {}) {
        this.dims = opts.dimensions ?? 1024;
        this.maxBatchBytes = opts.maxBatchMemory ?? 64 * 1024 * 1024; // 64MB default
    }

    async encode(text: string): Promise<TestTensor> {
        const t = new TestTensor(this.dims);
        // Initialize deterministically so tests can read .data() if needed
        const buf = t.data();
        let seed = 0;
        for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);
        for (let i = 0; i < buf.length; i++) {
            buf[i] = ((seed + i) % 100) / 100;
        }
        return t;
    }

    releaseTensor(tensor: TestTensor): void {
        tensor.release();
    }

    async batchProcess(texts: string[]): Promise<TestTensor[][]> {
        // Simulate additional intermediate buffers during embedding (attention, activations, etc.)
        const overheadFactor = 16; // tunable: increases per-item memory footprint
        const bytesPerItem = this.dims * 4 * overheadFactor; // float32 * overhead
        const effectiveBytes = Math.max(1, this.maxBatchBytes - 1024 * 16); // reserve some overhead
        const maxPerBatch = Math.max(1, Math.floor(effectiveBytes / bytesPerItem));
        const batches: TestTensor[][] = [];
        for (let i = 0; i < texts.length; i += maxPerBatch) {
            const slice = texts.slice(i, i + maxPerBatch);
            const tensors: TestTensor[] = [];
            for (const s of slice) {
                tensors.push(await this.encode(s));
            }
            batches.push(tensors);
        }
        return batches;
    }
}
