import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('../../../config/model-integration-strategy.js', () => ({
  selectOptimalModel: vi.fn(),
}));

import { CodeIntelligenceAgent, CodeAnalysisRequest } from './code-intelligence-agent';
import { selectOptimalModel } from '../../../config/model-integration-strategy.js';

const baseResult = {
  suggestions: [],
  complexity: { cyclomatic: 0, cognitive: 0, maintainability: 'low', hotspots: [] },
  security: { vulnerabilities: [], riskLevel: 'low', recommendations: [] },
  performance: { bottlenecks: [], memoryUsage: 'efficient', optimizations: [] },
  confidence: 1,
  modelUsed: '',
  processingTime: 0,
};

describe('CodeIntelligenceAgent', () => {
  beforeEach(() => {
    (selectOptimalModel as Mock).mockReset();
    delete process.env.OLLAMA_ENDPOINT;
    delete process.env.MLX_ENDPOINT;
  });

  it('requires endpoints', () => {
    expect(() => new CodeIntelligenceAgent()).toThrow();
  });

  it('parses valid model responses', () => {
    const agent = new CodeIntelligenceAgent({ ollamaEndpoint: 'http://o', mlxEndpoint: 'http://m' });
    const response = JSON.stringify({
      suggestions: [{ type: 'improvement', description: 'test', rationale: 'r', priority: 'low' }],
      complexity: { cyclomatic: 1, cognitive: 1, maintainability: 'low', hotspots: [] },
      security: { vulnerabilities: [], riskLevel: 'low', recommendations: [] },
      performance: { bottlenecks: [], memoryUsage: 'efficient', optimizations: [] },
      confidence: 0.9,
    });
    const result = (agent as any).parseCodeAnalysisResponse(response, 'qwen3-coder');
    expect(result.modelUsed).toBe('qwen3-coder');
    expect(result.suggestions).toHaveLength(1);
  });

  it('throws on invalid model responses', () => {
    const agent = new CodeIntelligenceAgent({ ollamaEndpoint: 'http://o', mlxEndpoint: 'http://m' });
    expect(() => (agent as any).parseCodeAnalysisResponse('not json', 'm')).toThrow();
  });

  it('caches analysis results', async () => {
    (selectOptimalModel as Mock).mockReturnValue('qwen3-coder');
    const agent = new CodeIntelligenceAgent({ ollamaEndpoint: 'http://o', mlxEndpoint: 'http://m' });
    const spy = vi
      .spyOn(agent as any, 'analyzeWithQwen3Coder')
      .mockResolvedValue({ ...baseResult });
    const request: CodeAnalysisRequest = {
      code: 'print(1)',
      language: 'python',
      analysisType: 'review',
      urgency: 'low',
    };

    await agent.analyzeCode(request);
    await agent.analyzeCode(request);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
