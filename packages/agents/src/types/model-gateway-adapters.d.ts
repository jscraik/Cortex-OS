declare module '@cortex-os/model-gateway/dist/adapters/mlx-adapter.js' {
    export class MLXAdapter {
        isAvailable(): Promise<boolean>;
        generateChat(payload: unknown, model?: string): Promise<unknown>;
    }
}

declare module '@cortex-os/model-gateway/dist/adapters/ollama-adapter.js' {
    export class OllamaAdapter {
        generateChat(payload: unknown, model?: string): Promise<unknown>;
    }
}
