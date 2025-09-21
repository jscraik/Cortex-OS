import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import type { Embedder } from '../lib/types.js';

export interface EmbeddingPoolOptions {
	minWorkers?: number;
	maxWorkers?: number;
	maxQueueSize?: number;
	batchSize?: number;
	scaleUpAt?: number; // tasks per worker to trigger scale up
	scaleDownAt?: number; // tasks per worker to allow scale down
	idleMillisBeforeScaleDown?: number;
	failureRestartThreshold?: number;
	label?: string; // metrics label base
}

interface Task {
	texts: string[];
	mapTo: number[]; // indices into result array
	resolve: (embs: Array<{ idx: number; v: number[] }>) => void;
	reject: (e: unknown) => void;
}

interface Stats {
	currentWorkers: number;
	inflight: number;
	queueDepth: number;
	utilization: number; // inflight/currentWorkers
}

export class PooledEmbedder implements Embedder {
	private readonly inner: Embedder;
	private readonly opt: Required<EmbeddingPoolOptions>;
	private currentWorkers: number;
	private inflight = 0;
	private readonly queue: Task[] = [];
	private lastActiveAt = Date.now();
	private failures = 0;
	private shuttingDown = false;

	constructor(inner: Embedder, options?: EmbeddingPoolOptions) {
		this.inner = inner;
		this.opt = this.normalizeOptions(options);
		this.currentWorkers = this.opt.minWorkers;
	}

	async embed(texts: string[]): Promise<number[][]> {
		const runId = generateRunId();
		const start = Date.now();
		const result: number[][] = new Array(texts.length);
		const tasks = this.partition(texts);
		this.enqueueMany(tasks);
		const promises = tasks.map(
			(t) =>
				new Promise<void>((resolve, reject) => {
					t.resolve = (pairs) => {
						for (const { idx, v } of pairs) result[idx] = v;
						resolve();
					};
					t.reject = reject;
				}),
		);
		try {
			await Promise.all(promises);
			this.recordOk(start, runId);
			return result;
		} catch (e) {
			this.recordFail(start, runId);
			throw e;
		}
	}

	stats(): Stats {
		const util = this.currentWorkers > 0 ? this.inflight / this.currentWorkers : 0;
		return {
			currentWorkers: this.currentWorkers,
			inflight: this.inflight,
			queueDepth: this.queue.length,
			utilization: Math.max(0, Math.min(1, util)),
		};
	}

	health(): { healthy: boolean; workers: number; queue: number; inflight: number } {
		const s = this.stats();
		const healthy = !this.shuttingDown && this.failures === 0;
		return { healthy, workers: s.currentWorkers, queue: s.queueDepth, inflight: s.inflight };
	}

	async close(): Promise<void> {
		this.shuttingDown = true;
		// Wait for inflight tasks to drain
		while (this.inflight > 0) await new Promise((r) => setTimeout(r, 5));
	}

	private normalizeOptions(o?: EmbeddingPoolOptions): Required<EmbeddingPoolOptions> {
		return {
			minWorkers: Math.max(1, o?.minWorkers ?? 1),
			maxWorkers: Math.max(o?.minWorkers ?? 1, o?.maxWorkers ?? 4),
			maxQueueSize: o?.maxQueueSize ?? 1000,
			batchSize: Math.max(1, o?.batchSize ?? 16),
			scaleUpAt: Math.max(1, o?.scaleUpAt ?? 2),
			scaleDownAt: Math.max(0, o?.scaleDownAt ?? 0),
			idleMillisBeforeScaleDown: o?.idleMillisBeforeScaleDown ?? 500,
			failureRestartThreshold: o?.failureRestartThreshold ?? 3,
			label: o?.label ?? 'rag.embed.pool',
		} as Required<EmbeddingPoolOptions>;
	}

	private partition(texts: string[]): Task[] {
		const tasks: Task[] = [];
		for (let i = 0; i < texts.length; i += this.opt.batchSize) {
			const batch = texts.slice(i, i + this.opt.batchSize);
			const idxs = Array.from({ length: batch.length }, (_, j) => i + j);
			tasks.push({ texts: batch, mapTo: idxs, resolve: () => {}, reject: () => {} });
		}
		return tasks;
	}

	private enqueueMany(tasks: Task[]): void {
		if (this.queue.length + tasks.length > this.opt.maxQueueSize) {
			throw new Error('Backpressure: embed queue full');
		}
		for (const t of tasks) this.queue.push(t);
		this.lastActiveAt = Date.now();
		this.maybeScaleUp();
		this.pump();
		this.emitQueueMetrics();
	}

	private maybeScaleUp(): void {
		const perWorker = Math.ceil(this.queue.length / Math.max(1, this.currentWorkers));
		if (perWorker >= this.opt.scaleUpAt && this.currentWorkers < this.opt.maxWorkers) {
			this.currentWorkers++;
		}
	}

	private maybeScaleDown(): void {
		if (this.currentWorkers <= this.opt.minWorkers) return;
		const idle = Date.now() - this.lastActiveAt;
		const perWorker = Math.ceil(this.queue.length / Math.max(1, this.currentWorkers));
		if (idle >= this.opt.idleMillisBeforeScaleDown && perWorker <= this.opt.scaleDownAt) {
			this.currentWorkers--;
		}
	}

	private pump(): void {
		if (this.shuttingDown) return;
		while (this.inflight < this.currentWorkers && this.queue.length > 0) {
			const t = this.queue.shift();
			if (!t) break;
			this.runTask(t).catch(() => {});
		}
	}

	private async runTask(task: Task): Promise<void> {
		this.inflight++;
		this.lastActiveAt = Date.now();
		this.emitUtilization();
		try {
			const embs = await this.inner.embed(task.texts);
			const pairs = embs.map((v, i) => ({ idx: task.mapTo[i], v }));
			task.resolve(pairs);
			this.failures = 0;
		} catch (e) {
			this.failures++;
			task.reject(e);
			if (
				this.failures >= this.opt.failureRestartThreshold &&
				this.currentWorkers > this.opt.minWorkers
			) {
				this.currentWorkers--; // shed a bad slot
				this.failures = 0;
			}
		} finally {
			this.inflight--;
			this.emitUtilization();
			this.maybeScaleDown();
			if (this.queue.length > 0) this.pump();
		}
	}

	private recordOk(start: number, runId: string): void {
		const ms = Date.now() - start;
		recordLatency(`${this.opt.label}.total_ms`, ms, { component: 'rag' });
		recordOperation(this.opt.label, true, runId, { component: 'rag' });
	}

	private recordFail(start: number, runId: string): void {
		const ms = Date.now() - start;
		recordLatency(`${this.opt.label}.total_ms`, ms, { component: 'rag' });
		recordOperation(this.opt.label, false, runId, { component: 'rag' });
	}

	private emitQueueMetrics(): void {
		recordLatency(`${this.opt.label}.queue_depth`, this.queue.length, { component: 'rag' });
	}

	private emitUtilization(): void {
		const util = this.currentWorkers > 0 ? this.inflight / this.currentWorkers : 0;
		recordLatency(`${this.opt.label}.utilization`, util, { component: 'rag' });
	}
}

export function createPooledEmbedder(
	inner: Embedder,
	options?: EmbeddingPoolOptions,
): PooledEmbedder {
	return new PooledEmbedder(inner, options);
}
