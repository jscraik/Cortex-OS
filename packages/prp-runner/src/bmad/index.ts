/**
 * @file packages/prp-runner/src/bmad/index.ts
 * @description BMAD (Blueprint → Manifest → Approval → Decision) orchestration helpers.
 */

import type { PRPState } from '@cortex-os/kernel';

import { computeBmadAlignment, type BmadAlignmentReport } from './alignment.js';
import type { Blueprint, HumanApprovalProvider, RepoInfo, RunOptions } from '../runner.js';
import { runPRPWorkflow } from '../runner.js';
import type { RunManifest } from '../run-manifest/schema.js';

type WorkflowResult = Awaited<ReturnType<typeof runPRPWorkflow>>;

export interface ReviewNeuronContext {
        readonly blueprint: Blueprint;
        readonly state: PRPState;
        readonly manifest: RunManifest;
        readonly alignment: BmadAlignmentReport;
}

export interface ReviewNeuronHook {
        id: string;
        mode?: 'review-only';
        onReviewReady(context: ReviewNeuronContext): Promise<void> | void;
}

export interface BmadRunOptions extends RunOptions {
        reviewHook?: ReviewNeuronHook;
        approvalProvider?: HumanApprovalProvider;
}

export type WorkflowRunner = (
        blueprint: Blueprint,
        repoInfo: RepoInfo,
        options: RunOptions,
        approvalProvider?: HumanApprovalProvider,
) => Promise<WorkflowResult>;

export interface BmadWorkflowResult extends WorkflowResult {
        alignment: BmadAlignmentReport;
}

/**
 * Execute the PRP workflow and enrich the result with BMAD alignment metadata.
 */
export async function runBmadLoop(
        blueprint: Blueprint,
        repoInfo: RepoInfo,
        options: BmadRunOptions,
        workflowRunner: WorkflowRunner = runPRPWorkflow,
): Promise<BmadWorkflowResult> {
        const { reviewHook, approvalProvider, ...runnerOptions } = options;

        if (reviewHook?.mode && reviewHook.mode !== 'review-only') {
                throw new Error('Review neuron hook must operate in review-only mode.');
        }

        const result = await workflowRunner(blueprint, repoInfo, runnerOptions, approvalProvider);
        const alignment = computeBmadAlignment(result.state, result.manifest);

        if (reviewHook) {
                const frozenContext: ReviewNeuronContext = {
                        blueprint: deepFreeze(structuredCloneSafe(blueprint)),
                        state: deepFreeze(structuredCloneSafe(result.state)),
                        manifest: deepFreeze(structuredCloneSafe(result.manifest)),
                        alignment: deepFreeze(structuredCloneSafe(alignment)),
                };
                await reviewHook.onReviewReady(frozenContext);
        }

        return { ...result, alignment };
}

function structuredCloneSafe<T>(value: T): T {
        if (typeof globalThis.structuredClone === 'function') {
                return globalThis.structuredClone(value);
        }
        return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(input: T): T {
        if (input && typeof input === 'object') {
                Object.freeze(input);
                for (const value of Object.values(input as Record<string, unknown>)) {
                        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                                deepFreeze(value);
                        }
                }
        }
        return input;
}

export { computeBmadAlignment } from './alignment.js';
export type { BmadAlignmentReport, GateAlignmentSummary, StageAlignmentSummary } from './alignment.js';
