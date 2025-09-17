/**
 * Simple adaptive speculation step planner inspired by
 * Dynamic Speculative Planning (Guan et al., 2025).
 */
export interface DSPConfig {
	initialStep?: number;
	maxStep?: number;
}

export class DynamicSpeculativePlanner {
	public currentStep: number;
	private readonly maxStep: number;

	constructor(config: DSPConfig = {}) {
		const { initialStep = 1, maxStep = 4 } = config;
		this.currentStep = initialStep;
		this.maxStep = maxStep;
	}

	update(success: boolean): number {
		if (success) {
			this.currentStep = Math.min(this.currentStep + 1, this.maxStep);
		} else {
			this.currentStep = Math.max(this.currentStep - 1, 1);
		}
		return this.currentStep;
	}
}
