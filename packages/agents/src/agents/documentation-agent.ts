// Helper: Handle agent error and publish failed event
function handleAgentError(
  eventBus: EventBus,
  agentId: string,
  traceId: string,
  capability: string,
  error: unknown,
  executionTime: number,
) {
  let errorCode: string | number | undefined;
  let status: number | undefined;
  if (typeof error === 'object' && error !== null) {
    if (
      'code' in error &&
      typeof (error as { code?: unknown }).code !== 'undefined'
    ) {
      errorCode = (error as { code?: string | number }).code;
    }
    if (
      'status' in error &&
      typeof (error as { status?: unknown }).status === 'number'
    ) {
      status = (error as { status?: number }).status;
    }
  }
  publishEvent(eventBus, 'agent.failed', {
    agentId,
    traceId,
    capability,
    error: error instanceof Error ? error.message : 'Unknown error',
    errorCode,
    status,
    metrics: {
      latencyMs: executionTime,
    },
    timestamp: new Date().toISOString(),
  });
}

// Helper: Build agent result output
function buildAgentResult(
  result: DocumentationOutput,
  validatedInput: DocumentationInput,
): DocumentationOutput {
  return {
    sections: Array.isArray(result.sections) ? result.sections : [],
    format: result.format || validatedInput.outputFormat || 'markdown',
    language: result.language || validatedInput.language,
    documentationType:
      result.documentationType || validatedInput.documentationType,
    metadata: result.metadata || {},
    confidence: typeof result.confidence === 'number' ? result.confidence : 1,
    processingTime:
      typeof result.processingTime === 'number' ? result.processingTime : 0,
  };
}

import { randomUUID } from 'crypto';
/**
 * Documentation Agent
 *
 * Single-focused agent for generating comprehensive documentation from source code.
 * Supports multiple documentation types (API, README, tutorials), output formats,
 * and audience-specific content generation.
 */

import { z } from 'zod';
import type {
  Agent,
  EventBus,
  ExecutionContext,
  GenerateOptions,
  MCPClient,
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
export const documentationInputSchema = z.object({
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
  documentationType: z.enum([
    'api',
    'readme',
    'tutorial',
    'reference',
    'guide',
  ]),
  outputFormat: z.enum(['markdown', 'html', 'rst', 'docstring', 'jsdoc']),
  includeExamples: z.boolean().default(true),
  includeTypes: z.boolean().optional().default(true),
  audience: z
    .enum(['developer', 'end-user', 'technical-writer', 'beginner'])
    .optional()
    .default('developer'),
  style: z
    .enum(['formal', 'casual', 'tutorial', 'reference'])
    .optional()
    .default('formal'),
  detailLevel: z
    .enum(['minimal', 'standard', 'comprehensive'])
    .optional()
    .default('standard'),
  seed: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().max(4096).optional(),
});

export const documentationOutputSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      type: z.enum([
        'overview',
        'function',
        'class',
        'interface',
        'installation',
        'usage',
        'example',
        'reference',
      ]),
      content: z.string(),
      examples: z.array(z.string()).default([]),
      parameters: z.array(z.string()).default([]),
      returnType: z.string().nullable().optional(),
    }),
  ),
  format: z.string(),
  language: z.string(),
  documentationType: z.string(),
  metadata: z
    .object({
      generatedAt: z.string().optional(),
      wordCount: z.number().optional(),
      sectionsCount: z.number().optional(),
      hasExamples: z.boolean().optional(),
      hasTypes: z.boolean().optional(),
      complexity: z.enum(['low', 'medium', 'high']).optional(),
      hasAsyncOperations: z.boolean().optional(),
      hasErrorHandling: z.boolean().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().min(0),
});

export type DocumentationInput = z.infer<typeof documentationInputSchema>;
export type DocumentationOutput = z.infer<typeof documentationOutputSchema>;

export interface DocumentationAgentConfig {
  provider: ModelProvider;
  eventBus: EventBus;
  mcpClient: MCPClient;
  timeout?: number;
  maxRetries?: number;
  memoryPolicy?: import('../lib/types.js').MemoryPolicy;
}

/**
 * Creates a documentation agent instance
 */
// Helper: Normalize input
function normalizeInput(
  context: ExecutionContext<DocumentationInput> | DocumentationInput,
): DocumentationInput {
  if (typeof context === 'object' && context !== null && 'input' in context) {
    return context.input;
  }
  return context;
}

// Helper: Should publish lifecycle event
function shouldPublishLifecycle(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return true;
  if (!('_suppressLifecycle' in input)) return true;
  return !(input as { _suppressLifecycle?: unknown })._suppressLifecycle;
}

// Helper: Publish event (envelope matches EventBus contract)
function publishEvent(
  eventBus: EventBus,
  type: string,
  data: Record<string, unknown>,
) {
  const time = new Date().toISOString();
  eventBus.publish({
    id: randomUUID(),
    type,
    data,
    time,
    source: 'documentation-agent',
    specversion: '1.0',
    ttlMs: 300000,
    headers: {},
  });
}

export const createDocumentationAgent = (
  config: DocumentationAgentConfig,
): Agent<DocumentationInput, DocumentationOutput> => {
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
  const timeout = config.timeout || 45000; // Longer timeout for documentation

  return {
    id: agentId,
    name: 'documentation-agent',
    capability: 'documentation',
    inputSchema: documentationInputSchema,
    outputSchema: documentationOutputSchema,
    capabilities: [
      {
        name: 'documentation-generation',
        description: 'Generates comprehensive technical documentation for code',
      },
    ],

    execute: async (
      context: ExecutionContext<DocumentationInput> | DocumentationInput,
    ): Promise<DocumentationOutput> => {
      const input = normalizeInput(context);
      const traceId = generateTraceId();
      const startTime = Date.now();

      const validatedInput = validateSchema(documentationInputSchema, input);
      const inputWithDefaults = {
        ...validatedInput,
        includeExamples: validatedInput.includeExamples ?? true,
        includeTypes: validatedInput.includeTypes ?? true,
        detailLevel: validatedInput.detailLevel ?? 'comprehensive',
        audience: validatedInput.audience ?? 'developer',
        style: validatedInput.style ?? 'formal',
      };

      if (shouldPublishLifecycle(validatedInput)) {
        publishEvent(config.eventBus, 'agent.started', {
          agentId,
          traceId,
          capability: 'documentation',
          input: validatedInput,
          timestamp: new Date().toISOString(),
        });
      }

      let result: DocumentationOutput;
      let executionTime = 0;
      try {
        result = await withTimeout(
          generateDocumentation(inputWithDefaults, config),
          timeout,
        );
        executionTime = Math.max(1, Date.now() - startTime);
        if (shouldPublishLifecycle(validatedInput)) {
          publishEvent(config.eventBus, 'agent.completed', {
            agentId,
            traceId,
            capability: 'documentation',
            result,
            evidence: [],
            metrics: {
              latencyMs: executionTime,
              tokensUsed: estimateTokens(validatedInput.sourceCode),
              sectionsCount: result.sections.length,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error: unknown) {
        executionTime = Math.max(1, Date.now() - startTime);
        handleAgentError(
          config.eventBus,
          agentId,
          traceId,
          'documentation',
          error,
          executionTime,
        );
        throw error;
      }
      // Ensure required booleans are set for type safety
      const safeInput: DocumentationInput = {
        ...validatedInput,
        includeExamples: validatedInput.includeExamples ?? true,
        includeTypes: validatedInput.includeTypes ?? true,
        audience: validatedInput.audience ?? 'developer',
        style: validatedInput.style ?? 'formal',
        detailLevel: validatedInput.detailLevel ?? 'standard',
      };
      return buildAgentResult(result, safeInput);
    },
  };
};

/**
 * Core documentation generation logic
 */
const generateDocumentation = async (
  input: DocumentationInput,
  config: DocumentationAgentConfig,
): Promise<DocumentationOutput> => {
  const {
    sourceCode,
    language,
    documentationType,
    outputFormat,
    audience,
    style,
    detailLevel,
  } = input;

  // Build context-aware prompt
  const prompt = sanitizeText(buildDocumentationPrompt(input));

  // Generate options based on input
  const generateOptions: GenerateOptions = {
    temperature: 0.2, // Low temperature for consistent documentation
    maxTokens: Math.min(
      calculateMaxTokens(sourceCode, documentationType, detailLevel),
      input.maxTokens ?? 4096,
    ),
    stop: ['```\n\n', '---END---', '</doc>'],
    systemPrompt: sanitizeText(
      buildSystemPrompt(documentationType, outputFormat, audience, style),
    ),
    seed: input.seed,
  };

  // Call the model provider
  const providerResult = await config.provider.generate(
    prompt,
    generateOptions,
  );
  // Provider result variants observed in tests:
  // { text: string, latencyMs?: number, ... }
  // { content: string, latencyMs?: number, ... }
  // or direct string (unlikely but guard)
  let rawText = '';
  if (typeof providerResult === 'string') {
    rawText = providerResult;
  } else if (providerResult && typeof providerResult === 'object') {
    interface TextLike { text?: unknown; content?: unknown }
    const pr = providerResult as TextLike;
    if ('text' in providerResult && typeof pr.text === 'string') {
      rawText = pr.text;
    } else if ('content' in providerResult && typeof pr.content === 'string') {
      rawText = pr.content;
    }
  }
  const response = {
    text: rawText,
    latencyMs: (providerResult as { latencyMs?: number })?.latencyMs,
  };

  // Parse and structure the response
  const result = parseDocumentationResponse(
    response,
    outputFormat,
    language,
    documentationType,
  );

  // Validate output schema
  // @ts-expect-error - Type assertion for schema compatibility
  return validateSchema(documentationOutputSchema, result);
};

/**
 * Build context-aware prompt for documentation generation
 */
const buildDocumentationRequirements = (input: DocumentationInput): string => {
  const {
    documentationType,
    outputFormat,
    audience,
    style,
    detailLevel,
    includeExamples,
    includeTypes,
  } = input;

  return `Requirements:
- Documentation type: ${documentationType}
- Output format: ${outputFormat}
- Target audience: ${audience}
- Writing style: ${style}
- Detail level: ${detailLevel}
- Include examples: ${includeExamples}
- Include types: ${includeTypes}`;
};

const buildDocumentationStructure = (): string => `
Please provide comprehensive documentation with the following structure:
1. Clear section titles and organization
2. Detailed descriptions of functionality
3. Parameter documentation with types (if applicable)
4. Return value documentation
5. Usage examples (if requested)
6. Error handling information (if present in code)
7. Performance considerations (if relevant)`;

const buildResponseFormat = (): string => `
Format the response as JSON with the following structure:
{
  "sections": [
    {
      "title": "Section Title",
      "type": "function|class|overview|installation|usage|example|reference",
      "content": "Formatted documentation content",
      "examples": ["code examples"],
      "parameters": ["parameter descriptions"],
      "returnType": "return type or null"
    }
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:00Z",
    "wordCount": 150,
    "sectionsCount": 3,
    "hasExamples": true,
    "hasTypes": true,
    "complexity": "medium",
    "hasAsyncOperations": false,
    "hasErrorHandling": true
  },
  "confidence": 0.95,
  "processingTime": 2000
}`;

const buildDocumentationPrompt = (input: DocumentationInput): string => {
  const {
    sourceCode,
    language,
    documentationType,
    detailLevel,
    style,
    audience,
    outputFormat,
  } = input;
  const styleGuide = getStyleGuide(style, audience);
  const formatSpecs = getFormatSpecifications(outputFormat);
  const requirements = buildDocumentationRequirements(input);
  const structure = buildDocumentationStructure();
  const responseFormat = buildResponseFormat();

  return `Generate ${detailLevel} ${documentationType} documentation for the following ${language} code:

\`\`\`${language}
${sourceCode}
\`\`\`

${requirements}

${styleGuide}

${formatSpecs}

${structure}

${responseFormat}`;
};

/**
 * Build system prompt based on documentation requirements
 */
const buildSystemPrompt = (
  documentationType: string,
  outputFormat: string,
  audience: string,
  style: string,
): string => {
  return `You are an expert technical writer specializing in ${documentationType} documentation.

Your expertise includes:
1. Clear, ${style} writing style appropriate for ${audience}
2. Comprehensive ${outputFormat} formatting
3. Accurate technical documentation
4. Code analysis and explanation
5. Example generation and best practices
6. Cross-referencing and structure organization

Guidelines:
- Write for ${audience} with ${style} tone
- Use proper ${outputFormat} formatting and syntax
- Provide accurate, up-to-date information
- Include relevant examples and use cases
- Focus on clarity and usability
- Consider the reader's technical level and context
- Ensure all code examples are syntactically correct
- Use consistent terminology throughout

Your goal is to create documentation that helps users understand and effectively use the code.`;
};

/**
 * Get style guide based on style and audience
 */
const getStyleGuide = (style: string, audience: string): string => {
  const guides = {
    formal:
      'Use professional, precise language. Avoid colloquialisms. Structure content logically.',
    casual:
      'Use friendly, conversational tone. Include helpful tips and context.',
    tutorial:
      'Use step-by-step instructions. Include learning objectives and checkpoints.',
    reference:
      'Use concise, factual descriptions. Focus on completeness and accuracy.',
  };

  const audienceNotes = {
    developer:
      'Assume familiarity with programming concepts. Include technical details.',
    'end-user': 'Explain technical concepts clearly. Focus on practical usage.',
    'technical-writer':
      'Include documentation best practices and style considerations.',
    beginner:
      'Define technical terms. Provide additional context and explanations.',
  };

  return `Style Guide: ${guides[style as keyof typeof guides] || guides.formal}\nAudience: ${audienceNotes[audience as keyof typeof audienceNotes] || audienceNotes.developer}`;
};

/**
 * Get format-specific specifications
 */
const getFormatSpecifications = (format: string): string => {
  const specs = {
    markdown:
      'Use proper Markdown syntax: # for headers, **bold**, *italic*, `code`, ```blocks```',
    html: 'Use semantic HTML tags: <h1>, <p>, <code>, <pre>, <ul>, <ol>, <strong>, <em>',
    rst: 'Use reStructuredText syntax: ===== for headers, **bold**, *italic*, ``code``',
    docstring:
      'Follow language-specific docstring conventions (Python: """, Java: /** */)',
    jsdoc: 'Use JSDoc syntax: /** */, @param, @returns, @example, @throws',
  };

  return `Format Requirements: ${specs[format as keyof typeof specs] || specs.markdown}`;
};

/**
 * Calculate appropriate max tokens based on complexity
 */
const calculateMaxTokens = (
  sourceCode: string,
  documentationType: string,
  detailLevel: string,
): number => {
  const baseTokens = Math.max(2000, sourceCode.length * 3);

  const typeMultipliers = {
    api: 1.5,
    readme: 2.0,
    tutorial: 2.5,
    reference: 1.2,
    guide: 2.0,
  };

  const detailMultipliers = {
    minimal: 0.7,
    standard: 1.0,
    comprehensive: 1.8,
  };

  const typeMultiplier =
    typeMultipliers[documentationType as keyof typeof typeMultipliers] || 1.0;
  const detailMultiplier =
    detailMultipliers[detailLevel as keyof typeof detailMultipliers] || 1.0;

  return Math.min(
    12000,
    Math.floor(baseTokens * typeMultiplier * detailMultiplier),
  );
};

/**
 * Parse documentation response from the model
 */
const parseDocumentationResponse = (
  response: { text: string; latencyMs?: number },
  format: string,
  language: string,
  documentationType: string,
): DocumentationOutput => {
  type ParsedSection = {
    title?: unknown;
    type?: unknown;
    content?: unknown;
    examples?: unknown[];
    parameters?: unknown[];
    returnType?: unknown;
  };
  type ParsedDocResponse = {
    sections?: ParsedSection[];
    metadata?: Record<string, unknown>;
    confidence?: number;
    processingTime?: number;
  };
  let parsedResponse: ParsedDocResponse;

  try {
    // Try to parse JSON from response text using a balanced-brace streaming parser
    function extractFirstJSONObject(text: string): string | null {
      let start = -1;
      let depth = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (text[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            return text.slice(start, i + 1);
          }
        }
      }
      return null;
    }
    const jsonString = extractFirstJSONObject(response.text);
    if (jsonString) {
      parsedResponse = JSON.parse(jsonString) as ParsedDocResponse;
    } else {
      throw new Error('No JSON found in response');
    }
  } catch {
    // Fallback: create structured response from raw text, include parse error
    const fallback = createFallbackDocumentationResponse(
      response.text,
      format,
      language,
      documentationType,
    );
    fallback.metadata = {
      ...(fallback.metadata || {}),
    };
    parsedResponse = fallback;
  }

  // Ensure all required fields are present
  const sections = (
    parsedResponse.sections ||
    generateDefaultSections(format, language, documentationType)
  ).map((s: ParsedSection) => {
    const title = typeof s.title === 'string' ? s.title : String(s.title ?? '');
    const type = (
      typeof s.type === 'string' ? s.type : String(s.type ?? 'overview')
    ) as
      | 'function'
      | 'reference'
      | 'overview'
      | 'class'
      | 'interface'
      | 'installation'
      | 'usage'
      | 'example';
    const content =
      typeof s.content === 'string' ? s.content : String(s.content ?? '');
    const examples = Array.isArray(s.examples) ? s.examples.map(String) : [];
    const parameters = Array.isArray(s.parameters)
      ? s.parameters.map(String)
      : [];
    let returnType: string | null | undefined;
    if (typeof s.returnType === 'string') {
      returnType = s.returnType;
    } else if (s.returnType === null) {
      returnType = null;
    } else {
      returnType = undefined;
    }
    return { title, type, content, examples, parameters, returnType };
  });

  return {
    sections,
    format,
    language,
    documentationType,
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount: countWords(sections[0]?.content || ''),
      sectionsCount: sections.length || 1,
      hasExamples: sections.some((s) => s.examples.length > 0),
      hasTypes: sections.some(
        (s) => s.returnType != null || s.parameters.length > 0,
      ),
      ...parsedResponse.metadata,
    },
    confidence: parsedResponse.confidence || 0.85,
    processingTime: parsedResponse.processingTime || response.latencyMs || 2000,
  };
};

/**
 * Create fallback response when JSON parsing fails
 */
const createFallbackDocumentationResponse = (
  text: string,
  format: string,
  language: string,
  documentationType: string,
): DocumentationOutput => {
  return {
    sections: [
      {
        title: `${documentationType} Documentation`,
        type: 'overview' as const,
        content: formatContent(text, format),
        examples: [],
        parameters: [],
        returnType: null,
      },
    ],
    format,
    language,
    documentationType,
    confidence: 0.6,
    processingTime: 1000,
  };
};

/**
 * Generate default sections when response parsing fails
 */
const generateDefaultSections = (
  format: string,
  language: string,
  documentationType: string,
) => [
    {
      title: `${language} ${documentationType}`,
      type: 'overview' as const,
      content: formatContent(
        `Generated ${documentationType} documentation for ${language} code.`,
        format,
      ),
      examples: [],
      parameters: [],
      returnType: null,
    },
  ];

/**
 * Format content based on output format
 */
const formatContent = (text: string, format: string): string => {
  switch (format) {
    case 'markdown':
      return `# Documentation\n\n${text}`;
    case 'html':
      return `<h1>Documentation</h1>\n<p>${text}</p>`;
    case 'rst':
      return `Documentation\n=============\n\n${text}`;
    case 'jsdoc':
      return `/**\n * ${text.replace(/\n/g, '\n * ')}\n */`;
    case 'docstring':
      return `"""\n${text}\n"""`;
    default:
      return text;
  }
};

/**
 * Count words in text content
 */
const countWords = (text: string): number => {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};
