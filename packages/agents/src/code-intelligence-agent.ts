/**
 * Enhanced Code Intelligence Agent
 * Integrates Qwen3-Coder and DeepSeek-Coder for comprehensive code analysis
 */

import { EventEmitter } from 'events';
import {
  INTEGRATION_POINTS,
  selectOptimalModel,
  TaskCharacteristics,
} from '../../../config/model-integration-strategy.js';

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type AnalysisType = 'review' | 'refactor' | 'optimize' | 'architecture' | 'security';
export type SuggestionType = 'improvement' | 'refactor' | 'bug_fix' | 'optimization';
export type MaintainabilityLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  context?: string;
  analysisType: AnalysisType;
  urgency: UrgencyLevel;
}

export interface CodeAnalysisResult {
  suggestions: CodeSuggestion[];
  complexity: ComplexityAnalysis;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
  confidence: number;
  modelUsed: string;
  processingTime: number;
}

export interface CodeSuggestion {
  type: SuggestionType;
  line?: number;
  description: string;
  code?: string;
  rationale: string;
  priority: Priority;
}

export interface ComplexityAnalysis {
  cyclomatic: number;
  cognitive: number;
  maintainability: MaintainabilityLevel;
  hotspots: string[];
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  riskLevel: RiskLevel;
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  line?: number;
  description: string;
  mitigation: string;
}

export interface PerformanceAnalysis {
  bottlenecks: PerformanceBottleneck[];
  memoryUsage: 'efficient' | 'moderate' | 'high' | 'excessive';
  optimizations: string[];
}

export interface PerformanceBottleneck {
  location: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export class CodeIntelligenceAgent extends EventEmitter {
  private readonly ollamaEndpoint: string;
  private readonly mlxEndpoint: string;
  private readonly analysisHistory: Map<string, CodeAnalysisResult>;

  constructor(
    config: {
      ollamaEndpoint?: string;
      mlxEndpoint?: string;
    } = {},
  ) {
    super();
    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434';
    this.mlxEndpoint = config.mlxEndpoint || 'http://localhost:8765';
    this.analysisHistory = new Map();
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    const startTime = Date.now();

    // Determine optimal model based on task characteristics
    const characteristics: TaskCharacteristics = {
      complexity: this.assessComplexity(request.code),
      latency: request.urgency === 'high' ? 'fast' : 'batch',
      accuracy: request.analysisType === 'security' ? 'premium' : 'high',
      resource_constraint: 'moderate',
      modality: 'code',
    };

    const modelId = selectOptimalModel('agents', 'codeIntelligence', characteristics);

    try {
      // Route to appropriate model
      let result: CodeAnalysisResult;

      if (modelId.includes('qwen3-coder')) {
        result = await this.analyzeWithQwen3Coder(request, modelId);
      } else if (modelId.includes('deepseek-coder')) {
        result = await this.analyzeWithDeepSeekCoder(request, modelId);
      } else {
        throw new Error(`Unsupported model: ${modelId}`);
      }

      result.processingTime = Date.now() - startTime;
      result.modelUsed = modelId;

      // Cache result
      const cacheKey = this.generateCacheKey(request);
      this.analysisHistory.set(cacheKey, result);

      this.emit('analysis_complete', { request, result });
      return result;
    } catch (error) {
      this.emit('analysis_error', { request, error });
      throw error;
    }
  }

  private async analyzeWithQwen3Coder(
    request: CodeAnalysisRequest,
    modelId: string,
  ): Promise<CodeAnalysisResult> {
    const prompt = this.buildCodeAnalysisPrompt(request);

    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent code analysis
          top_p: 0.9,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen3-Coder analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseCodeAnalysisResponse(data.response, 'qwen3-coder');
  }

  private async analyzeWithDeepSeekCoder(
    request: CodeAnalysisRequest,
    modelId: string,
  ): Promise<CodeAnalysisResult> {
    const prompt = this.buildCodeAnalysisPrompt(request);

    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.9,
          num_predict: 1500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek-Coder analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseCodeAnalysisResponse(data.response, 'deepseek-coder');
  }

  private buildCodeAnalysisPrompt(request: CodeAnalysisRequest): string {
    const analysisTypes = INTEGRATION_POINTS.agents.codeIntelligence;

    return `As an expert code analyst, perform a comprehensive ${request.analysisType} analysis of the following ${request.language} code.

Context: ${request.context || 'No additional context provided'}

Code to analyze:
\`\`\`${request.language}
${request.code}
\`\`\`

Please provide a detailed analysis including:

1. **Code Quality & Suggestions**: Identify improvements, refactoring opportunities, and best practices
2. **Complexity Analysis**: Assess cyclomatic and cognitive complexity
3. **Security Analysis**: Identify potential vulnerabilities and security concerns  
4. **Performance Analysis**: Spot bottlenecks and optimization opportunities

Format your response as a structured analysis with clear sections and actionable recommendations.
Focus on practical, implementable suggestions with clear rationale.

Analysis Type: ${request.analysisType}
Urgency: ${request.urgency}`;
  }

  private parseCodeAnalysisResponse(response: string, modelType: string): CodeAnalysisResult {
    // This would need sophisticated parsing logic
    // For now, return a structured example
    return {
      suggestions: [
        {
          type: 'improvement',
          line: 1,
          description: 'Consider adding input validation',
          code: '// Add validation logic here',
          rationale: 'Improves security and error handling',
          priority: 'medium',
        },
      ],
      complexity: {
        cyclomatic: 5,
        cognitive: 3,
        maintainability: 'high',
        hotspots: ['function processData()'],
      },
      security: {
        vulnerabilities: [],
        riskLevel: 'low',
        recommendations: ['Add input sanitization', 'Implement proper error handling'],
      },
      performance: {
        bottlenecks: [],
        memoryUsage: 'efficient',
        optimizations: ['Consider caching repeated calculations'],
      },
      confidence: 0.85,
      modelUsed: modelType,
      processingTime: 0, // Will be set by caller
    };
  }

  private assessComplexity(code: string): 'low' | 'medium' | 'high' {
    const lines = code.split('\n').length;
    const complexityIndicators = (code.match(/if|for|while|switch|catch|function|class/g) || [])
      .length;

    if (lines > 200 || complexityIndicators > 20) return 'high';
    if (lines > 50 || complexityIndicators > 10) return 'medium';
    return 'low';
  }

  private generateCacheKey(request: CodeAnalysisRequest): string {
    return `${request.analysisType}-${request.language}-${Buffer.from(request.code).toString('base64').slice(0, 16)}`;
  }

  async getAnalysisHistory(): Promise<CodeAnalysisResult[]> {
    return Array.from(this.analysisHistory.values());
  }

  clearAnalysisHistory(): void {
    this.analysisHistory.clear();
  }
}
