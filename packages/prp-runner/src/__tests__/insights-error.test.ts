import { beforeEach, expect, test, vi } from 'vitest';
import { ASBRAIIntegration } from '../asbr-ai-integration.js';

vi.mock('../ai-capabilities.js', () => ({
	createAICapabilities: vi.fn(() => ({
		generate: vi.fn(),
		addKnowledge: vi.fn(),
		searchKnowledge: vi.fn(),
		ragQuery: vi.fn(),
		getCapabilities: vi.fn(),
		getKnowledgeStats: vi.fn(),
	})),
}));

let integration: ASBRAIIntegration;
let mockAICapabilities: { ragQuery: ReturnType<typeof vi.fn> };
const evidence = [
	{
		id: 'e1',
		taskId: 't1',
		claim: 'test claim',
		confidence: 0.5,
		riskLevel: 'low' as const,
		source: { type: 'file', id: 's1' },
		timestamp: new Date().toISOString(),
		tags: [],
		relatedEvidenceIds: [],
	},
];

beforeEach(() => {
	vi.clearAllMocks();
	integration = new ASBRAIIntegration();
	mockAICapabilities = (
		integration as unknown as {
			aiCapabilities: { ragQuery: ReturnType<typeof vi.fn> };
		}
	).aiCapabilities;
});

test('uses fallback when ragQuery returns empty answer', async () => {
	mockAICapabilities.ragQuery.mockResolvedValue({ answer: '' });
	const result = await integration.generateEvidenceInsights(evidence, 'ctx');
	expect(result.summary).toBe('');
	expect(result.keyFindings[0]).toBe('1 evidence items collected');
});

test('uses fallback when summary parsing fails', async () => {
	mockAICapabilities.ragQuery.mockResolvedValue({ answer: 'No sections here' });
	const result = await integration.generateEvidenceInsights(evidence, 'ctx');
	expect(result.summary).toBe('');
	expect(result.keyFindings[0]).toBe('1 evidence items collected');
});
