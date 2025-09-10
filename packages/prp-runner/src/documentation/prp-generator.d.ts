/**
 * @file packages/prp-runner/src/documentation/prp-generator.ts
 * @description Generate finalized prp.md documents with audit trails and approvals
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import type { PRPState } from '@cortex-os/kernel';
export interface PRPDocument {
	id: string;
	title: string;
	repo: string;
	branch: string;
	owner: string;
	created: string;
	updated: string;
	version: string;
	status: 'ready-for-release' | 'in-progress' | 'recycled' | 'failed';
	links: {
		issue?: string;
		pr?: string;
		checks?: string;
	};
}
export interface ReviewJSON {
	schema: string;
	scores: Record<string, 'green' | 'amber' | 'red'>;
	findings: Array<{
		id: string;
		severity: 'blocker' | 'major' | 'minor' | 'nit';
		evidence: Array<{
			path: string;
			lines: string;
			sha: string;
		}>;
		recommendation: string;
	}>;
}
/**
 * Generate prp.md markdown document from PRP state
 */
export declare function generatePRPMarkdown(
	state: PRPState,
	document: PRPDocument,
	reviewJson?: ReviewJSON,
): string;
/**
 * Write prp.md file to filesystem
 */
export declare function writePRPDocument(
	prpContent: string,
	outputPath: string,
): Promise<void>;
/**
 * Generate machine-checkable review JSON
 */
export declare function generateReviewJSON(state: PRPState): ReviewJSON;
//# sourceMappingURL=prp-generator.d.ts.map
