/**
 * @file teaching/example-capture.ts
 * @description Interactive Teaching Layer - Example Capture and Replay
 * @author Cortex-OS Team
 * @version 1.0.0
 */
import type { PRPState } from '../state.js';
/**
 * Captured example for teaching and behavior extension
 */
export interface CapturedExample {
	id: string;
	type: 'workflow' | 'validation' | 'decision' | 'correction';
	context: {
		prpPhase: PRPState['phase'];
		blueprint: PRPState['blueprint'];
		inputState: Partial<PRPState>;
	};
	userAction: {
		type:
			| 'validation_override'
			| 'gate_adjustment'
			| 'neuron_guidance'
			| 'workflow_modification';
		description: string;
		parameters: Record<string, unknown>;
		timestamp: string;
	};
	outcome: {
		resultingState: Partial<PRPState>;
		success: boolean;
		learningValue: number;
	};
	metadata: {
		capturedBy: string;
		environment: string;
		tags: string[];
	};
}
/**
 * Teaching pattern extracted from examples
 */
export interface TeachingPattern {
	id: string;
	name: string;
	description: string;
	trigger: {
		conditions: Record<string, unknown>;
		confidence: number;
	};
	adaptation: {
		type:
			| 'gate_modification'
			| 'workflow_adjustment'
			| 'validation_enhancement';
		parameters: Record<string, unknown>;
	};
	examples: string[];
	effectiveness: number;
}
export interface SuggestedAction {
	type: string;
	description: string;
	parameters: Record<string, unknown>;
	confidence: number;
}
/**
 * Example Capture and Replay System
 *
 * Captures user interactions and system decisions to build
 * adaptive behavior patterns for the Cortex Kernel.
 */
export declare class ExampleCaptureSystem {
	private examples;
	private patterns;
	/**
	 * Capture user interaction as learning example
	 */
	captureExample(
		type: CapturedExample['type'],
		context: CapturedExample['context'],
		userAction: CapturedExample['userAction'],
		outcome: CapturedExample['outcome'],
		metadata?: Partial<CapturedExample['metadata']>,
		deterministic?: boolean,
	): CapturedExample;
	/**
	 * Capture validation override example
	 */
	captureValidationOverride(
		prpState: PRPState,
		originalValidation: {
			passed: boolean;
			blockers: string[];
			majors: string[];
		},
		userOverride: {
			passed: boolean;
			reasoning: string;
			adjustments: Record<string, unknown>;
		},
		finalOutcome: {
			success: boolean;
			feedback: string;
		},
		deterministic?: boolean,
	): CapturedExample;
	/**
	 * Capture workflow modification example
	 */
	captureWorkflowModification(
		prpState: PRPState,
		modification: {
			type: 'gate_adjustment' | 'neuron_reordering' | 'phase_skipping';
			description: string;
			changes: Record<string, unknown>;
		},
		outcome: {
			improved: boolean;
			metrics: any;
		},
		deterministic?: boolean,
	): CapturedExample;
	/**
	 * Replay captured example to validate or extend behavior
	 */
	replayExample(
		exampleId: string,
		currentState: PRPState,
	): Promise<{
		applicable: boolean;
		suggestedAction?: SuggestedAction;
		confidence: number;
	}>;
	/**
	 * Update learning patterns from new examples
	 */
	private updatePatternsFromExample;
	/**
	 * Calculate similarity between contexts
	 */
	private calculateContextSimilarity;
	/**
	 * Adapt example to current context
	 */
	private adaptExampleToCurrentContext;
	/**
	 * Extract keywords from blueprint for similarity comparison
	 */
	private extractKeywords;
	/**
	 * Calculate keyword overlap between two sets
	 */
	private calculateKeywordOverlap;
	/**
	 * Compare states for similarity
	 */
	private compareStates;
	/**
	 * Get captured examples for analysis
	 */
	getExamples(filter?: {
		type?: CapturedExample['type'];
		phase?: PRPState['phase'];
		tags?: string[];
	}): CapturedExample[];
	/**
	 * Get learned patterns
	 */
	getPatterns(): TeachingPattern[];
}
//# sourceMappingURL=example-capture.d.ts.map
