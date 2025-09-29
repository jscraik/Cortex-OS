export interface GenerationRequest {
        prompt: string;
        metadata?: Record<string, unknown>;
}

export interface GenerationResponse {
        output: string;
        adapterId: string;
        tokensUsed: number;
}

export interface GenerationAdapter {
        readonly id: string;
        isAvailable(): Promise<boolean>;
        generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export class AdapterUnavailableError extends Error {
        constructor(adapterId: string, reason: string) {
                super(`brAInwav adapter ${adapterId} unavailable: ${reason}`);
                this.name = 'AdapterUnavailableError';
        }
}

export class AdapterNotRegisteredError extends Error {
        constructor(adapterId: string) {
                super(`brAInwav adapter ${adapterId} is not registered`);
                this.name = 'AdapterNotRegisteredError';
        }
}
