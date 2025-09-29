import { mergeN0State, type N0State } from '../n0-state.js';
import type { ThermalDecision, ThermalEvent } from '../thermal/thermal-policy.js';

export const THERMAL_CTX_KEY = 'thermal';

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

export function getThermalContext(state: N0State): ThermalContext {
	const ctx = (state.ctx?.[THERMAL_CTX_KEY] as Partial<ThermalContext> | undefined) ?? {};
	return {
		pendingEvent: ctx.pendingEvent,
		lastEvent: ctx.lastEvent,
		paused: ctx.paused ?? false,
		cooldownUntil: ctx.cooldownUntil,
		checkpoints: ctx.checkpoints ? [...ctx.checkpoints] : [],
		lastResponse: ctx.lastResponse,
	};
}

export function enqueueThermalEvent(state: N0State, event: ThermalEvent): N0State {
	return mergeN0State(state, {
		ctx: {
			...(state.ctx ?? {}),
			[THERMAL_CTX_KEY]: {
				...getThermalContext(state),
				pendingEvent: event,
			},
		},
	});
}

export function applyThermalDecision(
	state: N0State,
	decision: ThermalDecision,
	timestamp: number,
): N0State {
	const context = getThermalContext(state);
	const checkpoint: ThermalCheckpoint = {
		timestamp,
		level: decision.level,
		reason: decision.reason,
		throttleHint: decision.throttleHint,
	};

	return mergeN0State(state, {
		ctx: {
			...(state.ctx ?? {}),
			[THERMAL_CTX_KEY]: {
				...context,
				pendingEvent: undefined,
				lastEvent: decision.event,
				paused: decision.shouldPause,
				cooldownUntil: decision.cooldownUntil,
				checkpoints: [...context.checkpoints, checkpoint],
				lastResponse: {
					action: decision.shouldPause ? 'pause' : 'resume',
					at: timestamp,
					throttleHint: decision.throttleHint,
					cooldownUntil: decision.cooldownUntil,
				},
			},
		},
	});
}

export function markThermalResume(state: N0State, timestamp: number): N0State {
	const context = getThermalContext(state);
	if (!context.paused) {
		return state;
	}
	const checkpoints = [...context.checkpoints];
	const latest = checkpoints.pop();
	const updated = latest ? { ...latest, resumedAt: timestamp } : undefined;
	const history = updated ? [...checkpoints, updated] : checkpoints;

	return mergeN0State(state, {
		ctx: {
			...(state.ctx ?? {}),
			[THERMAL_CTX_KEY]: {
				...context,
				pendingEvent: undefined,
				paused: false,
				cooldownUntil: undefined,
				checkpoints: history,
				lastResponse: {
					action: 'resume',
					at: timestamp,
					throttleHint: context.lastResponse?.throttleHint,
				},
			},
		},
	});
}

export function holdForCooldown(state: N0State, now: number): N0State {
	const context = getThermalContext(state);
	if (!context.cooldownUntil || context.cooldownUntil <= now) {
		return markThermalResume(state, now);
	}

	return mergeN0State(state, {
		ctx: {
			...(state.ctx ?? {}),
			[THERMAL_CTX_KEY]: {
				...context,
				paused: true,
				lastResponse: {
					action: 'cooldown',
					at: now,
					throttleHint: context.lastResponse?.throttleHint,
					cooldownUntil: context.cooldownUntil,
				},
			},
		},
	});
}
