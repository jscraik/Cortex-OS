import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

import { RoutingPolicySchema, type RoutingPolicy } from '@cortex-os/contracts';
import type { OrchestrationBus } from '../events/orchestration-bus.js';
import { OrchestrationEventTypes } from '../events/orchestration-events.js';
import {
        createRoutingDecisionEvent,
        createRoutingFallbackEvent,
        createRoutingPlanEvent,
        type RoutingDecisionEvent,
        type RoutingFallbackEvent,
        type RoutingPlanEvent,
} from '../events/routing-events.js';
import type { RoutingApproval, RoutingCandidate, RoutingDecision, RoutingRequest } from '../types.js';
import yaml from 'yaml';

interface CandidateState {
        score: number;
        capabilities: Set<string>;
        reasons: string[];
}

interface StoredDecision {
        decision: RoutingDecision;
        recordedAt: string;
}

export interface PolicyRouterOptions {
        bus?: OrchestrationBus;
        logger?: Pick<Console, 'info' | 'warn' | 'error'>;
        historyLimit?: number;
}

const DEFAULT_HISTORY_LIMIT = 200;

export class PolicyRouter {
        private policy: RoutingPolicy | undefined;
        private readonly policyFile: string;
        private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;
        private readonly bus?: OrchestrationBus;
        private readonly historyLimit: number;
        private readonly history = new Map<string, StoredDecision>();
        private readonly historyOrder: string[] = [];
        private watcher: ReturnType<typeof watch> | undefined;
        private loadPromise: Promise<void> | undefined;

        constructor(policyPath: string, options: PolicyRouterOptions = {}) {
                this.policyFile = resolve(policyPath);
                this.logger = options.logger ?? console;
                this.bus = options.bus;
                this.historyLimit = Math.max(20, options.historyLimit ?? DEFAULT_HISTORY_LIMIT);
                this.loadPromise = this.reloadPolicy();
                this.startWatcher();
        }

        async route(request: RoutingRequest): Promise<RoutingDecision> {
                const policy = await this.ensurePolicy();
                const normalized = this.normalizeRequest(request);
                const interfacePolicy = policy.interfaces[normalized.interfaceId];
                if (!interfacePolicy) {
                        throw new Error(`routing_policy:interface_missing:${normalized.interfaceId}`);
                }

                const plan = this.buildPlan(policy, normalized, interfacePolicy.priority_base);
                await this.publishPlan(plan.planEvent);

                const decision = this.composeDecision({
                        policyVersion: policy.version,
                        request: normalized,
                        candidates: plan.candidates,
                        appliedRules: plan.appliedRules,
                        approval: plan.approval,
                        fallbackAgent: policy.routing.strategy.fallbacks?.[0],
                });

                this.storeDecision(decision);
                const decisionEvent = createRoutingDecisionEvent({
                        requestId: decision.requestId,
                        interfaceId: decision.interfaceId,
                        policyVersion: decision.policyVersion,
                        selectedAgent: decision.selectedAgent,
                        candidates: decision.candidates,
                        appliedRules: decision.appliedRules,
                        approval: decision.approval,
                        timestamp: decision.createdAt,
                });
                await this.publishDecision(decisionEvent);
                if (decision.fallback) {
                        await this.publishFallback(
                                createRoutingFallbackEvent(
                                        decision.requestId,
                                        decision.interfaceId,
                                        decision.fallback.agent,
                                        decision.fallback.reason,
                                ),
                        );
                }

                return decision;
        }

        explain(requestId: string): RoutingDecision | undefined {
                return this.history.get(requestId)?.decision;
        }

        async close(): Promise<void> {
                        this.watcher?.close();
                        this.watcher = undefined;
        }

        private async ensurePolicy(): Promise<RoutingPolicy> {
                if (this.loadPromise) {
                        await this.loadPromise;
                        this.loadPromise = undefined;
                }
                if (!this.policy) {
                        this.loadPromise = this.reloadPolicy();
                        await this.loadPromise;
                        this.loadPromise = undefined;
                }
                if (!this.policy) throw new Error('routing_policy:not_loaded');
                return this.policy;
        }

        private startWatcher(): void {
                try {
                        this.watcher = watch(this.policyFile, { persistent: false }, () => {
                                this.logger.info?.('routing policy change detected');
                                this.loadPromise = this.reloadPolicy();
                        });
                } catch (error) {
                        this.logger.warn?.(`routing policy watcher error: ${(error as Error).message}`);
                }
        }

        private async reloadPolicy(): Promise<void> {
                const data = await readFile(this.policyFile, 'utf8');
                const parsed = yaml.parse(data);
                this.policy = RoutingPolicySchema.parse(parsed);
                this.logger.info?.('routing policy loaded');
        }

        private normalizeRequest(request: RoutingRequest): Required<RoutingRequest> {
                return {
                        requestId: request.requestId ?? randomUUID(),
                        interfaceId: request.interfaceId,
                        capabilities: [...new Set(request.capabilities ?? [])],
                        tags: [...new Set(request.tags ?? [])],
                        source: request.source ?? 'unknown',
                        command: request.command ?? '',
                        env: request.env ?? 'development',
                        operation: request.operation ?? 'read_only',
                        metadata: request.metadata ?? {},
                };
        }

        private buildPlan(
                policy: RoutingPolicy,
                request: Required<RoutingRequest>,
                priorityBase: number,
        ): {
                candidates: Map<string, CandidateState>;
                appliedRules: string[];
                approval: RoutingApproval;
                planEvent: RoutingPlanEvent;
        } {
                const candidates = this.buildCandidates(policy, request, priorityBase);
                const appliedRules = this.applyPriorityRules(policy, request, candidates);
                const approval = this.evaluateApprovals(policy, request);
                const planEvent = createRoutingPlanEvent({
                        requestId: request.requestId,
                        interfaceId: request.interfaceId,
                        capabilities: request.capabilities,
                        tags: request.tags,
                        candidates: Array.from(candidates.entries()).map(([agent, state]) => ({
                                agent,
                                score: state.score,
                                reasons: [...state.reasons],
                        })),
                        appliedRules,
                });
                return { candidates, appliedRules, approval, planEvent };
        }

        private buildCandidates(
                policy: RoutingPolicy,
                request: Required<RoutingRequest>,
                priorityBase: number,
        ): Map<string, CandidateState> {
                const candidates = new Map<string, CandidateState>();
                const disallowed = new Set<string>();
                for (const constraint of policy.capability_matrix.incompatible ?? []) {
                        if (request.capabilities.includes(constraint.id)) {
                                for (const provider of constraint.disallow_providers) disallowed.add(provider);
                        }
                }
                for (const capability of request.capabilities) {
                        const mapping = policy.capability_matrix.required.find((item) => item.id === capability);
                        if (!mapping) continue;
                        for (const provider of mapping.providers) {
                                if (disallowed.has(provider)) continue;
                                const state = candidates.get(provider) ?? this.createCandidate(priorityBase);
                                state.capabilities.add(capability);
                                candidates.set(provider, state);
                        }
                }
                if (candidates.size === 0) {
                        for (const fallback of policy.routing.strategy.fallbacks ?? []) {
                                if (disallowed.has(fallback)) continue;
                                candidates.set(fallback, this.createCandidate(priorityBase, 'fallback-seed'));
                        }
                }
                return candidates;
        }

        private createCandidate(score: number, reason?: string): CandidateState {
                const reasons = reason ? [reason] : [];
                return { score, capabilities: new Set(), reasons };
        }

        private applyPriorityRules(
                policy: RoutingPolicy,
                request: Required<RoutingRequest>,
                candidates: Map<string, CandidateState>,
        ): string[] {
                const applied: string[] = [];
                for (const rule of policy.priority_rules ?? []) {
                        if (!this.matchesCondition(rule.if ?? {}, request)) continue;
                        applied.push(rule.id);
                        this.applyRuleEffects(rule.then, policy, candidates);
                }
                return applied;
        }

        private applyRuleEffects(
                action: RoutingPolicy['priority_rules'][number]['then'],
                policy: RoutingPolicy,
                candidates: Map<string, CandidateState>,
        ): void {
                if (action.boost) {
                        for (const state of candidates.values()) {
                                state.score += action.boost;
                                state.reasons.push(`boost:${action.boost}`);
                        }
                }
                if (!action.prefer_capabilities) return;
                for (const capability of action.prefer_capabilities) {
                        const mapping = policy.capability_matrix.required.find((item) => item.id === capability);
                        if (!mapping) continue;
                        for (const provider of mapping.providers) {
                                const state = candidates.get(provider);
                                if (!state) continue;
                                state.score += Math.max(action.boost ?? 0, 5);
                                state.reasons.push(`prefer:${capability}`);
                        }
                }
        }

        private evaluateApprovals(policy: RoutingPolicy, request: Required<RoutingRequest>): RoutingApproval {
                const result: RoutingApproval = { required: false, approvers: [], policies: [] };
                const approvers = new Set<string>();
                for (const policyRule of policy.approvals?.policies ?? []) {
                        if (!this.matchesCondition(policyRule.if ?? {}, request)) continue;
                        result.required = true;
                        result.policies.push(policyRule.id);
                        for (const person of policyRule.then.approvers ?? []) approvers.add(person);
                }
                result.approvers = [...approvers];
                return result;
        }

        private matchesCondition(
                condition: RoutingPolicy['priority_rules'][number]['if'],
                request: Required<RoutingRequest>,
        ): boolean {
                if (condition.interface && condition.interface !== request.interfaceId) return false;
                if (condition.source && condition.source !== request.source) return false;
                if (condition.env && condition.env !== request.env) return false;
                if (condition.operation && condition.operation !== request.operation) return false;
                if (condition.operation_any && !condition.operation_any.includes(request.operation)) return false;
                if (condition.tags_any) {
                        const found = condition.tags_any.some((tag) => request.tags.includes(tag));
                        if (!found) return false;
                }
                if (condition.command_prefix_any && request.command) {
                        const match = condition.command_prefix_any.some((prefix) => request.command.startsWith(prefix));
                        if (!match) return false;
                }
                if (condition.path_not_in) {
                        const path = typeof request.metadata.path === 'string' ? request.metadata.path : undefined;
                        if (path && condition.path_not_in.includes(path)) return false;
                }
                return true;
        }

        private composeDecision(args: {
                policyVersion: string;
                request: Required<RoutingRequest>;
                candidates: Map<string, CandidateState>;
                appliedRules: string[];
                approval: RoutingApproval;
                fallbackAgent?: string;
        }): RoutingDecision {
                const sorted = this.rankCandidates(args.candidates);
                const selected = sorted[0];
                const fallbackNeeded = !selected && args.fallbackAgent;
                const fallback = fallbackNeeded
                        ? { agent: args.fallbackAgent as string, reason: 'no-candidate' }
                        : null;
                const chosenAgent = selected?.agent ?? fallback?.agent ?? 'unassigned';
                const createdAt = new Date().toISOString();

                return {
                        requestId: args.request.requestId,
                        interfaceId: args.request.interfaceId,
                        policyVersion: args.policyVersion,
                        request: args.request,
                        selectedAgent: chosenAgent,
                        candidates: sorted,
                        appliedRules: args.appliedRules,
                        approval: args.approval,
                        fallback,
                        createdAt,
                };
        }

        private rankCandidates(candidates: Map<string, CandidateState>): RoutingCandidate[] {
                const ranked = Array.from(candidates.entries()).map(([agent, state]) => ({
                        agent,
                        score: state.score,
                        capabilities: [...state.capabilities],
                        reasons: [...state.reasons],
                }));
                ranked.sort((a, b) => b.score - a.score || a.agent.localeCompare(b.agent));
                return ranked;
        }

        private storeDecision(decision: RoutingDecision): void {
                this.history.set(decision.requestId, { decision, recordedAt: decision.createdAt });
                this.historyOrder.push(decision.requestId);
                while (this.historyOrder.length > this.historyLimit) {
                        const oldest = this.historyOrder.shift();
                        if (oldest) this.history.delete(oldest);
                }
        }

        private async publishPlan(event: RoutingPlanEvent): Promise<void> {
                if (!this.bus) return;
                await this.bus.publish(OrchestrationEventTypes.RoutingPlan, event);
        }

        private async publishDecision(event: RoutingDecisionEvent): Promise<void> {
                if (!this.bus) return;
                await this.bus.publish(OrchestrationEventTypes.RoutingDecision, event);
        }

        private async publishFallback(event: RoutingFallbackEvent): Promise<void> {
                if (!this.bus) return;
                await this.bus.publish(OrchestrationEventTypes.RoutingFallback, event);
        }
}
