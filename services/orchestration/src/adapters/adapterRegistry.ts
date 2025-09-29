import { performance } from 'node:perf_hooks';
import {
        AdapterNotRegisteredError,
        AdapterUnavailableError,
        GenerationAdapter,
        GenerationRequest,
        GenerationResponse,
} from './types.js';

export class AdapterRegistry {
        private readonly adapters = new Map<string, GenerationAdapter>();

        constructor(initialAdapters: GenerationAdapter[] = []) {
                initialAdapters.forEach((adapter) => this.register(adapter));
        }

        register(adapter: GenerationAdapter) {
                if (this.adapters.has(adapter.id)) {
                        throw new Error(`brAInwav adapter ${adapter.id} already registered`);
                }

                this.adapters.set(adapter.id, adapter);
        }

        async resolve(id: string): Promise<GenerationAdapter> {
                const adapter = this.adapters.get(id);
                if (!adapter) {
                        throw new AdapterNotRegisteredError(id);
                }

                const available = await adapter.isAvailable();
                if (!available) {
                        throw new AdapterUnavailableError(id, 'runtime check failed');
                }

                return adapter;
        }

        async invoke(id: string, request: GenerationRequest): Promise<GenerationResponse> {
                const adapter = await this.resolve(id);
                const started = performance.now();
                const response = await adapter.generate(request);
                const latency = performance.now() - started;
                console.info(
                        `brAInwav adapter ${adapter.id} generated response in ${latency.toFixed(2)}ms`,
                        {
                                adapterId: adapter.id,
                                latencyMs: latency,
                        },
                );
                return response;
        }

        listRegisteredAdapters(): string[] {
                return Array.from(this.adapters.keys());
        }
}
