/**
 * @file mlx-adapter.ts
 * @description MLX Adapter for real MLX model integration via mlx-knife
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
/**
 * MLX Adapter - Direct integration with mlx-knife for real MLX model execution
 * Provides a bridge between TypeScript orchestrator and MLX models
 */
export class MLXAdapter {
    config;
    knifePath;
    constructor(config) {
        this.config = config;
        this.knifePath = config.knifePath || 'mlx-knife';
        this.validateConfig();
    }
    /**
     * Determine whether the runtime environment appears to have mlx-knife available.
     * We keep this extremely defensive – any error means 'not available'.
     */
    isRuntimeAvailable() {
        // If explicit path provided and exists on FS we assume available.
        if (this.config.knifePath && existsSync(this.config.knifePath))
            return true;
        // Best-effort PATH lookup by spawning 'which' synchronously via shell (cheap & safe in tests)
        try {
            const resolved = process.env.PATH?.split(':').some((p) => existsSync(`${p}/mlx-knife`));
            return Boolean(resolved);
        }
        catch {
            return false;
        }
    }
    /**
     * Validate MLX configuration
     */
    validateConfig() {
        if (!this.config.modelName) {
            throw new Error('MLX model name is required');
        }
        if (this.config.timeoutMs !== undefined && this.config.timeoutMs <= 0) {
            throw new Error('timeoutMs must be positive');
        }
    }
    /**
     * List available MLX models
     */
    async listModels() {
        if (!this.isRuntimeAvailable()) {
            // Return empty – caller tests can decide to skip.
            return [];
        }
        try {
            const output = await this.executeCommand(['list']);
            return this.parseModelList(output);
        }
        catch (error) {
            throw new Error(`Failed to list MLX models: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Check if a specific model is available
     */
    async isModelAvailable(modelName) {
        if (!this.isRuntimeAvailable())
            return false;
        try {
            // Try using mlx-knife show command first (faster than listing all models)
            const info = await this.getModelInfo(modelName);
            if (info && info.health === '[OK]') {
                return true;
            }
            // Fallback to listing all models
            const models = await this.listModels();
            const normalizedTarget = this.normalizeModelName(modelName);
            return models.some((model) => {
                const normalizedModelName = this.normalizeModelName(model.name);
                return (normalizedModelName === normalizedTarget ||
                    model.name.includes(normalizedTarget) ||
                    normalizedTarget.includes(model.name) ||
                    model.id === modelName);
            });
        }
        catch (_error) {
            return false;
        }
    }
    /**
     * Generate text using MLX model via mlx-knife
     */
    async generate(options) {
        if (!this.isRuntimeAvailable()) {
            throw new Error(`MLX runtime unavailable: cannot generate with ${this.config.modelName}`);
        }
        const { prompt, maxTokens = 512, temperature = 0.7 } = options;
        // Get the actual model name that mlx-knife recognizes
        const actualModelName = await this.getActualModelName(this.config.modelName);
        if (!actualModelName) {
            throw new Error(`MLX model not available: ${this.config.modelName}`);
        }
        try {
            const args = [
                'run',
                actualModelName,
                prompt,
                '--max-tokens',
                maxTokens.toString(),
                '--temperature',
                temperature.toString(),
            ];
            if (options.stopTokens && options.stopTokens.length > 0) {
                args.push('--stop', ...options.stopTokens);
            }
            const output = await this.executeCommand(args);
            return this.cleanMLXOutput(output);
        }
        catch (error) {
            throw new Error(`MLX generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get model information
     */
    async getModelInfo(modelName) {
        if (!this.isRuntimeAvailable())
            return null;
        const targetModel = modelName || this.config.modelName;
        try {
            const output = await this.executeCommand(['show', targetModel]);
            return this.parseModelInfo(output);
        }
        catch (_error) {
            return null;
        }
    }
    /**
     * Check model health
     */
    async checkHealth() {
        if (!this.isRuntimeAvailable()) {
            return { healthy: false, message: 'MLX runtime unavailable' };
        }
        try {
            const info = await this.getModelInfo();
            if (!info) {
                return {
                    healthy: false,
                    message: `Model ${this.config.modelName} not found`,
                };
            }
            if (info.health === '[OK]') {
                return { healthy: true, message: 'Model is healthy' };
            }
            else {
                return { healthy: false, message: `Model health: ${info.health}` };
            }
        }
        catch (error) {
            return {
                healthy: false,
                message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    /**
     * Execute mlx-knife command
     */
    async executeCommand(args) {
        return new Promise((resolve, reject) => {
            const child = spawn(this.knifePath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env,
            });
            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            // Set a configurable timeout with reasonable default
            const timeoutMs = this.config.timeoutMs || 30000; // Allow configuration of timeout
            const timeoutHandle = setTimeout(() => {
                child.kill();
                reject(new Error(`MLX command timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            child.on('close', (code) => {
                clearTimeout(timeoutHandle); // Clear timeout on completion
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    reject(new Error(`mlx-knife exited with code ${code}: ${stderr}`));
                }
            });
            child.on('error', (error) => {
                clearTimeout(timeoutHandle); // Clear timeout on error
                reject(new Error(`Failed to spawn mlx-knife: ${error.message}`));
            });
        });
    }
    /**
     * Parse model list output from mlx-knife
     */
    parseModelList(output) {
        const lines = output
            .split('\n')
            .filter((line) => line.trim() && !line.includes('⚠️') && !line.includes('NAME'));
        return lines
            .map((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                return {
                    name: parts[0],
                    id: parts[1],
                    size: parts[2],
                    modified: parts.slice(3, -1).join(' '),
                    path: '', // Will be filled by show command if needed
                    health: '[OK]', // Assume OK if listed
                };
            }
            return null;
        })
            .filter(Boolean);
    }
    /**
     * Parse model info output from mlx-knife show
     */
    parseModelInfo(output) {
        const lines = output.split('\n');
        const info = {};
        for (const line of lines) {
            if (line.startsWith('Model:')) {
                info.name = line.split('Model:')[1].trim();
            }
            else if (line.startsWith('Path:')) {
                info.path = line.split('Path:')[1].trim();
            }
            else if (line.startsWith('Snapshot:')) {
                info.id = line.split('Snapshot:')[1].trim();
            }
            else if (line.startsWith('Size:')) {
                info.size = line.split('Size:')[1].trim();
            }
            else if (line.startsWith('Modified:')) {
                info.modified = line.split('Modified:')[1].trim();
            }
            else if (line.startsWith('Health:')) {
                info.health = line.split('Health:')[1].trim();
            }
        }
        if (info.name && info.id) {
            return info;
        }
        return null;
    }
    /**
     * Clean MLX output by removing warnings and extra whitespace
     */
    cleanMLXOutput(output) {
        return output
            .split('\n')
            .filter((line) => {
            const lowerLine = line.toLowerCase();
            return (!line.includes('⚠️') &&
                !line.includes('Found') &&
                !line.includes('Command:') &&
                !lowerLine.includes('please move them to:') &&
                !lowerLine.includes('this warning will appear') &&
                !lowerLine.includes('mv /volumes/') &&
                line.trim().length > 0);
        })
            .join('\n')
            .trim();
    }
    /**
     * Get configured model name
     */
    getModelName() {
        return this.config.modelName;
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.validateConfig();
    }
    /**
     * Normalize model name by removing the mlx-community/ prefix if present
     */
    normalizeModelName(modelName) {
        return modelName.replace(/^mlx-community\//, '');
    }
    /**
     * Get the actual model name that mlx-knife recognizes
     */
    async getActualModelName(configuredName) {
        try {
            const models = await this.listModels();
            const normalizedTarget = this.normalizeModelName(configuredName);
            // Find exact match first
            const exactMatch = models.find((model) => this.normalizeModelName(model.name) === normalizedTarget);
            if (exactMatch) {
                return exactMatch.name;
            }
            // Find partial match
            const partialMatch = models.find((model) => model.name.includes(normalizedTarget) ||
                normalizedTarget.includes(model.name));
            return partialMatch?.name || null;
        }
        catch (_error) {
            return null;
        }
    }
}
/**
 * Create MLX adapter with commonly used models
 */
export const createMLXAdapter = (modelName, options = {}) => {
    return new MLXAdapter({
        modelName,
        maxTokens: 512,
        temperature: 0.7,
        ...options,
    });
};
/**
 * Available MLX models from the external drive
 * These names match exactly what mlx-knife list returns
 */
export const AVAILABLE_MLX_MODELS = {
    QWEN_SMALL: 'Qwen2.5-0.5B-Instruct-4bit',
    PHI_MINI: 'Phi-3-mini-4k-instruct-4bit',
    QWEN_VL: 'Qwen2.5-VL-3B-Instruct-6bit',
    GLM_4: 'GLM-4.5-4bit',
    MIXTRAL: 'Mixtral-8x7B-v0.1-hf-4bit-mlx',
    QWEN_CODER: 'Qwen3-Coder-30B-A3B-Instruct-4bit',
};
/**
 * HuggingFace repository names for reference
 */
export const HUGGINGFACE_MODEL_REPOS = {
    QWEN_SMALL: 'mlx-community/Qwen2.5-0.5B-Instruct-4bit',
    PHI_MINI: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
    QWEN_VL: 'mlx-community/Qwen2.5-VL-3B-Instruct-6bit',
    GLM_4: 'mlx-community/GLM-4.5-4bit',
    MIXTRAL: 'mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx',
    QWEN_CODER: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
};
//# sourceMappingURL=mlx-adapter.js.map