/**
 * @file teaching/example-capture.ts
 * @description Interactive Teaching Layer - Example Capture and Replay
 * @author Cortex-OS Team
 * @version 1.0.0
 */
import { generateId } from '../utils/id.js';
/**
 * Example Capture and Replay System
 *
 * Captures user interactions and system decisions to build
 * adaptive behavior patterns for the Cortex Kernel.
 */
export class ExampleCaptureSystem {
    examples = new Map();
    patterns = new Map();
    /**
     * Capture user interaction as learning example
     */
    captureExample(type, context, userAction, outcome, metadata = {}, deterministic = false) {
        const example = {
            id: generateId('example', deterministic),
            type,
            context,
            userAction,
            outcome,
            metadata: {
                capturedBy: 'system',
                environment: 'development',
                tags: [],
                ...metadata,
            },
        };
        this.examples.set(example.id, example);
        // Trigger pattern learning
        this.updatePatternsFromExample(example);
        return example;
    }
    /**
     * Capture validation override example
     */
    captureValidationOverride(prpState, originalValidation, userOverride, finalOutcome, deterministic = false) {
        return this.captureExample('validation', {
            prpPhase: prpState.phase,
            blueprint: prpState.blueprint,
            inputState: { validationResults: prpState.validationResults },
        }, {
            type: 'validation_override',
            description: `User override: ${userOverride.reasoning}`,
            parameters: {
                originalValidation,
                override: userOverride,
            },
            timestamp: new Date().toISOString(),
        }, {
            resultingState: { validationResults: prpState.validationResults },
            success: finalOutcome.success,
            learningValue: finalOutcome.success ? 0.8 : 0.3,
        }, {
            tags: ['validation', 'override', prpState.phase],
        }, deterministic);
    }
    /**
     * Capture workflow modification example
     */
    captureWorkflowModification(prpState, modification, outcome, deterministic = false) {
        return this.captureExample('workflow', {
            prpPhase: prpState.phase,
            blueprint: prpState.blueprint,
            inputState: { phase: prpState.phase, outputs: prpState.outputs },
        }, {
            type: 'workflow_modification',
            description: modification.description,
            parameters: modification,
            timestamp: new Date().toISOString(),
        }, {
            resultingState: prpState,
            success: outcome.improved,
            learningValue: outcome.improved ? 0.9 : 0.2,
        }, {
            tags: ['workflow', modification.type, prpState.phase],
        }, deterministic);
    }
    /**
     * Replay captured example to validate or extend behavior
     */
    async replayExample(exampleId, currentState) {
        const example = this.examples.get(exampleId);
        if (!example) {
            throw new Error(`Example not found: ${exampleId}`);
        }
        // Analyze context similarity
        const contextSimilarity = this.calculateContextSimilarity(example.context, {
            prpPhase: currentState.phase,
            blueprint: currentState.blueprint,
            inputState: currentState,
        });
        if (contextSimilarity < 0.6) {
            return { applicable: false, confidence: 0 };
        }
        // Suggest action based on example
        const suggestedAction = this.adaptExampleToCurrentContext(example, currentState);
        return {
            applicable: true,
            suggestedAction,
            confidence: contextSimilarity * example.outcome.learningValue,
        };
    }
    /**
     * Update learning patterns from new examples
     */
    updatePatternsFromExample(example) {
        // Simple pattern extraction - in real implementation would use ML
        const patternKey = `${example.type}-${example.context.prpPhase}-${example.userAction.type}`;
        let pattern = this.patterns.get(patternKey);
        if (pattern) {
            // Update existing pattern
            pattern.examples.push(example.id);
            const totalExamples = pattern.examples.length;
            const successfulExamples = pattern.examples
                .map((id) => this.examples.get(id))
                .filter((ex) => ex?.outcome.success).length;
            pattern.effectiveness = successfulExamples / totalExamples;
            pattern.trigger.confidence = Math.min(0.9, pattern.trigger.confidence + 0.1);
        }
        else {
            pattern = {
                id: patternKey,
                name: `${example.type} pattern for ${example.context.prpPhase}`,
                description: `Learned pattern from ${example.userAction.type} actions`,
                trigger: {
                    conditions: {
                        phase: example.context.prpPhase,
                        actionType: example.userAction.type,
                    },
                    confidence: 0.5,
                },
                adaptation: {
                    type: 'gate_modification',
                    parameters: example.userAction.parameters,
                },
                examples: [example.id],
                effectiveness: example.outcome.success ? 1.0 : 0.0,
            };
        }
        this.patterns.set(patternKey, pattern);
    }
    /**
     * Calculate similarity between contexts
     */
    calculateContextSimilarity(context1, context2) {
        let similarity = 0;
        // Phase similarity
        if (context1.prpPhase === context2.prpPhase) {
            similarity += 0.3;
        }
        // Blueprint similarity (simple keyword matching)
        const keywords1 = this.extractKeywords(context1.blueprint);
        const keywords2 = this.extractKeywords(context2.blueprint);
        const keywordOverlap = this.calculateKeywordOverlap(keywords1, keywords2);
        similarity += keywordOverlap * 0.4;
        // State similarity (basic structure comparison)
        const statesSimilar = this.compareStates(context1.inputState, context2.inputState);
        similarity += statesSimilar * 0.3;
        return Math.min(1.0, similarity);
    }
    /**
     * Adapt example to current context
     */
    adaptExampleToCurrentContext(example, currentState) {
        // Simple adaptation - in real implementation would be more sophisticated
        return {
            type: example.userAction.type,
            description: `Adapted from example: ${example.userAction.description}`,
            parameters: {
                ...example.userAction.parameters,
                adaptedFor: currentState.id,
                originalExample: example.id,
            },
            confidence: 0.7,
        };
    }
    /**
     * Extract keywords from blueprint for similarity comparison
     */
    extractKeywords(blueprint) {
        const text = `${blueprint.title} ${blueprint.description} ${blueprint.requirements?.join(' ')}`;
        return text
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3)
            .slice(0, 10); // Top 10 keywords
    }
    /**
     * Calculate keyword overlap between two sets
     */
    calculateKeywordOverlap(keywords1, keywords2) {
        const set1 = new Set(keywords1);
        const set2 = new Set(keywords2);
        const intersection = new Set([...set1].filter((x) => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Compare states for similarity
     */
    compareStates(state1, state2) {
        // Simple structural comparison
        const keys1 = Object.keys(state1);
        const keys2 = Object.keys(state2);
        const commonKeys = keys1.filter((key) => keys2.includes(key));
        return commonKeys.length / Math.max(keys1.length, keys2.length, 1);
    }
    /**
     * Get captured examples for analysis
     */
    getExamples(filter) {
        let examples = Array.from(this.examples.values());
        if (filter) {
            if (filter.type) {
                examples = examples.filter((ex) => ex.type === filter.type);
            }
            if (filter.phase) {
                examples = examples.filter((ex) => ex.context.prpPhase === filter.phase);
            }
            if (filter.tags) {
                examples = examples.filter((ex) => filter.tags?.some((tag) => ex.metadata.tags.includes(tag)));
            }
        }
        return examples;
    }
    /**
     * Get learned patterns
     */
    getPatterns() {
        return Array.from(this.patterns.values());
    }
}
//# sourceMappingURL=example-capture.js.map