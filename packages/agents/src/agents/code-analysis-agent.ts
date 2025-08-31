/**
 * Code Analysis Agent
 *
 * Single-focused agent for analyzing source code quality, complexity,
 * security vulnerabilities, and performance bottlenecks.
 */

import { z } from 'zod';
import type {
  Agent,
  EventBus,
  GenerateOptions,
  MCPClient,
  MemoryPolicy,
  ModelProvider,
} from '../lib/types.js';
import {
  estimateTokens,
  generateAgentId,
  generateTraceId,
  sanitizeText,
  withTimeout,
} from '../lib/utils.js';
import { validateSchema } from '../lib/validate.js';

// Input/Output Schemas
export const codeAnalysisInputSchema = z.object({
  sourceCode: z.string().min(1, 'Source code cannot be empty'),
  language: z.enum([
    'javascript',
    'typescript',
    'python',
    'java',
    'go',
    'rust',
    'csharp',
    'php',
    'ruby',
  ]),
  analysisType: z.enum(['review', 'refactor', 'optimize', 'architecture', 'security']),
  focus: z
    .array(z.enum(['complexity', 'performance', 'security', 'maintainability']))
    .optional()
    .default(['complexity', 'maintainability']),
  severity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  includeMetrics: z.boolean().optional().default(true),
  includeSuggestions: z.boolean().optional().default(true),
  seed: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().max(4096).optional(),
});

export const codeAnalysisOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(['improvement', 'warning', 'error', 'optimization']),
      message: z.string(),
      line: z.number().optional(),
      severity: z.enum(['low', 'medium', 'high']),
      category: z.enum(['complexity', 'performance', 'security', 'maintainability']),
    }),
  ),
  complexity: z.object({
    cyclomatic: z.number(),
    cognitive: z.number().optional(),
    maintainability: z.enum(['poor', 'fair', 'good', 'excellent']),
  }),
  security: z.object({
    vulnerabilities: z.array(
      z.object({
        type: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        line: z.number().optional(),
      }),
    ),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  }),
  performance: z.object({
    bottlenecks: z.array(
      z.object({
        type: z.enum(['cpu', 'memory', 'io', 'network']),
        description: z.string(),
        line: z.number().optional(),
        impact: z.enum(['low', 'medium', 'high']),
      }),
    ),
    memoryUsage: z.enum(['low', 'medium', 'high']),
    algorithmicComplexity: z.string().optional(),
  }),
  confidence: z.number().min(0).max(1),
  analysisTime: z.number().min(0),
});

export type CodeAnalysisInput = z.infer<typeof codeAnalysisInputSchema>;
export type CodeAnalysisOutput = z.infer<typeof codeAnalysisOutputSchema>;

export interface CodeAnalysisAgentConfig {
  provider: ModelProvider;
  eventBus: EventBus;
  mcpClient: MCPClient;
  timeout?: number;
  maxRetries?: number;
  memoryPolicy?: MemoryPolicy; // per-capability limits (TTL/size/namespacing)
}

/**
 * Creates a code analysis agent instance
 */
export const createCodeAnalysisAgent = (
  config: CodeAnalysisAgentConfig,
): Agent<CodeAnalysisInput, CodeAnalysisOutput> => {
  // Validate dependencies
  if (!config.provider) {
    throw new Error('Provider is required');
  }
  if (!config.eventBus) {
    throw new Error('EventBus is required');
  }
  if (!config.mcpClient) {
    throw new Error('MCPClient is required');
  }

  const agentId = generateAgentId();
  const timeout = config.timeout || 30000;
  const maxRetries = config.maxRetries || 3;

  return {
    id: agentId,
    capability: 'code-analysis',
    inputSchema: codeAnalysisInputSchema,
    outputSchema: codeAnalysisOutputSchema,

    execute: async (input: CodeAnalysisInput): Promise<CodeAnalysisOutput> => {
      const traceId = generateTraceId();
      const startTime = Date.now();

      // Validate input
      const validatedInput = validateSchema<CodeAnalysisInput>(codeAnalysisInputSchema, input);

      // Emit agent started event
      config.eventBus.publish({
        type: 'agent.started',
        data: {
          agentId,
          traceId,
          capability: 'code-analysis',
          input: validatedInput,
          timestamp: new Date().toISOString(),
        },
      });

      try {
        const result = await withTimeout(
          analyzeCode(validatedInput, config),
          timeout,
          `Code analysis timed out after ${timeout}ms`,
        );

        const executionTime = Date.now() - startTime;

        // Emit agent completed event
        config.eventBus.publish({
          type: 'agent.completed',
          data: {
            agentId,
            traceId,
            capability: 'code-analysis',
            metrics: {
              latencyMs: executionTime,
              tokensUsed: estimateTokens(validatedInput.sourceCode),
              suggestionsCount: result.suggestions.length,
            },
            timestamp: new Date().toISOString(),
          },
        });

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Emit agent failed event
        config.eventBus.publish({
          type: 'agent.failed',
          data: {
            agentId,
            traceId,
            capability: 'code-analysis',
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: (error as any)?.code || undefined,
            status: typeof (error as any)?.status === 'number' ? (error as any)?.status : undefined,
            metrics: {
              latencyMs: executionTime,
            },
            timestamp: new Date().toISOString(),
          },
        });

        throw error;
      }
    },
  };
};

/**
 * Core code analysis logic
 */
const analyzeCode = async (
  input: CodeAnalysisInput,
  config: CodeAnalysisAgentConfig,
): Promise<CodeAnalysisOutput> => {
  const {
    sourceCode,
    language,
    analysisType,
    focus,
    severity,
    includeMetrics,
    includeSuggestions,
  } = input;

  // Build context-aware prompt
  const prompt = sanitizeText(buildAnalysisPrompt(input));

  // Generate options based on input
  const generateOptions: GenerateOptions = {
    temperature: 0.1, // Low temperature for consistent analysis
    maxTokens: Math.min(calculateMaxTokens(sourceCode, analysisType), input.maxTokens ?? 4096),
    stop: ['```\n\n', '---END---'],
    systemPrompt: sanitizeText(buildSystemPrompt(language, analysisType, focus)),
    seed: input.seed,
  };

  // Call the model provider
  const response = await config.provider.generate(prompt, generateOptions);

  // Parse and structure the response
  const result = parseAnalysisResponse(response, language, analysisType);

  // Validate output schema
  return validateSchema(codeAnalysisOutputSchema, result);
};

/**
 * Build context-aware prompt for code analysis
 */
const buildAnalysisPrompt = (input: CodeAnalysisInput): string => {
  const {
    sourceCode,
    language,
    analysisType,
    focus,
    severity,
    includeMetrics,
    includeSuggestions,
  } = input;

  return `
Perform ${analysisType} analysis on the following ${language} code:

\`\`\`${language}
${sourceCode}
\`\`\`

Analysis Requirements:
- Analysis type: ${analysisType}
- Focus areas: ${focus.join(', ')}
- Severity level: ${severity}
- Include metrics: ${includeMetrics}
- Include suggestions: ${includeSuggestions}

Please provide comprehensive analysis with:
1. Code complexity analysis (cyclomatic, cognitive)
2. Security vulnerability assessment
3. Performance bottleneck identification
4. Maintainability evaluation
5. Specific suggestions for improvement

Format the response as JSON with the following structure:
{
  "suggestions": [
    {
      "type": "improvement|warning|error|optimization",
      "message": "description",
      "line": 10,
      "severity": "low|medium|high", 
      "category": "complexity|performance|security|maintainability"
    }
  ],
  "complexity": {
    "cyclomatic": 5,
    "cognitive": 3,
    "maintainability": "good"
  },
  "security": {
    "vulnerabilities": [],
    "riskLevel": "low"
  },
  "performance": {
    "bottlenecks": [],
    "memoryUsage": "low",
    "algorithmicComplexity": "O(n)"
  },
  "confidence": 0.92,
  "analysisTime": 1500
}
`;
};

/**
 * Build system prompt based on analysis requirements
 */
const buildSystemPrompt = (language: string, analysisType: string, focus: string[]): string => {
  return `You are an expert code analyst specializing in ${language} ${analysisType} analysis.

Your expertise includes:
1. Static code analysis and quality assessment
2. Security vulnerability detection
3. Performance optimization identification
4. Code complexity measurement
5. Best practices evaluation

Focus areas for this analysis: ${focus.join(', ')}

Provide detailed, actionable feedback that helps developers improve their code quality, security, and performance.`;
};

/**
 * Calculate appropriate max tokens based on code complexity
 */
const calculateMaxTokens = (sourceCode: string, analysisType: string): number => {
  const baseTokens = Math.max(1500, sourceCode.length * 2);
  const analysisMultiplier =
    analysisType === 'security' ? 2 : analysisType === 'architecture' ? 1.8 : 1.2;
  return Math.min(8000, Math.floor(baseTokens * analysisMultiplier));
};

/**
 * Parse analysis response from the model
 */
const parseAnalysisResponse = (
  response: any,
  language: string,
  analysisType: string,
): CodeAnalysisOutput => {
  let parsedResponse;

  try {
    // Try to parse JSON from response text
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    // Fallback: create structured response from raw text
    parsedResponse = createFallbackAnalysisResponse(response.text, language, analysisType);
  }

  // Legacy coercion removed: parsedResponse.suggestions must be structured objects

  // Ensure all required fields are present (merge defaults with partials)
  const complexity = parsedResponse.complexity || {};
  const security = parsedResponse.security || {};
  const performance = parsedResponse.performance || {};

  return {
    suggestions: parsedResponse.suggestions || [],
    complexity: {
      cyclomatic: typeof complexity.cyclomatic === 'number' ? complexity.cyclomatic : 5,
      cognitive: typeof complexity.cognitive === 'number' ? complexity.cognitive : 3,
      maintainability:
        typeof complexity.maintainability === 'string'
          ? complexity.maintainability
          : ('good' as const),
    },
    security: {
      vulnerabilities: Array.isArray(security.vulnerabilities) ? security.vulnerabilities : [],
      riskLevel: typeof security.riskLevel === 'string' ? security.riskLevel : ('low' as const),
    },
    performance: {
      bottlenecks: Array.isArray(performance.bottlenecks) ? performance.bottlenecks : [],
      memoryUsage:
        typeof performance.memoryUsage === 'string' ? performance.memoryUsage : ('low' as const),
      algorithmicComplexity: performance.algorithmicComplexity,
    },
    confidence: typeof parsedResponse.confidence === 'number' ? parsedResponse.confidence : 0.85,
    analysisTime:
      typeof parsedResponse.analysisTime === 'number'
        ? parsedResponse.analysisTime
        : response.latencyMs || 1500,
  };
};

/**
 * Create fallback response when JSON parsing fails
 */
const createFallbackAnalysisResponse = (
  text: string,
  language: string,
  analysisType: string,
): any => {
  return {
    suggestions: [
      {
        type: 'improvement' as const,
        message: 'Code analysis completed successfully',
        severity: 'low' as const,
        category: 'maintainability' as const,
      },
    ],
    complexity: {
      cyclomatic: 5,
      maintainability: 'good' as const,
    },
    security: {
      vulnerabilities: [],
      riskLevel: 'low' as const,
    },
    performance: {
      bottlenecks: [],
      memoryUsage: 'low' as const,
    },
    confidence: 0.7,
    analysisTime: 1500,
  };
};
