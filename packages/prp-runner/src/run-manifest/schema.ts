/**
 * @file packages/prp-runner/src/run-manifest/schema.ts
 * @description Canonical run-manifest schema shared across Product→Automation pipeline stages.
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status DRAFT
 */

import { z } from 'zod';
import type { EnforcementProfile } from '@cortex-os/kernel';
import type { ProofArtifactDescriptor, ProofPolicyReceipt } from '@cortex-os/proof-artifacts';
import {
        GATE_CHAIN_IO_PROFILES,
        type ChainIoDeliverableDefinition,
        type GateChainIoProfile,
} from '../gates/chain-io-profiles.js';

/**
 * ISO 8601 timestamp validation schema
 */
const ISO8601Schema = z.string().refine(
	(val) => !Number.isNaN(Date.parse(val)),
	{ message: 'Must be valid ISO 8601 timestamp' }
);

/**
 * SHA256 hash validation schema (64-character hex string)
 */
const Sha256HexSchema = z.string().regex(
	/^[a-f0-9]{64}$/i,
	{ message: 'Must be 64-character hex string' }
);

/**
 * Current run manifest schema version
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

/**
 * All supported schema versions for backward compatibility
 */
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'] as const;

/**
 * Default enforcement profile budgets
 */
export const DEFAULT_BUDGETS = {
	COVERAGE_LINES: 95,
	COVERAGE_BRANCHES: 90,
	PERFORMANCE_LCP: 2500,
	PERFORMANCE_TBT: 300,
	A11Y_SCORE: 95,
} as const;

export const GateIdEnum = z.enum(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
export type GateId = z.infer<typeof GateIdEnum>;

export const StageKeyEnum = z.enum([
	'product-foundation',
	'product-test-strategy',
	'engineering-execution',
	'quality-triage',
	'automation-release',
]);
export type StageKey = z.infer<typeof StageKeyEnum>;

export const StageCategoryEnum = z.enum(['product', 'architecture', 'engineering', 'quality', 'automation']);
export type StageCategory = z.infer<typeof StageCategoryEnum>;

export const StageStatusEnum = z.enum(['pending', 'in-progress', 'passed', 'failed', 'blocked', 'skipped']);
export type StageStatus = z.infer<typeof StageStatusEnum>;

export const StageCheckStatusEnum = z.enum(['pass', 'fail', 'warn', 'skip']);
export type StageCheckStatus = z.infer<typeof StageCheckStatusEnum>;

export const TaskPriorityEnum = z.enum(['P0', 'P1', 'P2', 'P3']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

const StageDeliverableStatusEnum = z.enum(['pending', 'fulfilled', 'missing']);
export type StageDeliverableStatus = z.infer<typeof StageDeliverableStatusEnum>;

export const StageDeliverableSchema = z.object({
        name: z.string(),
        description: z.string().optional(),
        planPathKey: z.string().optional(),
        status: StageDeliverableStatusEnum.default('pending'),
        reference: z.string().optional(),
});
export type StageDeliverable = z.infer<typeof StageDeliverableSchema>;

export const StageHandoffSchema = z.object({
        persona: z.string(),
        chainRole: z.string(),
        description: z.string(),
        requiredArtifacts: z.array(StageDeliverableSchema).default([]),
        batonCheckpoints: z.array(z.string()).default([]),
});
export type StageHandoff = z.infer<typeof StageHandoffSchema>;

const StageEvidenceKernelSchema = z.object({
	type: z.literal('kernel'),
	evidenceId: z.string(),
	description: z.string().optional(),
});

const StageEvidenceFileSchema = z.object({
	type: z.literal('file'),
	path: z.string(),
	sha256: Sha256HexSchema,
	lines: z
		.object({
			start: z.number().int().nonnegative(),
			end: z.number().int().nonnegative(),
		})
		.optional(),
	description: z.string().optional(),
});

const StageEvidenceUrlSchema = z.object({
	type: z.literal('url'),
	href: z.string(),
	snapshot: z
		.object({
			bodySha256: Sha256HexSchema,
			retrievedAt: ISO8601Schema,
		})
		.optional(),
	description: z.string().optional(),
});

export const StageEvidenceSchema = z.union([
	StageEvidenceKernelSchema,
	StageEvidenceFileSchema,
	StageEvidenceUrlSchema,
]);
export type StageEvidenceRef = z.infer<typeof StageEvidenceSchema>;

export const StageArtifactRefSchema = z.object({
	id: z.string(),
	type: z.enum(['document', 'log', 'sbom', 'binary', 'screenshot', 'other']),
	description: z.string().optional(),
	path: z.string().optional(),
	uri: z.string().optional(),
	sha256: Sha256HexSchema.optional(),
	mimeType: z.string().optional(),
});
export type StageArtifactRef = z.infer<typeof StageArtifactRefSchema>;

export const StageApprovalSchema = z.object({
	role: z.string(),
	actor: z.string(),
	decision: z.enum(['approved', 'rejected', 'pending']),
	timestamp: ISO8601Schema,
	rationale: z.string().optional(),
	commitSha: z.string().optional(),
});
export type StageApproval = z.infer<typeof StageApprovalSchema>;

export const StageAutomatedCheckSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: StageCheckStatusEnum,
	output: z.string().optional(),
	evidence: z.array(StageEvidenceSchema).default([]),
	durationMs: z.number().int().nonnegative().optional(),
});
export type StageAutomatedCheck = z.infer<typeof StageAutomatedCheckSchema>;

export const StagePolicyCheckSchema = z.object({
	ruleId: z.string(),
	status: z.enum(['pass', 'fail', 'warn']),
	message: z.string().optional(),
	evidence: z.array(StageEvidenceSchema).default([]),
	updatedAt: ISO8601Schema,
});
export type StagePolicyCheck = z.infer<typeof StagePolicyCheckSchema>;

export const StageTimingsSchema = z.object({
	startedAt: ISO8601Schema.optional(),
	completedAt: ISO8601Schema.optional(),
	durationMs: z.number().int().nonnegative().optional(),
});
export type StageTimings = z.infer<typeof StageTimingsSchema>;

export const StageTelemetrySchema = z.object({
	spoolTaskId: z.string().optional(),
	spoolStatus: z.enum(['pending', 'fulfilled', 'rejected', 'cancelled']).optional(),
});
export type StageTelemetry = z.infer<typeof StageTelemetrySchema>;

const ProofArtifactDescriptorSchema = z.object({
	uri: z.string(),
	mime: z.string(),
	contentHash: z.object({
		alg: z.literal('sha256'),
		hex: Sha256HexSchema,
	}),
});

const ProofPolicyReceiptSchema = z.object({
	name: z.string(),
	status: z.enum(['pass', 'fail', 'warn']),
	checks: z.array(z.string()).optional(),
	sbom: z.string().optional(),
});

export const StageProofReferenceSchema = z.object({
	envelopePath: z.string(),
	bundlePath: z.string().optional(),
	artifact: ProofArtifactDescriptorSchema,
	policyReceipts: z.array(ProofPolicyReceiptSchema).optional(),
});
export type StageProofReference = z.infer<typeof StageProofReferenceSchema> & {
	artifact: ProofArtifactDescriptor;
	policyReceipts?: ProofPolicyReceipt[];
};

export const StageGateSnapshotSchema = z.object({
	sourceGateIds: z.array(GateIdEnum).default([]),
	requiresHumanApproval: z.boolean().default(false),
	approvals: z.array(StageApprovalSchema).default([]),
	automatedChecks: z.array(StageAutomatedCheckSchema).default([]),
});
export type StageGateSnapshot = z.infer<typeof StageGateSnapshotSchema>;

export const StageEntrySchema = z.object({
	key: StageKeyEnum,
	title: z.string(),
	category: StageCategoryEnum,
	sequence: z.number().int().positive(),
	status: StageStatusEnum,
	summary: z.string().optional(),
	dependencies: z.array(StageKeyEnum).default([]),
	timings: StageTimingsSchema.default({}),
        telemetry: StageTelemetrySchema.optional(),
        gate: StageGateSnapshotSchema,
        artifacts: z.array(StageArtifactRefSchema).default([]),
        evidence: z.array(StageEvidenceSchema).default([]),
        nextSteps: z.array(z.string()).default([]),
        handoff: StageHandoffSchema,
        proof: StageProofReferenceSchema.optional(),
        policy: z.array(StagePolicyCheckSchema).optional(),
});
export type StageEntry = z.infer<typeof StageEntrySchema>;

export const RunManifestTelemetryEventSchema = z.object({
	stageKey: StageKeyEnum,
	type: z.enum(['start', 'settle']),
	status: z.enum(['pending', 'fulfilled', 'rejected', 'cancelled', 'skipped']).optional(),
	timestamp: ISO8601Schema,
	message: z.string().optional(),
});
export type RunManifestTelemetryEvent = z.infer<typeof RunManifestTelemetryEventSchema>;

export const RunManifestTelemetrySchema = z.object({
	startedAt: ISO8601Schema,
	completedAt: ISO8601Schema.optional(),
	durationMs: z.number().int().nonnegative().optional(),
	spoolRunId: z.string().optional(),
	events: z.array(RunManifestTelemetryEventSchema).default([]),
	metrics: z
		.object({
			totalStages: z.number().int().nonnegative(),
			completedStages: z.number().int().nonnegative(),
			failedStages: z.number().int().nonnegative(),
		})
		.optional(),
});
export type RunManifestTelemetry = z.infer<typeof RunManifestTelemetrySchema>;

export const RunManifestSummarySchema = z.object({
	status: z.enum(['in-progress', 'completed', 'failed']),
	completedStageKeys: z.array(StageKeyEnum).default([]),
	pendingStageKeys: z.array(StageKeyEnum).default([]),
	failedStageKeys: z.array(StageKeyEnum).default([]),
	requiresHumanAttention: z.array(StageKeyEnum).default([]),
	blockers: z
		.array(
			z.object({
				stageKey: StageKeyEnum,
				severity: z.enum(['blocker', 'major', 'minor']),
				message: z.string(),
			}),
		)
		.default([]),
});
export type RunManifestSummary = z.infer<typeof RunManifestSummarySchema>;

export const EnforcementProfileSnapshotSchema = z.object({
	budgets: z.object({
		coverageLines: z.number().min(0).max(100).default(DEFAULT_BUDGETS.COVERAGE_LINES),
		coverageBranches: z.number().min(0).max(100).default(DEFAULT_BUDGETS.COVERAGE_BRANCHES),
		performanceLCP: z.number().positive().default(DEFAULT_BUDGETS.PERFORMANCE_LCP),
		performanceTBT: z.number().positive().default(DEFAULT_BUDGETS.PERFORMANCE_TBT),
		a11yScore: z.number().min(0).max(100).default(DEFAULT_BUDGETS.A11Y_SCORE),
	}),
	architecture: z.object({
		allowedPackageBoundaries: z.array(z.string()).default([]),
		namingConventions: z.record(z.string()).default({}),
		repoLayout: z.array(z.string()).default([]),
		crossBoundaryImports: z.array(z.string()).default([]),
	}),
	governance: z.object({
		licensePolicy: z.string().default('(Apache-2.0 OR Commercial)'),
		codeownersMapping: z.record(z.array(z.string())).default({}),
		structureGuardExceptions: z.array(z.string()).default([]),
		requiredChecks: z.array(z.string()).default([]),
	}),
});
export type EnforcementProfileSnapshot = z.infer<typeof EnforcementProfileSnapshotSchema> & EnforcementProfile;

export const RunManifestBlueprintSchema = z.object({
	title: z.string(),
	description: z.string(),
	requirements: z.array(z.string()),
	metadata: z.record(z.unknown()).optional(),
});
export type RunManifestBlueprint = z.infer<typeof RunManifestBlueprintSchema>;

export const RunManifestRepoSchema = z.object({
	owner: z.string(),
	name: z.string(),
	branch: z.string(),
	commitSha: z.string(),
});
export type RunManifestRepo = z.infer<typeof RunManifestRepoSchema>;

export const RunManifestArtifactPathsSchema = z.object({
	prpMarkdownPath: z.string(),
	reviewJsonPath: z.string().optional(),
	manifestPath: z.string().optional(),
});
export type RunManifestArtifactPaths = z.infer<typeof RunManifestArtifactPathsSchema>;

export const RunManifestLinksSchema = z.object({
	issue: z.string().optional(),
	pr: z.string().optional(),
	checks: z.string().optional(),
	telemetry: z.string().optional(),
});
export type RunManifestLinks = z.infer<typeof RunManifestLinksSchema>;

export const RunManifestSchema = z.object({
        schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
        manifestId: z.string(),
        runId: z.string(),
        generatedAt: ISO8601Schema,
        actor: z.string(),
        strictMode: z.boolean().default(false),
        taskId: z.string().optional(),
        priority: TaskPriorityEnum.optional(),
        specPath: z.string().optional(),
        blueprint: RunManifestBlueprintSchema,
        repo: RunManifestRepoSchema,
        enforcementProfile: EnforcementProfileSnapshotSchema.optional(),
	stages: z.array(StageEntrySchema).min(1),
	summary: RunManifestSummarySchema,
	telemetry: RunManifestTelemetrySchema,
	artifacts: RunManifestArtifactPathsSchema.optional(),
	links: RunManifestLinksSchema.optional(),
});
export type RunManifest = z.infer<typeof RunManifestSchema>;

export interface StageDefinition {
        key: StageKey;
        title: string;
        description: string;
        category: StageCategory;
        sequence: number;
        sourceGateIds: GateId[];
        requiresHumanApproval: boolean;
        dependencies: StageKey[];
        handoff: StageHandoffDefinition;
}

interface StageHandoffDefinition {
        persona: string;
        chainRole: string;
        description: string;
        requiredArtifacts: ChainIoDeliverableDefinition[];
        batonCheckpoints: string[];
}

// Helper to join profile fields with fallback
function joinProfileField<T extends keyof GateChainIoProfile>(
    profiles: GateChainIoProfile[],
    field: T,
    joiner: string,
    fallback: string
): string {
    return profiles.length > 0
        ? profiles.map((profile) => profile[field]).join(joiner)
        : fallback;
}

function aggregateChainIoMetadata(sourceGateIds: GateId[]): StageHandoffDefinition {
        const profiles = sourceGateIds
                .map((gateId) => GATE_CHAIN_IO_PROFILES[gateId])
                .filter((profile): profile is GateChainIoProfile => Boolean(profile));
        const persona = joinProfileField(profiles, 'persona', ' → ', 'Unassigned Persona');
        const chainRole = joinProfileField(profiles, 'chainRole', ' → ', 'unassigned-role');
        const description = profiles.length > 0 ? profiles.map((profile) => profile.description).join(' ') : '';
        const requiredArtifacts = profiles.flatMap((profile) => profile.requiredArtifacts);
        const batonCheckpoints = Array.from(
                new Set(profiles.flatMap((profile) => profile.batonCheckpoints ?? [])),
        );

        return {
                persona,
                chainRole,
                description,
                requiredArtifacts,
                batonCheckpoints,
        };
}

export const PRODUCT_TO_AUTOMATION_PIPELINE: readonly StageDefinition[] = [
        {
                key: 'product-foundation',
                title: 'Product Foundation',
                description: 'Validate blueprint intent, measurable outcomes, and architectural handshake.',
                category: 'product',
                sequence: 1,
                sourceGateIds: ['G0', 'G1'],
                requiresHumanApproval: true,
                dependencies: [],
                handoff: aggregateChainIoMetadata(['G0', 'G1']),
        },
        {
                key: 'product-test-strategy',
                title: 'Product Test Strategy',
                description: 'Establish acceptance criteria, coverage budgets, and test strategy alignment.',
                category: 'product',
                sequence: 2,
                sourceGateIds: ['G2'],
                requiresHumanApproval: true,
                dependencies: ['product-foundation'],
                handoff: aggregateChainIoMetadata(['G2']),
        },
        {
                key: 'engineering-execution',
                title: 'Engineering Execution',
                description: 'Implement solution slices, code review results, and verification evidence.',
                category: 'engineering',
                sequence: 3,
                sourceGateIds: ['G3', 'G4'],
                requiresHumanApproval: true,
                dependencies: ['product-test-strategy'],
                handoff: aggregateChainIoMetadata(['G3', 'G4']),
        },
        {
                key: 'quality-triage',
                title: 'Quality Triage',
                description: 'Surface risk triage, outstanding issues, and stabilization actions.',
                category: 'quality',
                sequence: 4,
                sourceGateIds: ['G5'],
                requiresHumanApproval: true,
                dependencies: ['engineering-execution'],
                handoff: aggregateChainIoMetadata(['G5']),
        },
        {
                key: 'automation-release',
                title: 'Automation Release',
                description: 'Confirm release readiness, automation hooks, and deployment sign-off.',
                category: 'automation',
                sequence: 5,
                sourceGateIds: ['G6', 'G7'],
                requiresHumanApproval: true,
                dependencies: ['quality-triage'],
                handoff: aggregateChainIoMetadata(['G6', 'G7']),
        },
] as const;

export const PRODUCT_TO_AUTOMATION_STAGE_MAP: ReadonlyMap<StageKey, StageDefinition> = new Map(
	PRODUCT_TO_AUTOMATION_PIPELINE.map((definition) => [definition.key, definition]),
);
