export interface Evidence {
	id: string;
	taskId: string;
	claim: string;
	confidence: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	source: { type: string; id: string; metadata?: Record<string, unknown> };
	timestamp: string;
	tags: string[];
	content?: string;
	relatedEvidenceIds: string[];
}

export interface ConfidenceMetrics {
	averageConfidence: number;
	confidenceDistribution: Record<string, number>;
	reliabilityScore: number;
}

export interface RiskAssessment {
	overallRisk: 'low' | 'medium' | 'high' | 'critical';
	specificRisks: Array<{
		type: string;
		description: string;
		mitigation: string;
	}>;
}

export function summarizeEvidence(evidenceCollection: Evidence[]): string {
	return evidenceCollection
		.map(
			(e) =>
				`Claim: ${e.claim}\nConfidence: ${e.confidence}\nRisk: ${e.riskLevel}\nSource: ${e.source.type}`,
		)
		.join('\n\n');
}

export async function invokeRagAnalysis(
	aiCapabilities: {
		ragQuery: (args: { query: string; systemPrompt: string }) => Promise<{ answer: string }>;
	},
	evidenceSummary: string,
	taskContext: string,
) {
	return aiCapabilities.ragQuery({
		query: `Analyze this evidence collection for task: ${taskContext}`,
		systemPrompt: `You are an evidence analyst. Analyze the provided evidence collection and provide:\n                       1. A concise summary of key findings\n                       2. Risk assessment with specific risks and mitigations\n                       3. Actionable recommendations\n                       4. Confidence and reliability metrics\n\n                       Evidence Collection:\n                       ${evidenceSummary}`,
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
		.split('\\n')
		.map((line) => line.replace(/^[-*•\\d.\\s]+/, '').trim())
		.filter((line) => line.length > 0)
		.slice(0, 10);
}

export function generateFallbackInsights(
	evidenceCollection: Evidence[],
	_taskContext: string,
	calculateConfidenceMetrics: (evidence: Evidence[]) => ConfidenceMetrics,
	analyzeRiskDistribution: (evidence: Evidence[]) => RiskAssessment,
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

export const isEmptyAnswer = (answer?: string) => !answer || answer.trim() === '';

export const isInvalidSummary = (summary: string) => summary.length < 10;
