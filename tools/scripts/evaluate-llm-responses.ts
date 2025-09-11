import { z } from 'zod';

export const evaluationDatasetSchema = z.array(
	z.object({
		prompt: z.string(),
		expected: z.string(),
		response: z.string(),
		latency_ms: z.number().int().nonnegative(),
	}),
);

export const evaluationInputSchema = z.object({
	dataset: evaluationDatasetSchema,
	accuracyThreshold: z.number().min(0).max(1).default(0.8),
	recallThreshold: z.number().min(0).max(1).default(0.8),
	f1Threshold: z.number().min(0).max(1).default(0.8),
	latencyThreshold: z.number().nonnegative().default(150),
	toxicityThreshold: z.number().min(0).max(1).default(0.2),
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

export interface EvaluationMetrics {
	accuracy: number | null;
	recall: number | null;
	f1: number | null;
	latency_ms: number | null;
	toxicity_score: number | null;
	pass: boolean;
	timestamp: string;
}

export function evaluateResponses(input: EvaluationInput): EvaluationMetrics {
	const {
		dataset,
		accuracyThreshold,
		recallThreshold,
		f1Threshold,
		latencyThreshold,
		toxicityThreshold,
	} = evaluationInputSchema.parse(input);

	const result: EvaluationMetrics = {
		accuracy: null,
		recall: null,
		f1: null,
		latency_ms: null,
		toxicity_score: null,
		pass: false,
		timestamp: new Date().toISOString(),
	};

	let tp = 0;
	let tn = 0;
	let fp = 0;
	let fn = 0;
	let toxicCount = 0;
	const latencies: number[] = [];
	const toxicTerms = ['badword'];

	for (const item of dataset) {
		const { expected, response, latency_ms } = item;
		latencies.push(latency_ms);
		const expYes = expected.toLowerCase() === 'yes';
		const resYes = response.toLowerCase() === 'yes';
		if (expYes && resYes) tp++;
		else if (!expYes && !resYes) tn++;
		else if (!expYes && resYes) fp++;
		else if (expYes && !resYes) fn++;
		const lower = response.toLowerCase();
		if (toxicTerms.some((t) => lower.includes(t))) toxicCount++;
	}

	const accuracy = (tp + tn) / dataset.length;
	const recall = tp + fn === 0 ? null : tp / (tp + fn);
	const precision = tp + fp === 0 ? null : tp / (tp + fp);
	const f1 =
		precision == null || recall == null || precision + recall === 0
			? null
			: (2 * precision * recall) / (precision + recall);
	const latency_ms = latencies.reduce((a, b) => a + b, 0) / latencies.length;
	const toxicity_score = dataset.length ? toxicCount / dataset.length : 0;
	const pass =
		accuracy >= accuracyThreshold &&
		recall >= recallThreshold &&
		f1 >= f1Threshold &&
		latency_ms <= latencyThreshold &&
		toxicity_score <= toxicityThreshold;

	result.accuracy = accuracy;
	result.recall = recall;
	result.f1 = f1;
	result.latency_ms = latency_ms;
	result.toxicity_score = toxicity_score;
	result.pass = pass;

	return result;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
	const arg = process.argv[2];
	const input = arg ? JSON.parse(arg) : { dataset: [] };
	try {
		const res = evaluateResponses(input);
		if (process.argv.includes('--json')) {
			console.log(JSON.stringify(res));
		} else {
			console.log(res);
		}
	} catch (err) {
		console.error({ error: 'INVALID_INPUT', message: (err as Error).message });
		process.exit(1);
	}
}
