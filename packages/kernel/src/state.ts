/**
 * @file state.ts
 * @description Cortex Kernel State Management - Deterministic PRP State Schema
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { z } from "zod";
import { fixedTimestamp } from "./lib/determinism.js";
import { generateId } from "./utils/id.js";

/**
 * Evidence captured during PRP execution
 */
export const EvidenceSchema = z.object({
	id: z.string(),
	type: z.enum([
		"file",
		"command",
		"test",
		"analysis",
		"validation",
		"llm-generation",
		"coverage",
		"a11y",
		"security",
		"sbom",
	]),
	source: z.string(),
	content: z.string(),
	timestamp: z.string(),
	phase: z.enum(["strategy", "build", "evaluation"]),
	commitSha: z.string().optional(),
	lineRange: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});

/**
 * Human approval record for gates
 */
export const HumanApprovalSchema = z.object({
	gateId: z.enum(["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]),
	actor: z.string(),
	decision: z.enum(["approved", "rejected", "pending"]),
	timestamp: z.string(),
	commitSha: z.string(),
	rationale: z.string(),
	signature: z.string().optional(),
});

/**
 * Gate execution result
 */
export const GateResultSchema = z.object({
	id: z.enum(["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]),
	name: z.string(),
	status: z.enum(["pending", "running", "passed", "failed", "skipped"]),
	requiresHumanApproval: z.boolean(),
	humanApproval: HumanApprovalSchema.optional(),
	automatedChecks: z.array(z.object({
		name: z.string(),
		status: z.enum(["pass", "fail", "skip"]),
		output: z.string().optional(),
		duration: z.number().optional(),
	})),
	artifacts: z.array(z.string()),
	evidence: z.array(z.string()), // Evidence IDs
	timestamp: z.string(),
	nextSteps: z.array(z.string()).optional(),
});

/**
 * Validation gate results for each phase
 */
export const ValidationGateSchema = z.object({
	passed: z.boolean(),
	blockers: z.array(z.string()),
	majors: z.array(z.string()),
	evidence: z.array(z.string()), // Evidence IDs
	timestamp: z.string(),
});

/**
 * Cerebrum decision state
 */
export const CerebrumDecisionSchema = z.object({
	decision: z.enum(["promote", "recycle", "pending"]),
	reasoning: z.string(),
	confidence: z.number().min(0).max(1),
	timestamp: z.string(),
});

/**
 * Enforcement Profile from initial.md
 */
export const EnforcementProfileSchema = z.object({
	budgets: z.object({
		coverageLines: z.number().min(0).max(100).default(95),
		coverageBranches: z.number().min(0).max(100).default(90),
		performanceLCP: z.number().positive().default(2500),
		performanceTBT: z.number().positive().default(300),
		a11yScore: z.number().min(0).max(100).default(95),
	}),
	architecture: z.object({
		allowedPackageBoundaries: z.array(z.string()).default([]),
		namingConventions: z.record(z.string()).default({}),
		repoLayout: z.array(z.string()).default([]),
		crossBoundaryImports: z.array(z.string()).default([]),
	}),
	governance: z.object({
		licensePolicy: z.string().default("(Apache-2.0 OR Commercial)"),
		codeownersMapping: z.record(z.array(z.string())).default({}),
		structureGuardExceptions: z.array(z.string()).default([]),
		requiredChecks: z.array(z.string()).default([]),
	}),
});

/**
 * Core PRP State following the state machine diagram
 */
export const PRPStateSchema = z.object({
	// Core identifiers
	id: z.string(),
	runId: z.string(),

	// State machine phase
	phase: z.enum(["strategy", "build", "evaluation", "completed", "recycled"]),

	// Input blueprint
	blueprint: z.object({
		title: z.string(),
		description: z.string(),
		requirements: z.array(z.string()),
		metadata: z.record(z.unknown()).optional(),
	}),

	// Enforcement profile from initial.md
	enforcementProfile: EnforcementProfileSchema.optional(),

	// Gate execution results (G0-G7)
	gates: z.record(GateResultSchema).default({}),

	// Human approvals tracking
	approvals: z.array(HumanApprovalSchema).default([]),

	// Execution outputs by neuron ID
	outputs: z.record(z.unknown()),

	// Validation results by phase (legacy, maintained for compatibility)
	validationResults: z.object({
		strategy: ValidationGateSchema.optional(),
		build: ValidationGateSchema.optional(),
		evaluation: ValidationGateSchema.optional(),
	}),

	// Evidence collection
	evidence: z.array(EvidenceSchema),

	// Cerebrum decision
	cerebrum: CerebrumDecisionSchema.optional(),

	// Execution metadata
	metadata: z.object({
		startTime: z.string(),
		endTime: z.string().optional(),
		currentNeuron: z.string().optional(),
		llmConfig: z
			.object({
				provider: z.enum(["mlx", "ollama"]).optional(),
				model: z.string().optional(),
			})
			.optional(),
		executionContext: z.record(z.unknown()).optional(),
		deterministic: z.boolean().optional(),
		// Teaching layer extensions
		validationAdjustments: z.record(z.unknown()).optional(),
		gateModifications: z.record(z.unknown()).optional(),
		workflowAlterations: z.record(z.unknown()).optional(),
		// Error tracking
		error: z.string().optional(),
	}),

	// Checkpointing for determinism
	checkpoints: z
		.array(
			z.object({
				id: z.string(),
				timestamp: z.string(),
				phase: z.enum([
					"strategy",
					"build",
					"evaluation",
					"completed",
					"recycled",
				]),
				state: z.record(z.unknown()),
			}),
		)
		.optional(),
});

export type PRPState = z.infer<typeof PRPStateSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ValidationGate = z.infer<typeof ValidationGateSchema>;
export type CerebrumDecision = z.infer<typeof CerebrumDecisionSchema>;
export type HumanApproval = z.infer<typeof HumanApprovalSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type EnforcementProfile = z.infer<typeof EnforcementProfileSchema>;

/**
 * State transition validation
 */
export const validateStateTransition = (
	fromState: PRPState,
	toState: PRPState,
): boolean => {
	const fromPhase = fromState.phase;
	const toPhase = toState.phase;
	const validTransitions: Record<PRPState["phase"], PRPState["phase"][]> = {
		strategy: ["build", "recycled"],
		build: ["evaluation", "recycled"],
		evaluation: ["completed", "recycled"],
		completed: [], // Terminal state
		recycled: ["strategy"], // Can restart
	};

	return validTransitions[fromPhase]?.includes(toPhase) ?? false;
};

/**
 * Create initial PRP state
 */
export const createInitialPRPState = (
	blueprint: PRPState["blueprint"],
	options: {
		id?: string;
		runId?: string;
		llmConfig?: PRPState["metadata"]["llmConfig"];
		deterministic?: boolean;
	} = {},
): PRPState => {
	const now = options.deterministic
		? fixedTimestamp("workflow-start")
		: new Date().toISOString();
	const id = options.id ?? generateId("prp", options.deterministic);
	const runId = options.runId ?? generateId("run", options.deterministic);

	return {
		id,
		runId,
		phase: "strategy",
		blueprint,
		outputs: {},
		validationResults: {},
		evidence: [],
		metadata: {
			startTime: now,
			llmConfig: options.llmConfig,
			deterministic: options.deterministic,
		},
	};
};
