import { mergeN0State } from '../n0-state.js';
export const THERMAL_CTX_KEY = 'thermal';
export function getThermalContext(state) {
	const ctx = state.ctx?.[THERMAL_CTX_KEY] ?? {};
	return {
		pendingEvent: ctx.pendingEvent,
		lastEvent: ctx.lastEvent,
		paused: ctx.paused ?? false,
		cooldownUntil: ctx.cooldownUntil,
		checkpoints: ctx.checkpoints ? [...ctx.checkpoints] : [],
		lastResponse: ctx.lastResponse,
	};
}
export function enqueueThermalEvent(state, event) {
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
export function applyThermalDecision(state, decision, timestamp) {
	const context = getThermalContext(state);
	const checkpoint = {
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
export function markThermalResume(state, timestamp) {
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
export function holdForCooldown(state, now) {
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
//# sourceMappingURL=thermal-history.js.map
