import type { N0State } from '../n0-state.js';
import type { ThermalDecision, ThermalPolicy } from '../thermal/thermal-policy.js';
export interface ThermalGuardState {
	input: string;
	output?: string;
	ctx?: Record<string, unknown>;
	session?: N0State['session'];
	budget?: N0State['budget'];
	selectedModel?: {
		provider: string;
		model: string;
	};
	[key: string]: unknown;
}
export type ThermalGuardPatch = Partial<ThermalGuardState>;
export interface ThermalGuardOptions<_TState extends ThermalGuardState> {
	policy: ThermalPolicy;
	clock?: () => number;
	onPause?: (decision: ThermalDecision, state: N0State) => ThermalGuardPatch;
	onResume?: (state: N0State) => ThermalGuardPatch;
}
type GuardNode<TState extends ThermalGuardState> = (
	state: TState,
) => ThermalGuardPatch | Promise<ThermalGuardPatch>;
export declare function withThermalGuard<TState extends ThermalGuardState>(
	node: GuardNode<TState>,
	options: ThermalGuardOptions<TState>,
): GuardNode<TState>;
//# sourceMappingURL=thermal-guard.d.ts.map
