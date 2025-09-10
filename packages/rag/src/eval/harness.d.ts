import type { Embedder, Store } from '../lib';
import { type EvalSummary } from './metrics';
export interface GoldenItem {
	id: string;
	text: string;
}
export interface GoldenQuery {
	q: string;
	relevantDocIds: string[];
}
export interface GoldenDataset {
	name?: string;
	docs: GoldenItem[];
	queries: GoldenQuery[];
}
export interface RunEvalOptions {
	k: number;
}
export declare function prepareStore(
	dataset: GoldenDataset,
	E: Embedder,
	S: Store,
): Promise<void>;
export declare function runRetrievalEval(
	dataset: GoldenDataset,
	E: Embedder,
	S: Store,
	{ k }: RunEvalOptions,
): Promise<EvalSummary>;
//# sourceMappingURL=harness.d.ts.map
