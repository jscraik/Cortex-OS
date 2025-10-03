import { type N0State } from '../n0-state.js';
import type { ThermalDecision, ThermalEvent } from '../thermal/thermal-policy.js';
export declare const THERMAL_CTX_KEY = 'thermal';
export interface ThermalCheckpoint {
	timestamp: number;
	level: ThermalDecision['level'];
	reason: string;
	throttleHint?: string;
	resumedAt?: number;
}
export interface ThermalResponse {
	action: 'pause' | 'resume' | 'cooldown';
	at: number;
	throttleHint?: string;
	fallbackProvider?: string;
	cooldownUntil?: number;
}
export interface ThermalContext {
	pendingEvent?: ThermalEvent;
	lastEvent?: ThermalEvent;
	paused: boolean;
	cooldownUntil?: number;
	checkpoints: ThermalCheckpoint[];
	lastResponse?: ThermalResponse;
}
export declare function getThermalContext(state: N0State): ThermalContext;
export declare function enqueueThermalEvent(state: N0State, event: ThermalEvent): N0State;
export declare function applyThermalDecision(
	state: N0State,
	decision: ThermalDecision,
	timestamp: number,
): N0State;
export declare function markThermalResume(state: N0State, timestamp: number): N0State;
export declare function holdForCooldown(state: N0State, now: number): N0State;
//# sourceMappingURL=thermal-history.d.ts.map
