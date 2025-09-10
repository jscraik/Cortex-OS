export declare function dcg(rels: number[]): number;
export declare function idealBinaryAtK(
	totalRelevant: number,
	k: number,
): number[];
export declare function ndcgAtK(
	binaryRelevances: number[],
	k: number,
	totalRelevant: number,
): number;
export declare function precisionAtK(
	binaryRelevances: number[],
	k: number,
): number;
export declare function recallAtK(
	binaryRelevances: number[],
	k: number,
	totalRelevant: number,
): number;
export interface QueryEval {
	q: string;
	ndcg: number;
	recall: number;
	precision: number;
}
export interface EvalSummary {
	k: number;
	ndcg: number;
	recall: number;
	precision: number;
	totalQueries: number;
	dataset?: string;
	perQuery: QueryEval[];
}
//# sourceMappingURL=metrics.d.ts.map
