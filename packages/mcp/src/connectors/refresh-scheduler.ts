import { randomInt } from 'node:crypto';
import type { ServerLogger } from '../server.js';

export interface Clock {
	now(): number;
}

export interface RandomSource {
	next(): number;
}

const defaultClock: Clock = { now: () => Date.now() };
const defaultRandom: RandomSource = {
        next: () => randomInt(0, 1_000_000) / 1_000_000,
};

export interface RefreshSchedulerOptions {
	intervalMs: number;
	jitterFactor?: number;
	onRefresh: () => Promise<void>;
	logger: ServerLogger;
	clock?: Clock;
	random?: RandomSource;
}

export class RefreshScheduler {
	private timer: NodeJS.Timeout | null = null;
	private running = false;
	private readonly clock: Clock;
	private readonly random: RandomSource;

	constructor(private readonly options: RefreshSchedulerOptions) {
		if (options.intervalMs <= 0 || !Number.isFinite(options.intervalMs)) {
			throw new Error('Refresh interval must be a positive number of milliseconds');
		}

		this.clock = options.clock ?? defaultClock;
		this.random = options.random ?? defaultRandom;
	}

	start(): void {
		if (this.running) {
			return;
		}

		this.running = true;
		this.scheduleNext();
	}

	stop(): void {
		this.running = false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	async forceRefresh(): Promise<void> {
		await this.executeRefresh();
	}

	private scheduleNext(): void {
		if (!this.running) {
			return;
		}

		const jitterFactor = this.options.jitterFactor ?? 0.2;
		const sample = this.random.next();
		const clampedSample = Math.min(Math.max(sample, 0), 1);
		const jitterOffset = (clampedSample * 2 - 1) * jitterFactor;
		const delay = Math.max(100, Math.floor(this.options.intervalMs * (1 + jitterOffset)));

		this.timer = setTimeout(() => {
			void this.executeRefresh();
		}, delay);
	}

	private async executeRefresh(): Promise<void> {
		const startedAt = this.clock.now();

		try {
			await this.options.onRefresh();
			this.options.logger.info(
				{ brand: 'brAInwav', startedAt, durationMs: this.clock.now() - startedAt },
				'Refresh completed',
			);
		} catch (error) {
			this.options.logger.warn(
				{ brand: 'brAInwav', error: error instanceof Error ? error.message : error },
				'Refresh failed',
			);
		} finally {
			this.scheduleNext();
		}
	}
}
