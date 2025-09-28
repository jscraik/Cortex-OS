import { trace } from '@opentelemetry/api';
import { executePlannedWorkflow } from './planning-orchestrator.js';

export interface RunInput {
	input: string;
	task?: string;
}
export interface RunOutput {
	output?: string;
}

export async function runOnce(input: RunInput): Promise<RunOutput> {
        const tracer = trace.getTracer('orchestration');
        return await tracer.startActiveSpan('runOnce', async (span) => {
                try {
                        const result = await executePlannedWorkflow({
                                input: input.input,
                                task: {
                                        id: input.task ?? `run-${Date.now()}`,
                                        description: input.task ?? 'brAInwav ad-hoc task',
                                },
                        });
                        span.setAttribute('orchestration.output_length', result.output?.length ?? 0);
                        span.setAttribute('orchestration.planning_success', result.planningResult.success);
                        span.setAttribute('orchestration.strategy', result.coordinationDecision.strategy);
                        return { output: result.output };
                } finally {
                        span.end();
                }
        });
}

export async function shutdownExecutor(): Promise<void> {
	// Placeholder for future resource cleanup (e.g., checkpoint stores, queues)
}
