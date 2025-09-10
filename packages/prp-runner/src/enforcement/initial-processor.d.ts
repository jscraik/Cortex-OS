/**
 * @file packages/prp-runner/src/enforcement/initial-processor.ts
 * @description Process initial.md files into enforcement profiles for PRP validation
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import type { EnforcementProfile } from '../gates/base.js';
export interface InitialMdContent {
	title: string;
	context: string;
	requirements: string[];
	constraints?: string[];
	references?: string[];
	tests: string[];
	acceptance_criteria: string[];
	budgets?: {
		coverage?: {
			lines?: number;
			branches?: number;
		};
		performance?: {
			lcp?: number;
			tbt?: number;
		};
		accessibility?: {
			score?: number;
		};
	};
	architecture?: {
		boundaries?: string[];
		naming?: Record<string, string>;
		layout?: string[];
		exceptions?: string[];
	};
	governance?: {
		license?: string;
		owners?: Record<string, string[]>;
		checks?: string[];
	};
}
/**
 * Parse initial.md markdown content into structured data
 */
export declare function parseInitialMd(content: string): InitialMdContent;
/**
 * Convert InitialMdContent to EnforcementProfile
 */
export declare function compileEnforcementProfile(
	initialMd: InitialMdContent,
): EnforcementProfile;
/**
 * Load and process initial.md file from filesystem
 */
export declare function loadInitialMd(
	projectRoot: string,
	initialMdPath?: string,
): Promise<EnforcementProfile>;
//# sourceMappingURL=initial-processor.d.ts.map
