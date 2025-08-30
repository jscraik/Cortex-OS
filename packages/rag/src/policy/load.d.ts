import { ProcessingDispatcher, type DispatchResult, type ProcessingFile } from '../chunkers/dispatch';
import { MimePolicyEngine, type MimePolicyConfig, type StrategyDecision } from './mime';
export interface RetrievalPolicy {
    version?: string;
    description?: string;
    mimePolicy: MimePolicyConfig;
    dispatcher?: {
        timeout?: number;
        maxChunkSize?: number;
        enableParallel?: boolean;
    };
    overrides?: Record<string, {
        processing?: Partial<{
            maxPages: number | null;
        }> & Record<string, unknown>;
    }>;
    security?: {
        sanitizeFilenames?: boolean;
        blocklist?: string[];
    };
}
export interface LoadedPolicy {
    policy: RetrievalPolicy;
    engine: MimePolicyEngine;
}
export declare function loadRetrievalPolicy(configPath?: string, schemaPath?: string): Promise<LoadedPolicy>;
export declare function applyPolicyOverrides(decision: StrategyDecision, mimeType: string, policy: RetrievalPolicy): StrategyDecision;
export declare function planAndDispatch(file: ProcessingFile, mimeType: string, engine: MimePolicyEngine, dispatcher: ProcessingDispatcher, policy?: RetrievalPolicy): Promise<DispatchResult>;
export declare function createDispatcherFromPolicy(policy?: RetrievalPolicy): ProcessingDispatcher;
//# sourceMappingURL=load.d.ts.map