export type DSPConfig = {
	initialStep?: number;
	maxStep?: number;
};

export class DynamicSpeculativePlanner {
	private _current: number;
	private readonly max: number;
	constructor(config?: DSPConfig) {
		this._current = Math.max(0, Math.floor(config?.initialStep ?? 0));
		this.max = Math.max(this._current, Math.floor(config?.maxStep ?? 0));
	}
	get currentStep(): number {
		return this._current;
	}
	update(success: boolean): void {
		if (success) {
			this._current = Math.min(this.max, this._current + 1);
		} else {
			this._current = Math.max(0, this._current - 1);
		}
	}
}

/**
 * Simulates dynamic speculative planning over a series of outcomes.
 * Returns the step used before each outcome update.
 */
export function simulateDSP(outcomes: boolean[], config?: DSPConfig): number[] {
	const planner = new DynamicSpeculativePlanner(config);
	return outcomes.map((result) => {
		const step = planner.currentStep;
		planner.update(result);
		return step;
	});
}
