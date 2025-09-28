import { trace } from '@opentelemetry/api';
import { createCerebrumGraph } from './create-cerebrum-graph.js';

export interface RunInput {
        input: string;
        task?: string;
}
export interface RunOutput {
        output?: string;
        summary?: ExecutionSummary;
}

export interface ExecutionSummary {
        input: string;
        output?: string;
        selectedModel?: { provider: string; model: string };
        streaming: boolean;
        thermalState: string;
}

export interface ExecutionLogger {
        info: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface RunOptions {
        streaming?: boolean;
        thermalState?: string;
        logger?: ExecutionLogger;
        onSummary?: (summary: ExecutionSummary) => void;
}

export async function runOnce(input: RunInput, options: RunOptions = {}): Promise<RunOutput> {
        const tracer = trace.getTracer('orchestration');
        const streamingEnabled = options.streaming ?? false;
        const thermalState = options.thermalState ?? 'unknown';
        options.logger?.info('brAInwav langgraph executor starting', {
                streaming: streamingEnabled,
                thermalState,
                task: input.task ?? 'unspecified',
        });
        return await tracer.startActiveSpan('runOnce', async (span) => {
                try {
                        const graph = createCerebrumGraph();
                        const res = await graph.invoke({ input: input.input });
                        span.setAttribute('orchestration.output_length', res.output?.length ?? 0);
                        const summary: ExecutionSummary = {
                                input: input.input,
                                output: res.output,
                                selectedModel: res.selectedModel,
                                streaming: streamingEnabled,
                                thermalState,
                        };
                        options.onSummary?.(summary);
                        options.logger?.info('brAInwav langgraph executor completed', {
                                outputLength: res.output?.length ?? 0,
                                streaming: streamingEnabled,
                                thermalState,
                        });
                        return { output: res.output, summary };
                } finally {
                        span.end();
                }
        });
}

export async function shutdownExecutor(): Promise<void> {
	// Placeholder for future resource cleanup (e.g., checkpoint stores, queues)
}
