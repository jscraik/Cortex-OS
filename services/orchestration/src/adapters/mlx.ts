import {
	AvailabilityError,
	type AvailabilityProbe,
	ensureAvailability,
	type ModelAdapter,
	type ModelInvocationContext,
	type ModelInvocationResult,
} from './base.js';

export interface MlxRunner {
	generate(prompt: string, options?: Record<string, unknown>): Promise<string>;
}

export interface MlxAdapterOptions {
	runner: MlxRunner;
	availabilityProbe?: AvailabilityProbe;
	clock?: () => number;
}

export class MlxAdapter implements ModelAdapter {
	readonly name = 'mlx';

	private readonly runner: MlxRunner;
	private readonly probe: AvailabilityProbe;
	private readonly clock: () => number;

	constructor(options: MlxAdapterOptions) {
		if (!options.runner) {
			throw new AvailabilityError('brAInwav MLX adapter requires a runner instance');
		}

		this.runner = options.runner;
		this.probe = options.availabilityProbe ?? (() => true);
		this.clock = options.clock ?? (() => Date.now());
	}

	async isAvailable(): Promise<boolean> {
		return ensureAvailability(this.probe);
	}

	async invoke(context: ModelInvocationContext): Promise<ModelInvocationResult> {
		const isReady = await this.isAvailable();

		if (!isReady) {
			throw new AvailabilityError('brAInwav MLX runtime is not available');
		}

		const startedAt = this.clock();
		const output = await this.runner.generate(context.prompt, context.variables);
		const latencyMs = this.clock() - startedAt;

		return {
			output,
			latencyMs,
			provider: this.name,
			metadata: {
				variables: context.variables ?? {},
			},
		};
	}
}
