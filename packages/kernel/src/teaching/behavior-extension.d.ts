/**
 * @file teaching/behavior-extension.ts
 * @description Behavior Extension Modules - Adaptive system behavior based on examples
 * @author Cortex-OS Team
 * @version 1.0.0
 */
import type { PRPState } from "../state.js";
import type { ExampleCaptureSystem, TeachingPattern } from "./example-capture.js";
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
    basedOnPatterns: string[];
}
/**
 * Context provided to behavior extensions
 */
export interface ExtensionContext {
    captureSystem: ExampleCaptureSystem;
    executionHistory: PRPState[];
    userFeedback?: {
        satisfaction: number;
        suggestions: string[];
    };
}
/**
 * Result of behavior extension
 */
export interface ExtensionResult {
    modified: boolean;
    changes: {
        type: "validation_adjustment" | "gate_modification" | "workflow_alteration";
        description: string;
        impact: "low" | "medium" | "high";
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
export declare class BehaviorExtensionManager {
    private extensions;
    private captureSystem;
    private executionHistory;
    constructor(captureSystem: ExampleCaptureSystem);
    /**
     * Apply behavior extensions to current state
     */
    applyExtensions(state: PRPState, context?: Partial<ExtensionContext>): Promise<{
        modifiedState: PRPState;
        appliedExtensions: {
            extension: BehaviorExtension;
            result: ExtensionResult;
        }[];
    }>;
    /**
     * Create behavior extension from teaching pattern
     */
    createExtensionFromPattern(pattern: TeachingPattern): BehaviorExtension;
    /**
     * Register custom behavior extension
     */
    registerExtension(extension: BehaviorExtension): void;
    /**
     * Update extension confidence based on outcomes
     */
    updateExtensionEffectiveness(extensionId: string, outcome: {
        success: boolean;
        userSatisfaction?: number;
    }): void;
    /**
     * Initialize default behavior extensions
     */
    private initializeDefaultExtensions;
    /**
     * Apply pattern trigger evaluation
     */
    private evaluatePatternTrigger;
    /**
     * Apply pattern-based modification
     */
    private applyPatternModification;
    private mapAdaptationType;
    /**
     * Apply modifications to state
     */
    private applyModifications;
    /**
     * Helper methods for state modification
     */
    private adjustValidation;
    private modifyGates;
    private alterWorkflow;
    /**
     * Assessment helper methods
     */
    private assessProjectComplexity;
    private getHistoricalSuccessRate;
    private inferProjectType;
    private assessEvidenceNeeds;
    /**
     * Capture extension application for learning
     */
    private captureExtensionApplication;
    /**
     * Get active extensions
     */
    getExtensions(): BehaviorExtension[];
    /**
     * Get extension by ID
     */
    getExtension(id: string): BehaviorExtension | undefined;
}
//# sourceMappingURL=behavior-extension.d.ts.map