/**
 * Enhanced Code Intelligence Agent
 * Integrates Qwen3-Coder and DeepSeek-Coder for comprehensive code analysis
 */

import { EventEmitter } from 'events';
import {
  selectOptimalModel,
  TaskCharacteristics,
} from '../../../config/model-integration-strategy.js';
import { z } from 'zod';

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type AnalysisType = 'review' | 'refactor' | 'optimize' | 'architecture' | 'security';
export type SuggestionType = 'improvement' | 'refactor' | 'bug_fix' | 'optimization';
export type MaintainabilityLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export const codeAnalysisRequestSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  context: z.string().optional(),
  analysisType: z.enum(['review', 'refactor', 'optimize', 'architecture', 'security']),
  urgency: z.enum(['low', 'medium', 'high']),
});

export type CodeAnalysisRequest = z.infer<typeof codeAnalysisRequestSchema>;

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

const suggestionSchema = z.object({
  type: z.enum(['improvement', 'refactor', 'bug_fix', 'optimization']),
  line: z.number().optional(),
  description: z.string(),
  code: z.string().optional(),
  rationale: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

const complexitySchema = z.object({
  cyclomatic: z.number(),
  cognitive: z.number(),
  maintainability: z.enum(['low', 'medium', 'high']),
  hotspots: z.array(z.string()),
});

const securityVulnerabilitySchema = z.object({
  type: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  line: z.number().optional(),
  description: z.string(),
  mitigation: z.string(),
});

const securitySchema = z.object({
  vulnerabilities: z.array(securityVulnerabilitySchema),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  recommendations: z.array(z.string()),
});

const performanceBottleneckSchema = z.object({
  location: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
  suggestion: z.string(),
});

const performanceSchema = z.object({
  bottlenecks: z.array(performanceBottleneckSchema),
  memoryUsage: z.enum(['efficient', 'moderate', 'high', 'excessive']),
  optimizations: z.array(z.string()),
});

const rawAnalysisResultSchema = z.object({
  suggestions: z.array(suggestionSchema),
  complexity: complexitySchema,
  security: securitySchema,
  performance: performanceSchema,
  confidence: z.number(),
});

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
    this.ollamaEndpoint =
      config.ollamaEndpoint ?? process.env.OLLAMA_ENDPOINT ?? '';
    this.mlxEndpoint =
      config.mlxEndpoint ?? process.env.MLX_ENDPOINT ?? '';
    if (!this.ollamaEndpoint || !this.mlxEndpoint) {
      throw new Error('Ollama and MLX endpoints must be provided');
    }
    this.analysisHistory = new Map();
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    const validatedRequest = codeAnalysisRequestSchema.parse(request);
    const startTime = Date.now();

    const cacheKey = this.generateCacheKey(validatedRequest);
    const cached = this.analysisHistory.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine optimal model based on task characteristics
    const characteristics: TaskCharacteristics = {
      complexity: this.assessComplexity(validatedRequest.code),
      latency: validatedRequest.urgency === 'high' ? 'fast' : 'batch',
      accuracy: validatedRequest.analysisType === 'security' ? 'premium' : 'high',
      resource_constraint: 'moderate',
      modality: 'code',
    };

    const modelId = selectOptimalModel('agents', 'codeIntelligence', characteristics);

    try {
      // Route to appropriate model
      let result: CodeAnalysisResult;

      if (modelId.includes('qwen3-coder')) {
        result = await this.analyzeWithQwen3Coder(validatedRequest, modelId);
      } else if (modelId.includes('deepseek-coder')) {
        result = await this.analyzeWithDeepSeekCoder(validatedRequest, modelId);
      } else {
        throw new Error(`Unsupported model: ${modelId}`);
      }

      result.processingTime = Date.now() - startTime;
      result.modelUsed = modelId;

      // Cache result
      this.analysisHistory.set(cacheKey, result);

      this.emit('analysis_complete', { request: validatedRequest, result });
      return result;
    } catch (error) {
      this.emit('analysis_error', { request: validatedRequest, error });
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
    let raw: unknown;
    try {
      raw = JSON.parse(response);
    } catch {
      throw new Error('Model response is not valid JSON');
    }

    const parsed = rawAnalysisResultSchema.parse(raw);
    return { ...parsed, modelUsed: modelType, processingTime: 0 };
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
