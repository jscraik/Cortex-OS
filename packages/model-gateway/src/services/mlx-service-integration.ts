/**
 * brAInwav Cortex-OS MLX Service Integration Bridge
 * Provides seamless integration between TypeScript and Python MLX service
 */

import { z } from 'zod';

// Request/Response schemas for type safety
const MLXEmbeddingRequestSchema = z.object({
    texts: z.array(z.string()).min(1),
    model: z.string().optional(),
});

const MLXEmbeddingResponseSchema = z.object({
    embeddings: z.array(z.array(z.number())),
    model: z.string().optional(),
    dimensions: z.number().default(0),
    processing_time: z.number().optional(),
});

const MLXHealthResponseSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    service: z.string(),
    company: z.string(),
    hybrid_config: z.object({
        mlx_first_priority: z.number(),
        hybrid_mode: z.string(),
        available_models: z.number(),
        required_models: z.number(),
        model_validation: z.record(z.boolean()),
    }),
    deployment_ready: z.boolean(),
});

export type MLXEmbeddingRequest = z.infer<typeof MLXEmbeddingRequestSchema>;
export type MLXEmbeddingResponse = z.infer<typeof MLXEmbeddingResponseSchema>;
export type MLXHealthResponse = z.infer<typeof MLXHealthResponseSchema>;

export interface MLXServiceConfig {
    baseUrl: string;
    timeout: number;
    retries: number;
    backoffMultiplier: number;
    maxBackoffDelay: number;
}

export class MLXServiceIntegration {
    private config: MLXServiceConfig;
    private readonly serviceName = 'brAInwav Cortex-OS MLX Bridge';

    constructor(config: Partial<MLXServiceConfig> = {}) {
        this.config = {
            baseUrl: config.baseUrl || process.env.MLX_BASE_URL || 'http://localhost:8081',
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            backoffMultiplier: config.backoffMultiplier || 2,
            maxBackoffDelay: config.maxBackoffDelay || 10000,
        };
    }

    /**
     * Check if MLX service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await this.makeRequest('/health', 'GET', undefined, 5000);
            return response.ok;
        } catch (error) {
            console.warn(`${this.serviceName}: MLX service not available:`, error);
            return false;
        }
    }

    /**
     * Get health status from MLX service
     */
    async getHealth(): Promise<MLXHealthResponse> {
        try {
            const response = await this.makeRequest('/health', 'GET');
            const data = await response.json();
            return MLXHealthResponseSchema.parse(data);
        } catch (error) {
            console.error(`${this.serviceName}: Failed to get health status:`, error);
            throw new Error(`MLX service health check failed: ${error}`);
        }
    }

    /**
     * Generate embeddings using MLX service
     */
    async generateEmbeddings(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> {
        // Validate request
        const validatedRequest = MLXEmbeddingRequestSchema.parse(request);

        try {
            const response = await this.makeRequestWithRetry('/embeddings', 'POST', validatedRequest);
            const data = await response.json();
            
            // Validate response
            const validatedResponse = MLXEmbeddingResponseSchema.parse(data);
            
            console.log(`${this.serviceName}: Generated embeddings for ${validatedRequest.texts.length} texts`);
            return validatedResponse;
        } catch (error) {
            console.error(`${this.serviceName}: Failed to generate embeddings:`, error);
            throw new Error(`MLX embedding generation failed: ${error}`);
        }
    }

    /**
     * Generate single embedding
     */
    async generateEmbedding(text: string, model?: string): Promise<number[]> {
        const response = await this.generateEmbeddings({ 
            texts: [text], 
            model 
        });
        
        if (response.embeddings.length === 0) {
            throw new Error('No embeddings returned from MLX service');
        }
        
        return response.embeddings[0];
    }

    /**
     * Get available models from MLX service
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await this.makeRequest('/models', 'GET');
            const data = await response.json();
            
            // Extract model names from response
            if (data.models && Array.isArray(data.models)) {
                return data.models;
            }
            
            if (data.model_details && typeof data.model_details === 'object') {
                return Object.keys(data.model_details);
            }
            
            console.warn(`${this.serviceName}: Unexpected models response format`);
            return [];
        } catch (error) {
            console.error(`${this.serviceName}: Failed to get available models:`, error);
            return [];
        }
    }

    /**
     * Validate MLX service configuration
     */
    async validateConfiguration(): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];

        try {
            // Check if service is reachable
            const isAvailable = await this.isAvailable();
            if (!isAvailable) {
                issues.push('MLX service is not reachable');
            }

            // Check health status
            const health = await this.getHealth();
            if (health.status !== 'healthy') {
                issues.push(`MLX service status is ${health.status}`);
            }

            // Check if models are available
            const models = await this.getAvailableModels();
            if (models.length === 0) {
                issues.push('No MLX models are available');
            }

            return {
                valid: issues.length === 0,
                issues
            };
        } catch (error) {
            issues.push(`Configuration validation failed: ${error}`);
            return { valid: false, issues };
        }
    }

    /**
     * Make HTTP request with timeout
     */
    private async makeRequest(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: unknown,
        timeout?: number
    ): Promise<Response> {
        const url = `${this.config.baseUrl}${endpoint}`;
        const requestTimeout = timeout || this.config.timeout;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.serviceName,
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Make request with exponential backoff retry
     */
    private async makeRequestWithRetry(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: unknown
    ): Promise<Response> {
        let lastError: Error;

        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                return await this.makeRequest(endpoint, method, body);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt < this.config.retries) {
                    const delay = Math.min(
                        this.config.backoffMultiplier ** attempt * 1000,
                        this.config.maxBackoffDelay
                    );
                    
                    console.warn(
                        `${this.serviceName}: Request failed (attempt ${attempt + 1}/${this.config.retries + 1}), retrying in ${delay}ms:`,
                        lastError.message
                    );
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`${this.serviceName}: All retry attempts failed`);
                }
            }
        }

        throw lastError!;
    }

    /**
     * Get service configuration for debugging
     */
    getConfig(): MLXServiceConfig {
        return { ...this.config };
    }

    /**
     * Update service configuration
     */
    updateConfig(updates: Partial<MLXServiceConfig>): void {
        this.config = { ...this.config, ...updates };
        console.log(`${this.serviceName}: Configuration updated`);
    }
}

/**
 * Create a new MLX service integration instance
 */
export const createMLXServiceIntegration = (config?: Partial<MLXServiceConfig>): MLXServiceIntegration => {
    return new MLXServiceIntegration(config);
};

/**
 * Default MLX service integration instance
 */
export const mlxService = createMLXServiceIntegration();