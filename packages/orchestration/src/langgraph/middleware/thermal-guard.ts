import type { N0State } from '../n0-state.js';
import { createInitialN0State } from '../n0-state.js';
import {
        applyThermalDecision,
        getThermalContext,
        holdForCooldown,
        markThermalResume,
        THERMAL_CTX_KEY,
        type ThermalContext,
        type ThermalResponse,
} from '../state/thermal-history.js';
import { ThermalPolicy, type ThermalDecision } from '../thermal/thermal-policy.js';

export interface ThermalGuardState {
        input: string;
        output?: string;
        ctx?: Record<string, unknown>;
        session?: N0State['session'];
        budget?: N0State['budget'];
        selectedModel?: { provider: string; model: string };
        [key: string]: unknown;
}

export type ThermalGuardPatch = Partial<ThermalGuardState>;

export interface ThermalGuardOptions<TState extends ThermalGuardState> {
        policy: ThermalPolicy;
        clock?: () => number;
        onPause?: (decision: ThermalDecision, state: N0State) => ThermalGuardPatch;
        onResume?: (state: N0State) => ThermalGuardPatch;
}

type GuardNode<TState extends ThermalGuardState> = (state: TState) =>
        | ThermalGuardPatch
        | Promise<ThermalGuardPatch>;

const DEFAULT_SESSION = {
        id: 'thermal-session',
        model: 'mlx.brainwav-orchestrator',
        user: 'brAInwav-orchestrator',
        cwd: process.cwd(),
        brainwavSession: 'thermal-guard',
};

function toN0State(state: ThermalGuardState): N0State {
        if (state.session) {
                return {
                        input: state.input ?? '',
                        session: state.session,
                        ctx: state.ctx,
                        output: state.output,
                        budget: state.budget,
                } satisfies N0State;
        }
        return createInitialN0State(state.input ?? '', DEFAULT_SESSION, {
                ctx: state.ctx,
                output: state.output,
                budget: state.budget,
        });
}

function diffN0State(base: N0State, next: N0State): Partial<N0State> {
        const patch: Partial<N0State> = {};
        if (next.input !== base.input) patch.input = next.input;
        if (next.output !== base.output) patch.output = next.output;
        if (next.ctx !== base.ctx) patch.ctx = next.ctx;
        if (next.session !== base.session) patch.session = next.session;
        if (next.budget !== base.budget) patch.budget = next.budget;
        if (next.messages !== base.messages) patch.messages = next.messages;
        return patch;
}

function graphPatchFromN0Patch<TState extends ThermalGuardState>(
        state: TState,
        patch: Partial<N0State>,
): ThermalGuardPatch {
        const graphPatch: ThermalGuardPatch = {};
        if (patch.input !== undefined) graphPatch.input = patch.input;
        if (patch.output !== undefined) graphPatch.output = patch.output;
        if (patch.session !== undefined) graphPatch.session = patch.session;
        if (patch.budget !== undefined) graphPatch.budget = patch.budget;
        if (patch.ctx !== undefined) {
                graphPatch.ctx = {
                        ...(state.ctx ?? {}),
                        ...(patch.ctx ?? {}),
                };
        }
        return graphPatch;
}

function applyGraphPatch<TState extends ThermalGuardState>(state: TState, patch: ThermalGuardPatch): TState {
        const mergedCtx = patch.ctx ? { ...(state.ctx ?? {}), ...patch.ctx } : state.ctx;
        return {
                ...(state as object),
                ...(patch as object),
                ctx: mergedCtx,
        } as TState;
}

function mergeGraphPatches(...patches: (ThermalGuardPatch | undefined)[]): ThermalGuardPatch {
        return patches.reduce<ThermalGuardPatch>((acc, patch) => {
                if (!patch) return acc;
                const nextCtx = patch.ctx ? { ...(acc.ctx ?? {}), ...patch.ctx } : acc.ctx;
                return {
                        ...acc,
                        ...patch,
                        ctx: nextCtx,
                };
        }, {});
}

function augmentResponse(
        ctx: ThermalContext,
        response: ThermalResponse | undefined,
        updates: Partial<ThermalResponse>,
): ThermalResponse | undefined {
        if (!response && !updates.action) {
                return response;
        }
        const base = response ?? {
                action: 'pause',
                at: Date.now(),
        };
        return { ...base, ...updates };
}

function attachResponse<TState extends ThermalGuardState>(
        state: N0State,
        graphState: TState,
        patch: ThermalGuardPatch,
        updates: Partial<ThermalResponse>,
): ThermalGuardPatch {
        const context = getThermalContext(state);
        const thermalCtx = {
                ...context,
                lastResponse: augmentResponse(context, context.lastResponse, updates),
        };
        const mergedCtx = {
                ...(graphState.ctx ?? {}),
                [THERMAL_CTX_KEY]: thermalCtx,
        };
        return mergeGraphPatches(patch, { ctx: mergedCtx });
}

export function withThermalGuard<TState extends ThermalGuardState>(
        node: GuardNode<TState>,
        options: ThermalGuardOptions<TState>,
): GuardNode<TState> {
        const { policy, clock = () => Date.now(), onPause, onResume } = options;

        return async (graphState) => {
                const base = toN0State(graphState);
                const now = clock();
                const context = getThermalContext(base);

                if (context.pendingEvent) {
                        const decision = policy.evaluate(context.pendingEvent, now);
                        const decided = applyThermalDecision(base, decision, now);
                        const patch = graphPatchFromN0Patch(graphState, diffN0State(base, decided));
                        const pausePatch = onPause ? onPause(decision, decided) : undefined;
                        if (decision.shouldPause) {
                                const finalPatch = attachResponse(decided, graphState, mergeGraphPatches(patch, pausePatch), {
                                        action: 'pause',
                                        at: now,
                                        throttleHint: decision.throttleHint,
                                        cooldownUntil: decision.cooldownUntil,
                                });
                                return finalPatch;
                        }

                        const resumePatch = onResume ? onResume(decided) : undefined;
                        const combined = attachResponse(decided, graphState, mergeGraphPatches(patch, resumePatch), {
                                action: 'resume',
                                at: now,
                                throttleHint: decision.throttleHint,
                        });
                        const nextState = applyGraphPatch(graphState, combined);
                        const nodePatch = await node(nextState as TState);
                        return mergeGraphPatches(combined, nodePatch);
                }

                if (context.paused) {
                        const cooled = holdForCooldown(base, now);
                        const diff = diffN0State(base, cooled);
                        const patch = graphPatchFromN0Patch(graphState, diff);
                        const cooledContext = getThermalContext(cooled);
                        if (cooledContext.paused) {
                                return attachResponse(cooled, graphState, patch, {
                                        action: 'cooldown',
                                        at: now,
                                        throttleHint: cooledContext.lastResponse?.throttleHint,
                                        cooldownUntil: cooledContext.cooldownUntil,
                                });
                        }

                        const resumedState = markThermalResume(cooled, now);
                        const resumePatch = graphPatchFromN0Patch(graphState, diffN0State(cooled, resumedState));
                        const combined = mergeGraphPatches(patch, resumePatch, onResume ? onResume(resumedState) : undefined);
                        const resumedContext = getThermalContext(resumedState);
                        const annotated = attachResponse(resumedState, graphState, combined, {
                                action: 'resume',
                                at: now,
                                throttleHint: resumedContext.lastResponse?.throttleHint,
                        });
                        const nextState = applyGraphPatch(graphState, annotated);
                        const nodePatch = await node(nextState as TState);
                        return mergeGraphPatches(annotated, nodePatch);
                }

                return node(graphState);
        };
}
