import { trace } from '@opentelemetry/api';
import { createCerebrumGraph } from './create-cerebrum-graph.js';

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
			const graph = createCerebrumGraph();
			const res = await graph.invoke({ input: input.input, task: input.task });
			span.setAttribute('orchestration.output_length', res.output?.length ?? 0);
			return { output: res.output };
		} finally {
			span.end();
		}
	});
}

export async function shutdownExecutor(): Promise<void> {
	// Placeholder for future resource cleanup (e.g., checkpoint stores, queues)
}
