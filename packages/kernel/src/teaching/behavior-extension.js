/**
 * @file teaching/behavior-extension.ts
 * @description Behavior Extension Modules - Adaptive system behavior based on examples
 * @author Cortex-OS Team
 * @version 1.0.0
 */
/**
 * Behavior Extension Manager
 *
 * Manages adaptive behavior modifications based on captured examples
 * and learned patterns from user interactions.
 */
export class BehaviorExtensionManager {
    extensions = new Map();
    captureSystem;
    executionHistory = [];
    constructor(captureSystem) {
        this.captureSystem = captureSystem;
        this.initializeDefaultExtensions();
    }
    /**
     * Apply behavior extensions to current state
     */
    async applyExtensions(state, context = {}) {
        const extensionContext = {
            captureSystem: this.captureSystem,
            executionHistory: this.executionHistory,
            ...context,
        };
        let modifiedState = { ...state };
        const appliedExtensions = [];
        // Apply extensions in order of confidence
        const sortedExtensions = Array.from(this.extensions.values())
            .filter((ext) => ext.trigger(state))
            .sort((a, b) => b.confidence - a.confidence);
        for (const extension of sortedExtensions) {
            try {
                const currentState = modifiedState;
                const result = await extension.modify(currentState, extensionContext);
                if (result.modified) {
                    const updatedState = this.applyModifications(currentState, result);
                    appliedExtensions.push({ extension, result });
                    // Capture this extension application with the state before modifications
                    this.captureExtensionApplication(extension, currentState, updatedState, result);
                    modifiedState = updatedState;
                }
            }
            catch (error) {
                console.error(`Extension ${extension.id} failed:`, error);
                // Continue with other extensions
            }
        }
        // Update execution history
        this.executionHistory.push(modifiedState);
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(-100); // Keep last 100
        }
        return { modifiedState, appliedExtensions };
    }
    /**
     * Create behavior extension from teaching pattern
     */
    createExtensionFromPattern(pattern) {
        return {
            id: `ext-${pattern.id}`,
            name: `Extension: ${pattern.name}`,
            description: `Auto-generated from pattern: ${pattern.description}`,
            trigger: (state) => this.evaluatePatternTrigger(pattern, state),
            modify: async (state, context) => this.applyPatternModification(pattern, state, context),
            confidence: pattern.effectiveness,
            basedOnPatterns: [pattern.id],
        };
    }
    /**
     * Register custom behavior extension
     */
    registerExtension(extension) {
        this.extensions.set(extension.id, extension);
    }
    /**
     * Update extension confidence based on outcomes
     */
    updateExtensionEffectiveness(extensionId, outcome) {
        const extension = this.extensions.get(extensionId);
        if (!extension)
            return;
        // Simple confidence adjustment
        const adjustment = outcome.success ? 0.05 : -0.1;
        const userAdjustment = outcome.userSatisfaction
            ? (outcome.userSatisfaction - 0.5) * 0.1
            : 0;
        extension.confidence = Math.max(0.1, Math.min(1.0, extension.confidence + adjustment + userAdjustment));
        this.extensions.set(extensionId, extension);
    }
    /**
     * Initialize default behavior extensions
     */
    initializeDefaultExtensions() {
        // Extension 1: Adaptive validation gates
        this.registerExtension({
            id: 'adaptive-validation',
            name: 'Adaptive Validation Gates',
            description: 'Adjusts validation thresholds based on project context',
            trigger: (state) => state.phase === 'strategy' || state.phase === 'build',
            modify: async (state, _context) => {
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
            },
            confidence: 0.7,
            basedOnPatterns: [],
        });
        // Extension 2: Smart gate skipping
        this.registerExtension({
            id: 'smart-gate-skip',
            name: 'Smart Gate Skipping',
            description: 'Skips redundant validation gates for certain project types',
            trigger: (state) => state.phase === 'build',
            modify: async (state, _context) => {
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
            },
            confidence: 0.8,
            basedOnPatterns: [],
        });
        // Extension 3: Context-aware evidence collection
        this.registerExtension({
            id: 'context-evidence',
            name: 'Context-Aware Evidence Collection',
            description: 'Adjusts evidence requirements based on project context',
            trigger: (state) => state.evidence.length < 3,
            modify: async (state, _context) => {
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
                        suggestedFeedback: 'System automatically enhanced evidence collection based on project analysis',
                    };
                }
                return {
                    modified: false,
                    changes: [],
                    reasoning: 'Evidence collection adequate',
                };
            },
            confidence: 0.6,
            basedOnPatterns: [],
        });
    }
    /**
     * Apply pattern trigger evaluation
     */
    evaluatePatternTrigger(pattern, state) {
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
    async applyPatternModification(pattern, _state, _context) {
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
    mapAdaptationType(type) {
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
    applyModifications(state, result) {
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
    adjustValidation(state, parameters) {
        // Implementation would adjust validation thresholds
        return {
            ...state,
            metadata: {
                ...state.metadata,
                validationAdjustments: parameters,
            },
        };
    }
    modifyGates(state, parameters) {
        return {
            ...state,
            metadata: {
                ...state.metadata,
                gateModifications: parameters,
            },
        };
    }
    alterWorkflow(state, parameters) {
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
    assessProjectComplexity(blueprint) {
        const requirementCount = blueprint.requirements?.length || 0;
        const descriptionLength = blueprint.description.length;
        if (requirementCount <= 3 && descriptionLength < 200)
            return 'simple';
        if (requirementCount <= 8 && descriptionLength < 500)
            return 'medium';
        return 'complex';
    }
    getHistoricalSuccessRate(_blueprint) {
        // Mock historical success rate - in real implementation would query actual history
        // This method returns a mock historical success rate
        return 0.75; // In a real implementation, this would query actual history
    }
    inferProjectType(blueprint) {
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
    assessEvidenceNeeds(state) {
        const needs = [];
        if (state.phase === 'strategy' &&
            !state.evidence.some((e) => e.type === 'analysis')) {
            needs.push('architecture-analysis');
        }
        if (state.phase === 'build' &&
            !state.evidence.some((e) => e.type === 'test')) {
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
    captureExtensionApplication(extension, originalState, modifiedState, result) {
        this.captureSystem.captureExample('workflow', {
            prpPhase: originalState.phase,
            blueprint: originalState.blueprint,
            inputState: originalState,
        }, {
            type: 'workflow_modification',
            description: `Extension applied: ${extension.name}`,
            parameters: {
                extensionId: extension.id,
                modifications: result.changes,
            },
            timestamp: new Date().toISOString(),
        }, {
            resultingState: modifiedState,
            success: true, // Will be updated based on actual outcome
            learningValue: extension.confidence,
        }, {
            tags: ['extension', 'auto-adaptation', originalState.phase],
        }, originalState.metadata?.deterministic);
    }
    /**
     * Get active extensions
     */
    getExtensions() {
        return Array.from(this.extensions.values());
    }
    /**
     * Get extension by ID
     */
    getExtension(id) {
        return this.extensions.get(id);
    }
}
//# sourceMappingURL=behavior-extension.js.map