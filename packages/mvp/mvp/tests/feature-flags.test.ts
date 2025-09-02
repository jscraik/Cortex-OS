import { describe, expect, it } from "vitest";

class FeatureFlagManager {
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

describe("Feature Flag System", () => {
	it("should manage feature flags through configuration", () => {
		const flags = new FeatureFlagManager({
			"mcp-integration": true,
			"deterministic-mode": false,
			"teaching-layer": true,
		});

		expect(flags.isEnabled("mcp-integration")).toBe(true);
		expect(flags.isEnabled("deterministic-mode")).toBe(false);
	});

	it("should fail closed on unknown flags", () => {
		const flags = new FeatureFlagManager({});

		// Unknown flags should default to false (fail closed)
		expect(flags.isEnabled("unknown-feature")).toBe(false);
	});

	it("should support runtime flag updates", () => {
		const flags = new FeatureFlagManager({
			"test-feature": false,
		});

		expect(flags.isEnabled("test-feature")).toBe(false);

		flags.updateFlag("test-feature", true);
		expect(flags.isEnabled("test-feature")).toBe(true);
	});

	it("should track error budgets per feature", () => {
		const flags = new FeatureFlagManager({
			"error-prone-feature": true,
		});

		// Track errors and disable feature when budget exceeded
		flags.trackError("error-prone-feature");
		flags.trackError("error-prone-feature");
		flags.trackError("error-prone-feature");

		// Should disable feature after 3 errors (default budget)
		expect(flags.isEnabled("error-prone-feature")).toBe(false);
	});
});
