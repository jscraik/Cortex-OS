import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { NoTelemetryEvent } from '../observability/no-telemetry-contracts.js';
import { createNoTelemetryEvent } from '../observability/no-telemetry-contracts.js';
import {
	type ThermalGuardPatch,
	type ThermalGuardState,
	withThermalGuard,
} from './middleware/thermal-guard.js';
import type { N0Budget, N0Session, N0State } from './n0-state.js';
import {
	getThermalContext,
	THERMAL_CTX_KEY,
	type ThermalContext,
} from './state/thermal-history.js';
import {
	type ThermalDecision,
	type ThermalEvent,
	ThermalPolicy,
} from './thermal/thermal-policy.js';

export interface CerebrumGraphConfig {
	thermalPolicy?: ThermalPolicy;
	clock?: () => number;
}

type ModelRef = {
	provider: string;
	model: string;
};

type CerebrumState = typeof CerebrumAnnotation.State;
type GuardedState = CerebrumState & ThermalGuardState;

type RoutingContext = {
	selectedProvider?: string;
	decision?: string;
};

type TelemetryContext = NoTelemetryEvent[];

const DEFAULT_SESSION: N0Session = {
	id: 'session-local',
	model: 'mlx.brainwav-foundation',
	user: 'brAInwav-orchestrator',
	cwd: process.cwd(),
	brainwavSession: 'brAInwav-local',
};

const DEFAULT_BUDGET: N0Budget = {
	tokens: 120_000,
	timeMs: 90_000,
	depth: 8,
};

const CerebrumAnnotation = Annotation.Root({
	input: Annotation<string>({ reducer: (_prev, next) => next }),
	output: Annotation<string | undefined>({ reducer: (_prev, next) => next }),
	selectedModel: Annotation<ModelRef | undefined>({ reducer: (_prev, next) => next }),

	ctx: Annotation<Record<string, unknown>>({
		reducer: (prev, next) => ({ ...(prev ?? {}), ...(next ?? {}) }),
	}),
	session: Annotation<N0Session | undefined>({ reducer: (_prev, next) => next }),
	budget: Annotation<N0Budget | undefined>({ reducer: (_prev, next) => next }),
});

function ensureSession(state: CerebrumState): N0Session {
	return state.session ?? DEFAULT_SESSION;
}

function ensureBudget(state: CerebrumState): N0Budget {
	return state.budget ?? DEFAULT_BUDGET;
}

function ensureTelemetry(ctx: Record<string, unknown> | undefined): TelemetryContext {
	const telemetry = ctx?.telemetry;
	if (Array.isArray(telemetry)) {
		return [...(telemetry as TelemetryContext)];
	}
	return [];
}

function buildTelemetryEvent(
	state: N0State,
	event: ThermalEvent | undefined,
	response: {
		action: 'pause' | 'resume';
		paused: boolean;
		fallbackProvider?: string;
		cooldownUntil?: number;
	},
): NoTelemetryEvent | undefined {
	if (!event) return undefined;
	const session = state.session;
	const cooldownIso = response.cooldownUntil
		? new Date(response.cooldownUntil).toISOString()
		: undefined;
	const cpuPercent = Math.max(0, Math.min(100, Math.round(event.temperature)));

	return createNoTelemetryEvent(
		'master-agent-loop',
		'resource_allocated',
		'thermal_guard',
		{
			planId: session.id,
			agentId: session.user,
			correlationId: session.brainwavSession ?? `${session.id}-brainwav`,
			traceId: `thermal-${session.id}`,
			spanId: 'thermal-guard',
		},
		{
			metrics: {
				cpuUtilizationPercent: cpuPercent,
				executionTimeMs: state.budget?.timeMs ?? 0,
			},
			tags: {
				thermal_level: event.level,
				brainwav_component: 'orchestration.thermal',
			},
			thermal: {
				event: {
					level: event.level,
					deviceId: event.deviceId,
					temperature: event.temperature,
					throttleHint: event.throttleHint,
					source: event.source,
				},
				response: {
					action: response.action,
					paused: response.paused,
					fallbackProvider: response.fallbackProvider,
					cooldownUntil: cooldownIso,
				},
			},
		},
		{
			severity: response.action === 'pause' ? 'warn' : 'info',
			brainwav_component: 'orchestration.thermal',
		},
	);
}

function createPausePatch(decision: ThermalDecision, state: N0State): ThermalGuardPatch {
	const telemetry = buildTelemetryEvent(state, decision.event, {
		action: 'pause',
		paused: true,
		fallbackProvider: 'ollama.brainwav-fallback',
		cooldownUntil: decision.cooldownUntil,
	});
	const existingTelemetry = ensureTelemetry(state.ctx);
	const ctx: Record<string, unknown> = {
		routing: {
			...((state.ctx?.routing as RoutingContext | undefined) ?? {}),
			decision: 'thermal-fallback',
			selectedProvider: 'ollama.brainwav-fallback',
		},
	};
	if (telemetry) {
		ctx.telemetry = [...existingTelemetry, telemetry];
	}
	return {
		selectedModel: { provider: 'ollama', model: 'brainwav-mlx-fallback' },
		ctx,
	};
}

function createResumePatch(state: N0State): ThermalGuardPatch {
	const context = getThermalContext(state);
	const telemetry = buildTelemetryEvent(state, context.lastEvent, {
		action: 'resume',
		paused: false,
	});
	const existingTelemetry = ensureTelemetry(state.ctx);
	const ctx: Record<string, unknown> = {
		routing: {
			...((state.ctx?.routing as RoutingContext | undefined) ?? {}),
			selectedProvider: 'mlx.brainwav-foundation',
			decision: 'thermal-nominal',
		},
	};
	if (telemetry) {
		ctx.telemetry = [...existingTelemetry, telemetry];
	}
	return {
		selectedModel: { provider: 'mlx', model: 'brainwav-foundation' },
		ctx,
	};
}

export function createCerebrumGraph(config: CerebrumGraphConfig = {}) {
	const policy = config.thermalPolicy ?? new ThermalPolicy();
	const clock = config.clock ?? (() => Date.now());

	const guardedSelect = withThermalGuard<GuardedState>(
		async (state) => {
			return {
				selectedModel: {
					provider: 'mlx',
					model: 'brainwav-foundation',
				},
				ctx: {
					routing: {
						...((state.ctx?.routing as RoutingContext | undefined) ?? {}),
						selectedProvider: 'mlx.brainwav-foundation',
					},
				},
			};
		},
		{
			policy,
			clock,
			onPause: (decision, state) => createPausePatch(decision, state),
			onResume: (state) => createResumePatch(state),
		},
	);

	const builder = new StateGraph(CerebrumAnnotation)
		.addNode('bootstrap', async (state: CerebrumState) => {
			return {
				session: ensureSession(state),
				budget: ensureBudget(state),
				ctx: state.ctx ?? {},
			};
		})
		.addNode('selectModel', guardedSelect)
		.addNode('respond', async (state: CerebrumState) => {
			const thermal = state.ctx?.[THERMAL_CTX_KEY] as ThermalContext | undefined;
			const provider = state.selectedModel?.provider ?? 'unknown';
			if (thermal?.paused) {
				return { output: `brAInwav thermal hold: rerouted to ${provider}` };
			}
			return { output: `brAInwav routed via ${provider}` };
		})
		.addEdge(START, 'bootstrap')
		.addEdge('bootstrap', 'selectModel')
		.addEdge('selectModel', 'respond')
		.addEdge('respond', END);

	return builder.compile();
}
