/**
 * @file mlx-adapter.ts
 * @description MLX Adapter for real MLX model integration via mlx-knife
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
export interface MLXConfig {
    modelName: string;
    maxTokens?: number;
    temperature?: number;
    knifePath?: string;
    cachePath?: string;
    timeoutMs?: number;
}
export interface MLXGenerateOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    stopTokens?: string[];
}
export interface MLXModelInfo {
    name: string;
    id: string;
    size: string;
    modified: string;
    path: string;
    health: string;
}
/**
 * MLX Adapter - Direct integration with mlx-knife for real MLX model execution
 * Provides a bridge between TypeScript orchestrator and MLX models
 */
export declare class MLXAdapter {
    private config;
    private knifePath;
    constructor(config: MLXConfig);
    /**
     * Determine whether the runtime environment appears to have mlx-knife available.
     * We keep this extremely defensive – any error means 'not available'.
     */
    private isRuntimeAvailable;
    /**
     * Validate MLX configuration
     */
    private validateConfig;
    /**
     * List available MLX models
     */
    listModels(): Promise<MLXModelInfo[]>;
    /**
     * Check if a specific model is available
     */
    isModelAvailable(modelName: string): Promise<boolean>;
    /**
     * Generate text using MLX model via mlx-knife
     */
    generate(options: MLXGenerateOptions): Promise<string>;
    /**
     * Get model information
     */
    getModelInfo(modelName?: string): Promise<MLXModelInfo | null>;
    /**
     * Check model health
     */
    checkHealth(): Promise<{
        healthy: boolean;
        message: string;
    }>;
    /**
     * Execute mlx-knife command
     */
    private executeCommand;
    /**
     * Parse model list output from mlx-knife
     */
    private parseModelList;
    /**
     * Parse model info output from mlx-knife show
     */
    private parseModelInfo;
    /**
     * Clean MLX output by removing warnings and extra whitespace
     */
    private cleanMLXOutput;
    /**
     * Get configured model name
     */
    getModelName(): string;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<MLXConfig>): void;
    /**
     * Normalize model name by removing the mlx-community/ prefix if present
     */
    private normalizeModelName;
    /**
     * Get the actual model name that mlx-knife recognizes
     */
    private getActualModelName;
}
/**
 * Create MLX adapter with commonly used models
 */
export declare const createMLXAdapter: (modelName: string, options?: Partial<MLXConfig>) => MLXAdapter;
/**
 * Available MLX models from the external drive
 * These names match exactly what mlx-knife list returns
 */
export declare const AVAILABLE_MLX_MODELS: {
    readonly QWEN_SMALL: "Qwen2.5-0.5B-Instruct-4bit";
    readonly PHI_MINI: "Phi-3-mini-4k-instruct-4bit";
    readonly QWEN_VL: "Qwen2.5-VL-3B-Instruct-6bit";
    readonly GLM_4: "GLM-4.5-4bit";
    readonly MIXTRAL: "Mixtral-8x7B-v0.1-hf-4bit-mlx";
    readonly QWEN_CODER: "Qwen3-Coder-30B-A3B-Instruct-4bit";
};
/**
 * HuggingFace repository names for reference
 */
export declare const HUGGINGFACE_MODEL_REPOS: {
    readonly QWEN_SMALL: "mlx-community/Qwen2.5-0.5B-Instruct-4bit";
    readonly PHI_MINI: "mlx-community/Phi-3-mini-4k-instruct-4bit";
    readonly QWEN_VL: "mlx-community/Qwen2.5-VL-3B-Instruct-6bit";
    readonly GLM_4: "mlx-community/GLM-4.5-4bit";
    readonly MIXTRAL: "mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx";
    readonly QWEN_CODER: "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit";
};
//# sourceMappingURL=mlx-adapter.d.ts.map