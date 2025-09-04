/**
 * @file lib/feature-flags.ts
 * @description Feature flag management system
 * @author Cortex-OS Team
 * @version 1.0.0
 */

export class FeatureFlagManager {
	private flags: Map<string, boolean>;
	private errorBudgets: Map<string, number>;

	constructor(initialFlags: Record<string, boolean> = {}) {
		this.flags = new Map(Object.entries(initialFlags));
		this.errorBudgets = new Map();
	}

	isEnabled(flagName: string): boolean {
		// Fail closed on unknown flags
		return this.flags.get(flagName) ?? false;
	}

	updateFlag(flagName: string, enabled: boolean): void {
		this.flags.set(flagName, enabled);
	}

	trackError(featureName: string): void {
		const current = this.errorBudgets.get(featureName) || 0;
		const updated = current + 1;
		this.errorBudgets.set(featureName, updated);

		// Disable feature after 3 errors (default budget)
		if (updated >= 3) {
			this.flags.set(featureName, false);
		}
	}
}
