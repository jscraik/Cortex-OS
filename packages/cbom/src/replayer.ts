import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CbomDecision, CbomDocument } from './types.js';

export interface ReplaySummary {
	matched: number;
	drift: number;
	skipped: number;
}

export class CbomReplayer {
	async replay(cbomPath: string): Promise<ReplaySummary> {
		const document = await this.readDocument(cbomPath);
		let matched = 0;
		let drift = 0;
		let skipped = 0;
		for (const decision of document.decisions) {
			if (this.isProbabilistic(decision)) {
				skipped += 1;
				continue;
			}
			const result = await this.replayDecision(decision);
			if (result) {
				matched += 1;
			} else {
				drift += 1;
			}
		}
		return { matched, drift, skipped };
	}

	private async readDocument(cbomPath: string): Promise<CbomDocument> {
		const payload = await fs.readFile(path.resolve(cbomPath), 'utf8');
		return JSON.parse(payload) as CbomDocument;
	}

	private isProbabilistic(decision: CbomDecision): boolean {
		return decision.determinism?.mode === 'non-deterministic';
	}

	private async replayDecision(decision: CbomDecision): Promise<boolean> {
		if (!decision.outputs || decision.outputs.length === 0) {
			return true;
		}
		return false;
	}
}
