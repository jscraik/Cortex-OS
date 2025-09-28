/**
 * Planning Context Manager for Cortex-OS
 * Implements context quarantine, isolation, and history management for DSP patterns
 * Maintains brAInwav branding and follows structured planning architecture
 */

import type { PlanningContext, PlanningPhase } from '../utils/dsp.js';

export interface ContextConfig {
    maxContexts: number;
    historyRetentionMs: number;
    quarantineEnabled: boolean;
    autoCleanupEnabled: boolean;
    brainwavTelemetryEnabled: boolean;
}

export interface ContextQuarantine {
    workspaceId: string;
    createdAt: Date;
    brainwavCreated: boolean;
    isolationLevel: 'strict' | 'moderate' | 'minimal';
}

export interface ContextStep {
    phase: PlanningPhase;
    action: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    timestamp: Date;
    result?: unknown;
}

export interface ContextHistoryEntry {
    decision: string;
    outcome: 'success' | 'failure';
    learned: string;
    timestamp: Date;
}

export interface ContextMetrics {
    createdAt: Date;
    updatedAt: Date;
    brainwavTracked: boolean;
    accessCount: number;
    lastAccessed: Date;
}

/**
 * Manages planning contexts with quarantine and isolation capabilities
 * Implements brAInwav-enhanced DSP patterns for multi-tenant planning
 */
export class PlanningContextManager {
    private readonly config: ContextConfig;
    private readonly contexts: Map<string, PlanningContext>;
    private readonly quarantineInfo: Map<string, ContextQuarantine>;
    private readonly contextMetrics: Map<string, ContextMetrics>;
    private readonly workspaceContexts: Map<string, Set<string>>;
    private telemetryListeners: Array<(event: Record<string, unknown>) => void> = [];

    constructor(config: Partial<ContextConfig> = {}) {
        this.config = {
            maxContexts: 50,
            historyRetentionMs: 3600000, // 1 hour default
            quarantineEnabled: true,
            autoCleanupEnabled: true,
            brainwavTelemetryEnabled: true,
            ...config,
        };

        this.contexts = new Map();
        this.quarantineInfo = new Map();
        this.contextMetrics = new Map();
        this.workspaceContexts = new Map();

        console.log(
            'brAInwav Planning Context Manager: Initialized with quarantine and isolation support',
        );

        // Start auto-cleanup if enabled
        if (this.config.autoCleanupEnabled) {
            this.startAutoCleanup();
        }
    }

    /**
     * Create a new planning context with quarantine isolation
     */
    createContext(context: PlanningContext): boolean {
        try {
            // Check capacity limits
            if (this.contexts.size >= this.config.maxContexts) {
                this.evictOldestContext();
            }

            // Quarantine context by workspace
            if (this.config.quarantineEnabled && context.workspaceId) {
                this.quarantineContext(context);
            }

            // Store context and initialize metrics
            this.contexts.set(context.id, { ...context });
            this.initializeContextMetrics(context.id);

            // Track workspace association
            if (context.workspaceId) {
                if (!this.workspaceContexts.has(context.workspaceId)) {
                    this.workspaceContexts.set(context.workspaceId, new Set());
                }
                this.workspaceContexts.get(context.workspaceId)!.add(context.id);
            }

            // Emit telemetry
            this.emitTelemetry({
                event: 'context_created',
                contextId: context.id,
                workspaceId: context.workspaceId,
                brainwavOrigin: true,
                timestamp: new Date(),
            });

            console.log(
                `brAInwav Context Manager: Created context ${context.id} with quarantine isolation`,
            );
            return true;
        } catch (error) {
            console.error(`brAInwav Context Manager: Failed to create context ${context.id}:`, error);
            return false;
        }
    }

    /**
     * Get context by ID with access tracking
     */
    getContext(contextId: string): PlanningContext | null {
        const context = this.contexts.get(contextId);
        if (!context) {
            return null;
        }

        // Update access metrics
        const metrics = this.contextMetrics.get(contextId);
        if (metrics) {
            metrics.accessCount++;
            metrics.lastAccessed = new Date();
        }

        return { ...context };
    }

    /**
     * Get contexts by workspace with quarantine enforcement
     */
    getContextsByWorkspace(workspaceId: string): PlanningContext[] {
        const contextIds = this.workspaceContexts.get(workspaceId) || new Set();
        const contexts: PlanningContext[] = [];

        for (const contextId of contextIds) {
            const context = this.contexts.get(contextId);
            if (context) {
                contexts.push({ ...context });
            }
        }

        return contexts;
    }

    /**
     * Get all active contexts
     */
    getActiveContexts(): PlanningContext[] {
        return Array.from(this.contexts.values()).map((context) => ({ ...context }));
    }

    /**
     * Update context history with trimming
     */
    updateContextHistory(contextId: string, historyEntry: ContextHistoryEntry): boolean {
        const context = this.contexts.get(contextId);
        if (!context) {
            return false;
        }

        context.history.push(historyEntry);
        context.metadata.updatedAt = new Date();

        // Auto-trim if history gets too large
        if (context.history.length > 100) {
            this.trimContextHistory(contextId, 50);
        }

        console.log(`brAInwav Context Manager: Updated history for context ${contextId}`);
        return true;
    }

    /**
     * Add step to context
     */
    addContextStep(contextId: string, step: ContextStep): boolean {
        const context = this.contexts.get(contextId);
        if (!context) {
            return false;
        }

        context.steps.push(step);
        context.metadata.updatedAt = new Date();

        console.log(`brAInwav Context Manager: Added step to context ${contextId}`);
        return true;
    }

    /**
     * Advance context phase
     */
    advancePhase(contextId: string, phase: PlanningPhase, action: string): boolean {
        const context = this.contexts.get(contextId);
        if (!context) {
            return false;
        }

        // Mark current step as completed if exists
        if (context.steps.length > 0) {
            const currentStep = context.steps[context.steps.length - 1];
            if (currentStep.status === 'in_progress') {
                currentStep.status = 'completed';
            }
        }

        // Add new step
        context.steps.push({
            phase,
            action,
            status: 'in_progress',
            timestamp: new Date(),
        });

        context.currentPhase = phase;
        context.metadata.updatedAt = new Date();

        console.log(`brAInwav Context Manager: Advanced context ${contextId} to phase ${phase}`);
        return true;
    }

    /**
     * Trim context history to specified size
     */
    trimContextHistory(contextId: string, maxSize: number): boolean {
        const context = this.contexts.get(contextId);
        if (!context) {
            return false;
        }

        if (context.history.length > maxSize) {
            // Keep most recent entries, sorted by timestamp
            context.history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            context.history = context.history.slice(0, maxSize);
            context.metadata.updatedAt = new Date();

            console.log(
                `brAInwav Context Manager: Trimmed history for context ${contextId} to ${maxSize} entries`,
            );
        }

        return true;
    }

    /**
     * Get quarantine information for a context
     */
    getQuarantineInfo(contextId: string): ContextQuarantine | undefined {
        return this.quarantineInfo.get(contextId);
    }

    /**
     * Get context metrics
     */
    getContextMetrics(contextId: string): ContextMetrics | undefined {
        return this.contextMetrics.get(contextId);
    }

    /**
     * Clean up expired contexts
     */
    cleanupExpiredContexts(): number {
        const now = Date.now();
        const expiredContextIds: string[] = [];

        for (const [contextId, metrics] of this.contextMetrics.entries()) {
            const age = now - metrics.createdAt.getTime();
            const context = this.contexts.get(contextId);

            // Skip critical priority contexts
            if (context && context.metadata.priority >= 9) {
                continue;
            }

            if (age > this.config.historyRetentionMs) {
                expiredContextIds.push(contextId);
            }
        }

        // Remove expired contexts
        for (const contextId of expiredContextIds) {
            this.removeContext(contextId);
        }

        if (expiredContextIds.length > 0) {
            console.log(
                `brAInwav Context Manager: Cleaned up ${expiredContextIds.length} expired contexts`,
            );
        }

        return expiredContextIds.length;
    }

    /**
     * Register telemetry listener
     */
    onTelemetry(listener: (event: Record<string, unknown>) => void): void {
        this.telemetryListeners.push(listener);
    }

    /**
     * Quarantine context by workspace
     */
    private quarantineContext(context: PlanningContext): void {
        if (!context.workspaceId) {
            return;
        }

        const quarantine: ContextQuarantine = {
            workspaceId: context.workspaceId,
            createdAt: new Date(),
            brainwavCreated: true,
            isolationLevel: this.determineIsolationLevel(context),
        };

        this.quarantineInfo.set(context.id, quarantine);
        console.log(
            `brAInwav Context Manager: Quarantined context ${context.id} in workspace ${context.workspaceId}`,
        );
    }

    /**
     * Determine isolation level based on context characteristics
     */
    private determineIsolationLevel(context: PlanningContext): 'strict' | 'moderate' | 'minimal' {
        if (context.metadata.priority >= 8 || context.metadata.complexity >= 8) {
            return 'strict';
        }
        if (context.metadata.priority >= 5 || context.metadata.complexity >= 5) {
            return 'moderate';
        }
        return 'minimal';
    }

    /**
     * Initialize context metrics
     */
    private initializeContextMetrics(contextId: string): void {
        const metrics: ContextMetrics = {
            createdAt: new Date(),
            updatedAt: new Date(),
            brainwavTracked: true,
            accessCount: 0,
            lastAccessed: new Date(),
        };

        this.contextMetrics.set(contextId, metrics);
    }

    /**
     * Evict oldest context when capacity is reached
     */
    private evictOldestContext(): void {
        let oldestContextId: string | null = null;
        let oldestTime = Date.now();

        // Find oldest context with lowest priority
        for (const [contextId, metrics] of this.contextMetrics.entries()) {
            const context = this.contexts.get(contextId);
            if (!context) continue;

            // Skip high priority contexts
            if (context.metadata.priority >= 8) continue;

            const age = oldestTime - metrics.createdAt.getTime();
            if (age > 0) {
                oldestTime = metrics.createdAt.getTime();
                oldestContextId = contextId;
            }
        }

        if (oldestContextId) {
            this.removeContext(oldestContextId);
            console.log(
                `brAInwav Context Manager: Evicted oldest context ${oldestContextId} due to capacity limits`,
            );
        }
    }

    /**
     * Remove context and cleanup references
     */
    private removeContext(contextId: string): void {
        const context = this.contexts.get(contextId);
        if (context && context.workspaceId) {
            const workspaceContexts = this.workspaceContexts.get(context.workspaceId);
            if (workspaceContexts) {
                workspaceContexts.delete(contextId);
            }
        }

        this.contexts.delete(contextId);
        this.contextMetrics.delete(contextId);
        this.quarantineInfo.delete(contextId);
    }

    /**
     * Start auto-cleanup timer
     */
    private startAutoCleanup(): void {
        const cleanupInterval = Math.min(this.config.historyRetentionMs / 4, 900000); // Max 15 min

        setInterval(() => {
            if (this.config.autoCleanupEnabled) {
                this.cleanupExpiredContexts();
            }
        }, cleanupInterval);

        console.log(
            `brAInwav Context Manager: Started auto-cleanup with ${cleanupInterval}ms interval`,
        );
    }

    /**
     * Emit telemetry event
     */
    private emitTelemetry(event: Record<string, unknown>): void {
        if (!this.config.brainwavTelemetryEnabled) {
            return;
        }

        for (const listener of this.telemetryListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('brAInwav Context Manager: Telemetry listener error:', error);
            }
        }
    }
}

/**
 * Create context manager with brAInwav-optimized defaults
 */
export function createPlanningContextManager(
    config?: Partial<ContextConfig>,
): PlanningContextManager {
    const defaultConfig: Partial<ContextConfig> = {
        maxContexts: 50,
        historyRetentionMs: 3600000, // 1 hour
        quarantineEnabled: true,
        autoCleanupEnabled: true,
        brainwavTelemetryEnabled: true,
    };

    return new PlanningContextManager({ ...defaultConfig, ...config });
}
