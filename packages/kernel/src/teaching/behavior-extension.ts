/**
 * @file teaching/behavior-extension.ts
 * @description Behavior Extension Modules - Adaptive system behavior based on examples
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import type { PRPState } from '../state.js';
import type { ExampleCaptureSystem, TeachingPattern } from './example-capture.js';

/**
 * Behavior extension that can modify kernel behavior
 */
export interface BehaviorExtension {
	id: string;
	name: string;
	description: string;
	trigger: (state: PRPState) => boolean;
	modify: (state: PRPState, context: ExtensionContext) => Promise<ExtensionResult>;
	confidence: number;
	basedOnPatterns: string[]; // Pattern IDs
}

/**
 * Context provided to behavior extensions
 */
export interface ExtensionContext {
	captureSystem: ExampleCaptureSystem;
	executionHistory: PRPState[];
	userFeedback?: {
		satisfaction: number; // 0-1
		suggestions: string[];
	};
}

/**
 * Result of behavior extension
 */
export interface ExtensionResult {
	modified: boolean;
	changes: {
		type: 'validation_adjustment' | 'gate_modification' | 'workflow_alteration';
		description: string;
		impact: 'low' | 'medium' | 'high';
		parameters: Record<string, unknown>;
	}[];
	reasoning: string;
	suggestedFeedback?: string;
}

/**
 * Behavior Extension Manager
 *
 * Manages adaptive behavior modifications based on captured examples
 * and learned patterns from user interactions.
 */
export class BehaviorExtensionManager {
	private readonly extensions: Map<string, BehaviorExtension> = new Map();
	private readonly captureSystem: ExampleCaptureSystem;
	private executionHistory: PRPState[] = [];

	constructor(captureSystem: ExampleCaptureSystem) {
		this.captureSystem = captureSystem;
		this.initializeDefaultExtensions();
	}

	/**
	 * Clear all registered extensions (used by tests)
	 */
	clearExtensions(): void {
		this.extensions.clear();
	}

	/**
	 * Apply behavior extensions to current state
	 */
	async applyExtensions(
		state: PRPState,
		context: Partial<ExtensionContext> = {},
	): Promise<{
		modifiedState: PRPState;
		appliedExtensions: {
			extension: BehaviorExtension;
			result: ExtensionResult;
		}[];
	}> {
		const extensionContext = this.createExtensionContext(context);
		let modifiedState = { ...state };
		const appliedExtensions = await this.applySortedExtensions(state, modifiedState, extensionContext);

		this.updateExecutionHistory(modifiedState);

		return { modifiedState, appliedExtensions };
	}

	/**
	 * Create extension context with defaults
	 */
	private createExtensionContext(context: Partial<ExtensionContext>): ExtensionContext {
		return {
			captureSystem: this.captureSystem,
			executionHistory: this.executionHistory,
			...context,
		};
	}

	/**
	 * Apply extensions sorted by confidence
	 */
	private async applySortedExtensions(
		state: PRPState,
		modifiedState: PRPState,
		extensionContext: ExtensionContext,
	): Promise<{
		extension: BehaviorExtension;
		result: ExtensionResult;
	}[]> {
		const appliedExtensions: {
			extension: BehaviorExtension;
			result: ExtensionResult;
		}[] = [];

		const sortedExtensions = this.getSortedExtensions(state);

		for (const extension of sortedExtensions) {
			await this.applySingleExtension(
				extension,
				modifiedState,
				extensionContext,
				appliedExtensions,
			);
		}

		return appliedExtensions;
	}

	/**
	 * Get extensions sorted by confidence
	 */
	private getSortedExtensions(state: PRPState): BehaviorExtension[] {
		return Array.from(this.extensions.values())
			.filter((ext) => ext.trigger(state))
			.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Apply a single extension
	 */
	private async applySingleExtension(
		extension: BehaviorExtension,
		modifiedState: PRPState,
		extensionContext: ExtensionContext,
		appliedExtensions: {
			extension: BehaviorExtension;
			result: ExtensionResult;
		}[],
	): Promise<void> {
		try {
			const currentState = modifiedState;
			const result = await extension.modify(currentState, extensionContext);

			if (result.modified) {
				const updatedState = this.applyModifications(currentState, result);
				appliedExtensions.push({ extension, result });
				this.captureExtensionApplication(extension, currentState, updatedState, result);
				modifiedState = updatedState;
			}
		} catch (error) {
			console.error(`Extension ${extension.id} failed:`, error);
			// Continue with other extensions
		}
	}

	/**
	 * Update execution history with size limit
	 */
	private updateExecutionHistory(modifiedState: PRPState): void {
		this.executionHistory.push(modifiedState);
		if (this.executionHistory.length > 100) {
			this.executionHistory = this.executionHistory.slice(-100); // Keep last 100
		}
	}

	/**
	 * Create behavior extension from teaching pattern
	 */
	createExtensionFromPattern(pattern: TeachingPattern): BehaviorExtension {
		return {
			id: `ext-${pattern.id}`,
			name: `Extension: ${pattern.name}`,
			description: `Auto-generated from pattern: ${pattern.description}`,
			trigger: (state: PRPState) => this.evaluatePatternTrigger(pattern, state),
			modify: async (state: PRPState, context: ExtensionContext) =>
				this.applyPatternModification(pattern, state, context),
			confidence: pattern.effectiveness,
			basedOnPatterns: [pattern.id],
		};
	}

	/**
	 * Register custom behavior extension
	 */
	registerExtension(extension: BehaviorExtension): void {
		this.extensions.set(extension.id, extension);
	}

	/**
	 * Update extension confidence based on outcomes
	 */
	updateExtensionEffectiveness(
		extensionId: string,
		outcome: { success: boolean; userSatisfaction?: number },
	): void {
		const extension = this.extensions.get(extensionId);
		if (!extension) return;

		// Simple confidence adjustment
		const adjustment = outcome.success ? 0.05 : -0.1;
		const userAdjustment = outcome.userSatisfaction ? (outcome.userSatisfaction - 0.5) * 0.1 : 0;

		extension.confidence = Math.max(
			0.1,
			Math.min(1.0, extension.confidence + adjustment + userAdjustment),
		);

		this.extensions.set(extensionId, extension);
	}

	/**
	 * Initialize default behavior extensions
	 */
	private initializeDefaultExtensions(): void {
		this.registerAdaptiveValidationExtension();
		this.registerSmartGateSkipExtension();
		this.registerContextEvidenceExtension();
	}

	/**
	 * Register adaptive validation gates extension
	 */
	private registerAdaptiveValidationExtension(): void {
		this.registerExtension({
			id: 'adaptive-validation',
			name: 'Adaptive Validation Gates',
			description: 'Adjusts validation thresholds based on project context',
			trigger: (state) => state.phase === 'strategy' || state.phase === 'build',
			modify: async (state, _context) => this.createAdaptiveValidationResult(state),
			confidence: 0.7,
			basedOnPatterns: [],
		});
	}

	/**
	 * Create adaptive validation result based on project context
	 */
	private async createAdaptiveValidationResult(state: PRPState): Promise<ExtensionResult> {
		const projectComplexity = this.assessProjectComplexity(state.blueprint);
		const historicalSuccess = this.getHistoricalSuccessRate(state.blueprint);

		if (projectComplexity === 'simple' && historicalSuccess > 0.8) {
			return {
				modified: true,
				changes: [
					{
						type: 'validation_adjustment',
						description: 'Relaxed validation for simple, successful project pattern',
						impact: 'low',
						parameters: {
							maxMajorsAllowed: 5, // Increased from 3
							skipMinorValidations: true,
						},
					},
				],
				reasoning: 'Project appears simple and follows successful patterns',
			};
		}

		return {
			modified: false,
			changes: [],
			reasoning: 'No adjustments needed',
		};
	}

	/**
	 * Register smart gate skipping extension
	 */
	private registerSmartGateSkipExtension(): void {
		this.registerExtension({
			id: 'smart-gate-skip',
			name: 'Smart Gate Skipping',
			description: 'Skips redundant validation gates for certain project types',
			trigger: (state) => state.phase === 'build',
			modify: async (state, _context) => this.createSmartGateSkipResult(state),
			confidence: 0.8,
			basedOnPatterns: [],
		});
	}

	/**
	 * Create smart gate skip result based on project type
	 */
	private async createSmartGateSkipResult(state: PRPState): Promise<ExtensionResult> {
		const projectType = this.inferProjectType(state.blueprint);

		if (projectType === 'documentation-only') {
			return {
				modified: true,
				changes: [
					{
						type: 'gate_modification',
						description: 'Skip compilation gates for documentation project',
						impact: 'medium',
						parameters: {
							skipGates: ['backend-compilation', 'frontend-performance'],
							reason: 'Documentation project detected',
						},
					},
				],
				reasoning: 'Documentation projects do not require compilation validation',
			};
		}

		return {
			modified: false,
			changes: [],
			reasoning: 'No gate skipping applicable',
		};
	}

	/**
	 * Register context-aware evidence collection extension
	 */
	private registerContextEvidenceExtension(): void {
		this.registerExtension({
			id: 'context-evidence',
			name: 'Context-Aware Evidence Collection',
			description: 'Adjusts evidence requirements based on project context',
			trigger: (state) => state.evidence.length < 3,
			modify: async (state, _context) => this.createContextEvidenceResult(state),
			confidence: 0.6,
			basedOnPatterns: [],
		});
	}

	/**
	 * Create context evidence result based on evidence needs
	 */
	private async createContextEvidenceResult(state: PRPState): Promise<ExtensionResult> {
		const evidenceNeeds = this.assessEvidenceNeeds(state);

		if (evidenceNeeds.additional.length > 0) {
			return {
				modified: true,
				changes: [
					{
						type: 'workflow_alteration',
						description: 'Enhanced evidence collection for project type',
						impact: 'low',
						parameters: {
							additionalEvidence: evidenceNeeds.additional,
							priority: evidenceNeeds.priority,
						},
					},
				],
				reasoning: `Project requires additional evidence: ${evidenceNeeds.additional.join(', ')}`,
				suggestedFeedback:
					'System automatically enhanced evidence collection based on project analysis',
			};
		}

		return {
			modified: false,
			changes: [],
			reasoning: 'Evidence collection adequate',
		};
	}

	/**
	 * Apply pattern trigger evaluation
	 */
	private evaluatePatternTrigger(pattern: TeachingPattern, state: PRPState): boolean {
		const conditions = pattern.trigger.conditions;

		// Simple condition matching - in real implementation would be more sophisticated
		if (conditions.phase && conditions.phase !== state.phase) {
			return false;
		}

		return pattern.trigger.confidence > 0.5;
	}

	/**
	 * Apply pattern-based modification
	 */
	private async applyPatternModification(
		pattern: TeachingPattern,
		_state: PRPState,
		_context: ExtensionContext,
	): Promise<ExtensionResult> {
		// Extract modification from pattern
		const modification = pattern.adaptation;

		return {
			modified: true,
			changes: [
				{
					type: this.mapAdaptationType(modification.type),
					description: `Applied pattern: ${pattern.name}`,
					impact: 'medium',
					parameters: modification.parameters,
				},
			],
			reasoning: `Pattern-based modification: ${pattern.description}`,
		};
	}

	private mapAdaptationType(
		type: TeachingPattern['adaptation']['type'],
	): ExtensionResult['changes'][number]['type'] {
		switch (type) {
			case 'gate_modification':
				return 'gate_modification';
			case 'workflow_adjustment':
				return 'workflow_alteration';
			case 'validation_enhancement':
				return 'validation_adjustment';
		}
	}

	/**
	 * Apply modifications to state
	 */
	private applyModifications(state: PRPState, result: ExtensionResult): PRPState {
		let modifiedState = { ...state };

		for (const change of result.changes) {
			switch (change.type) {
				case 'validation_adjustment':
					// Modify validation thresholds
					modifiedState = this.adjustValidation(modifiedState, change.parameters);
					break;
				case 'gate_modification':
					// Modify gate behavior
					modifiedState = this.modifyGates(modifiedState, change.parameters);
					break;
				case 'workflow_alteration':
					// Alter workflow behavior
					modifiedState = this.alterWorkflow(modifiedState, change.parameters);
					break;
			}
		}

		return modifiedState;
	}

	/**
	 * Helper methods for state modification
	 */
	private adjustValidation(state: PRPState, parameters: Record<string, unknown>): PRPState {
		// Implementation would adjust validation thresholds
		return {
			...state,
			metadata: {
				...state.metadata,
				validationAdjustments: parameters,
			},
		};
	}

	private modifyGates(state: PRPState, parameters: Record<string, unknown>): PRPState {
		return {
			...state,
			metadata: {
				...state.metadata,
				gateModifications: parameters,
			},
		};
	}

	private alterWorkflow(state: PRPState, parameters: Record<string, unknown>): PRPState {
		return {
			...state,
			metadata: {
				...state.metadata,
				workflowAlterations: parameters,
			},
		};
	}

	/**
	 * Assessment helper methods
	 */
	private assessProjectComplexity(
		blueprint: PRPState['blueprint'],
	): 'simple' | 'medium' | 'complex' {
		const requirementCount = blueprint.requirements?.length || 0;
		const descriptionLength = blueprint.description.length;

		if (requirementCount <= 3 && descriptionLength < 200) return 'simple';
		if (requirementCount <= 8 && descriptionLength < 500) return 'medium';
		return 'complex';
	}

	private getHistoricalSuccessRate(_blueprint: PRPState['blueprint']): number {
		// Mock historical success rate - in real implementation would query actual history
		// This method returns a mock historical success rate
		return 0.75; // In a real implementation, this would query actual history
	}

	private inferProjectType(blueprint: PRPState['blueprint']): string {
		const title = blueprint.title.toLowerCase();
		const description = blueprint.description.toLowerCase();

		if (title.includes('doc') || description.includes('documentation')) {
			return 'documentation-only';
		}
		if (title.includes('api') || description.includes('backend')) {
			return 'backend-service';
		}
		if (title.includes('ui') || description.includes('frontend')) {
			return 'frontend-application';
		}

		return 'full-stack';
	}

	private assessEvidenceNeeds(state: PRPState): {
		additional: string[];
		priority: string;
	} {
		const needs: string[] = [];

		if (state.phase === 'strategy' && !state.evidence.some((e) => e.type === 'analysis')) {
			needs.push('architecture-analysis');
		}
		if (state.phase === 'build' && !state.evidence.some((e) => e.type === 'test')) {
			needs.push('test-execution');
		}

		return {
			additional: needs,
			priority: needs.length > 1 ? 'high' : 'medium',
		};
	}

	/**
	 * Capture extension application for learning
	 */
	private captureExtensionApplication(
		extension: BehaviorExtension,
		originalState: PRPState,
		modifiedState: PRPState,
		result: ExtensionResult,
	): void {
		const context = this.createCaptureContext(originalState);
		const action = this.createCaptureAction(extension, result);
		const outcome = this.createCaptureOutcome(modifiedState, extension);
		const tags = this.createCaptureTags(originalState);

		this.captureSystem.captureExample(
			'workflow',
			context,
			action,
			outcome,
			tags,
			originalState.metadata?.deterministic,
		);
	}

	/**
	 * Create capture context from original state
	 */
	private createCaptureContext(originalState: PRPState) {
		return {
			prpPhase: originalState.phase,
			blueprint: originalState.blueprint,
			inputState: originalState,
		};
	}

	/**
	 * Create capture action from extension and result
	 */
	private createCaptureAction(extension: BehaviorExtension, result: ExtensionResult) {
		return {
			type: 'workflow_modification' as const,
			description: `Extension applied: ${extension.name}`,
			parameters: {
				extensionId: extension.id,
				modifications: result.changes,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create capture outcome from modified state and extension
	 */
	private createCaptureOutcome(modifiedState: PRPState, extension: BehaviorExtension) {
		return {
			resultingState: modifiedState,
			success: true, // Will be updated based on actual outcome
			learningValue: extension.confidence,
		};
	}

	/**
	 * Create capture tags from original state
	 */
	private createCaptureTags(originalState: PRPState) {
		return {
			tags: ['extension', 'auto-adaptation', originalState.phase],
		};
	}

	/**
	 * Get active extensions
	 */
	getExtensions(): BehaviorExtension[] {
		return Array.from(this.extensions.values());
	}

	/**
	 * Get extension by ID
	 */
	getExtension(id: string): BehaviorExtension | undefined {
		return this.extensions.get(id);
	}
}
