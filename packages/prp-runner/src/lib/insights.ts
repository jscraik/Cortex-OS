/**
 * Local insight helpers to avoid cross-domain imports.
 */

import { getPrompt, validatePromptUsage } from '@cortex-os/prompts';

interface EvidenceItem {
	claim: string;
	confidence: number;
	riskLevel: string;
	source: { type: string };
}

export function summarizeEvidence(evidenceCollection: EvidenceItem[]): string {
	return evidenceCollection
		.map(
			(e) =>
				`Claim: ${e.claim}\nConfidence: ${e.confidence}\nRisk: ${e.riskLevel}\nSource: ${e.source.type}`,
		)
		.join('\n\n');
}

export async function invokeRagAnalysis(
	aiCapabilities: {
		ragQuery: (args: any) => Promise<{
			answer: string;
			sources?: any[];
			prompt?: string;
			reasoning?: string;
		}>;
	},
	evidenceSummary: string,
	taskContext: string,
): Promise<{
	answer: string;
	sources?: any[];
	prompt?: string;
	reasoning?: string;
}> {
	const promptRecord = getPrompt('sys.prp.insights');
	if (!promptRecord) {
		throw new Error('brAInwav insights: Prompt sys.prp.insights is not registered.');
	}

	validatePromptUsage('', 'sys.prp.insights');

	return aiCapabilities.ragQuery({
		query: `Analyze this evidence collection for task: ${taskContext}`,
		systemPromptId: 'sys.prp.insights',
		systemPromptVariables: { evidenceSummary },
	});
}

export function parseInsightsResponse(answer: string) {
	const summary = extractSection(answer, 'summary');
	const keyFindings = extractList(answer, 'findings');
	const recommendations = extractList(answer, 'recommendations');
	return { summary, keyFindings, recommendations };
}

function extractSection(response: string, sectionName: string): string {
	const sectionPattern = new RegExp(`${sectionName}[:\\s]*\\n([^#]+)`, 'gi');
	const match = response.match(sectionPattern);
	return match ? match[0].replace(new RegExp(`${sectionName}[:\\s]*\\n`, 'gi'), '').trim() : '';
}

function extractList(response: string, listName: string): string[] {
	const listPattern = new RegExp(`${listName}[:\\s]*\\n((?:[-*•\\d.]\\s*[^\\n]+\\n?)+)`, 'gi');
	const match = response.match(listPattern);
	if (!match) return [];
	return match[0]
		.split('\n')
		.map((line) => line.replace(/^[-*•\\d.\\s]+/, '').trim())
		.filter((line) => line.length > 0)
		.slice(0, 10);
}

export function generateFallbackInsights(
	evidenceCollection: any[],
	_taskContext: string,
	calculateConfidenceMetrics: (e: any[]) => any,
	analyzeRiskDistribution: (e: any[]) => any,
) {
	const keyFindings = [
		`${evidenceCollection.length} evidence items collected`,
		'Evidence quality assessment completed',
		'Risk distribution analysis performed',
		'Confidence metrics calculated',
	];
	const recommendations = [
		'Review evidence confidence levels',
		'Validate high-risk claims',
		'Consider additional evidence sources',
		'Implement evidence validation workflow',
	];
	return {
		summary: '',
		keyFindings,
		riskAssessment: analyzeRiskDistribution(evidenceCollection),
		recommendations,
		confidenceMetrics: calculateConfidenceMetrics(evidenceCollection),
	};
}

export const isEmptyAnswer = (answer: string) => !answer || answer.trim() === '';
export const isInvalidSummary = (summary: string) => summary.length < 10;
