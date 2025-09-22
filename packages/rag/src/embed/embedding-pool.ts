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

interface Slot {
	id: number;
	busy: boolean;
	isActive: boolean;
	lastStartAt?: number;
	lastEndAt?: number;
	lastErrorAt?: number;
	lastDurationMs?: number;
	tasks: number; // completed tasks
	texts: number; // total texts processed
	emaTps: number; // exponential moving avg of texts/sec
}

export interface PoolDebugInfo {
	label: string;
	workers: number;
	inflight: number;
	queue: number;
	slots: Array<Omit<Slot, 'emaTps'> & { emaTps: number }>; // expose read-only slot snapshot
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
	private readonly slots: Slot[] = [];
	private nextSlotId = 0;

	constructor(inner: Embedder, options?: EmbeddingPoolOptions) {
		this.inner = inner;
		this.opt = this.normalizeOptions(options);
		this.currentWorkers = this.opt.minWorkers;
		this.initSlots(this.currentWorkers);
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

	debug(): PoolDebugInfo {
		return {
			label: this.opt.label,
			workers: this.currentWorkers,
			inflight: this.inflight,
			queue: this.queue.length,
			slots: this.slots.map((s) => ({ ...s })),
		};
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

	private initSlots(n: number): void {
		for (let i = 0; i < n; i++) this.slots.push(this.createSlot(true));
	}

	private createSlot(active: boolean): Slot {
		return {
			id: this.nextSlotId++,
			busy: false,
			isActive: active,
			tasks: 0,
			texts: 0,
			emaTps: 0,
		};
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
			this.activateOneSlotIfNeeded();
		}
	}

	private maybeScaleDown(): void {
		if (this.currentWorkers <= this.opt.minWorkers) return;
		const idle = Date.now() - this.lastActiveAt;
		const perWorker = Math.ceil(this.queue.length / Math.max(1, this.currentWorkers));
		if (idle >= this.opt.idleMillisBeforeScaleDown && perWorker <= this.opt.scaleDownAt) {
			this.currentWorkers--;
			this.deactivateOneIdleIfTooManyActive();
		}
	}

	private pump(): void {
		if (this.shuttingDown) return;
		while (this.inflight < this.currentWorkers && this.queue.length > 0) {
			const slot = this.pickFreeSlot();
			if (!slot) break;
			const t = this.queue.shift();
			if (!t) break;
			this.runTask(slot, t).catch(() => {});
		}
	}

	private async runTask(slot: Slot, task: Task): Promise<void> {
		this.onTaskStart(slot);
		try {
			const start = Date.now();
			const embs = await this.inner.embed(task.texts);
			this.onTaskSuccess(slot, task, start);
			const pairs = embs.map((v, i) => ({ idx: task.mapTo[i], v }));
			task.resolve(pairs);
			this.failures = 0;
		} catch (e) {
			this.onTaskFailure(slot);
			this.failures++;
			task.reject(e);
			if (
				this.failures >= this.opt.failureRestartThreshold &&
				this.currentWorkers > this.opt.minWorkers
			) {
				this.currentWorkers--; // shed a bad slot
				this.deactivateOneIdleIfTooManyActive();
				this.failures = 0;
			}
		} finally {
			this.onTaskFinally();
		}
	}

	private onTaskStart(slot: Slot): void {
		this.inflight++;
		this.lastActiveAt = Date.now();
		slot.busy = true;
		slot.lastStartAt = this.lastActiveAt;
		this.emitUtilization();
	}

	private onTaskSuccess(slot: Slot, task: Task, start: number): void {
		const durationMs = Date.now() - start;
		slot.lastEndAt = Date.now();
		slot.lastDurationMs = durationMs;
		slot.tasks++;
		slot.texts += task.texts.length;
		const tps = task.texts.length / Math.max(0.001, durationMs / 1000);
		slot.emaTps = this.updateEma(slot.emaTps, tps);
		slot.busy = false;
	}

	private onTaskFailure(slot: Slot): void {
		slot.lastErrorAt = Date.now();
		slot.busy = false;
	}

	private onTaskFinally(): void {
		this.inflight--;
		this.emitUtilization();
		this.maybeScaleDown();
		this.deactivateOneIdleIfTooManyActive();
		if (this.queue.length > 0) this.pump();
	}

	private pickFreeSlot(): Slot | undefined {
		return this.slots.find((s) => s.isActive && !s.busy);
	}

	private activateOneSlotIfNeeded(): void {
		const active = this.slots.filter((s) => s.isActive).length;
		if (active >= this.currentWorkers) return;
		const idleInactive = this.slots.find((s) => !s.isActive);
		if (idleInactive) {
			idleInactive.isActive = true;
			return;
		}
		this.slots.push(this.createSlot(true));
	}

	private deactivateOneIdleIfTooManyActive(): void {
		const active = this.slots.filter((s) => s.isActive).length;
		if (active <= this.currentWorkers) return;
		const candidate = this.slots.find((s) => s.isActive && !s.busy);
		if (candidate) candidate.isActive = false;
	}

	private updateEma(current: number, value: number): number {
		const alpha = 0.3;
		return current === 0 ? value : alpha * value + (1 - alpha) * current;
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
