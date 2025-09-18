/**
 * LangGraphJS Nodes for Cortex-OS Agent Workflows
 *
 * Reusable node implementations following Cortex-OS patterns
 */

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { type CortexState } from '../CortexAgentLangGraph';

// Input validation schemas
export const NodeInputSchema = z.object({
  messages: z.array(z.any()),
  context: z.record(z.unknown()).optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).optional(),
});

export type NodeInput = z.infer<typeof NodeInputSchema>;

/**
 * Security Validation Node
 * Validates input for security threats and PII
 */
export const securityValidationNode = async (
  state: CortexState,
  config?: RunnableConfig
): Promise<Partial<CortexState>> => {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content || '';

  // Security checks
  const securityChecks = {
    promptInjection: detectPromptInjection(content),
    piiDetection: detectPII(content),
    maliciousContent: detectMaliciousContent(content),
    rateLimit: await checkRateLimit(config?.configurable?.userId),
  };

  const securityPassed = Object.values(securityChecks).every(check => check.passed);

  return {
    currentStep: 'input_processing',
    securityCheck: {
      passed: securityPassed,
      risk: securityPassed ? 'low' : 'high',
      details: securityChecks,
    },
    ...(securityPassed ? {} : { error: 'Security validation failed' }),
  };
};

/**
 * Intelligence Analysis Node
 * Analyzes user intent and determines required capabilities
 */
export const intelligenceAnalysisNode = async (
  state: CortexState
): Promise<Partial<CortexState>> => {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content || '';

  // Intent analysis
  const intent = analyzeIntent(content);

  // Capability requirements
  const requiredCapabilities = determineCapabilities(intent, content);

  // Tool selection
  const selectedTools = selectTools(requiredCapabilities, state.tools || []);

  return {
    currentStep: 'tool_execution',
    context: {
      ...state.context,
      intent,
      requiredCapabilities,
      selectedTools,
    },
  };
};

/**
 * Tool Execution Node
 * Orchestrates parallel tool execution
 */
export const toolExecutionNode = async (
  state: CortexState
): Promise<Partial<CortexState>> => {
  const { context } = state;
  const selectedTools = context?.selectedTools || [];
  const lastMessage = state.messages[state.messages.length - 1];
  const input = lastMessage?.content || '';

  // Execute tools in parallel
  const toolResults = await Promise.allSettled(
    selectedTools.map(async (toolName: string) => {
      return executeTool(toolName, {
        input,
        context: state.context,
        messages: state.messages,
      });
    })
  );

  // Process results
  const results = toolResults.map((result, index) => {
    const toolName = selectedTools[index];
    if (result.status === 'fulfilled') {
      return {
        tool: toolName,
        result: result.value,
        status: 'success',
      };
    } else {
      return {
        tool: toolName,
        error: result.reason,
        status: 'error',
      };
    }
  });

  // Create tool messages
  const toolMessages = results.map(result =>
    new ToolMessage({
      content: JSON.stringify(result),
      tool_call_id: `tool_${result.tool}`,
    })
  );

  return {
    currentStep: 'response_synthesis',
    context: {
      ...state.context,
      toolResults: results,
    },
    messages: [...state.messages, ...toolMessages],
  };
};

/**
 * Response Synthesis Node
 * Synthesizes final response from tool results and context
 */
export const responseSynthesisNode = async (
  state: CortexState
): Promise<Partial<CortexState>> => {
  const { context, messages } = state;
  const toolResults = context?.toolResults || [];
  const lastHumanMessage = messages.find(m => m instanceof HumanMessage);

  // Synthesize response
  const responseContent = await synthesizeResponse({
    input: lastHumanMessage?.content || '',
    toolResults,
    context: state.context || {},
  });

  return {
    currentStep: 'memory_update',
    messages: [...state.messages, new AIMessage({ content: responseContent })],
  };
};

/**
 * Memory Update Node
 * Updates agent memory with interaction details
 */
export const memoryUpdateNode = async (
  state: CortexState
): Promise<Partial<CortexState>> => {
  const interaction = {
    id: generateInteractionId(),
    timestamp: new Date().toISOString(),
    input: state.messages[0]?.content,
    output: state.messages[state.messages.length - 1]?.content,
    toolsUsed: state.context?.selectedTools || [],
    context: state.context,
    security: state.securityCheck,
  };

  // Store in memory system
  await storeInteraction(interaction);

  return {
    currentStep: 'completion',
    memory: [...(state.memory || []), interaction],
  };
};

/**
 * Error Handling Node
 * Centralized error handling and recovery
 */
export const errorHandlingNode = async (
  state: CortexState
): Promise<Partial<CortexState>> => {
  const error = state.error || 'Unknown error occurred';

  // Log error
  console.error('Agent execution error:', error);

  // Determine error type and appropriate response
  const errorResponse = generateErrorResponse(error);

  return {
    currentStep: 'completion',
    messages: [...state.messages, new AIMessage({ content: errorResponse })],
    error,
  };
};

// Helper functions

function detectPromptInjection(content: string): { passed: boolean; score: number } {
  const patterns = [
    /ignore.*previous/i,
    /bypass.*security/i,
    /system.*prompt/i,
    /admin.*override/i,
  ];

  const matches = patterns.reduce((score, pattern) => {
    return pattern.test(content) ? score + 1 : score;
  }, 0);

  return {
    passed: matches === 0,
    score: matches,
  };
}

function detectPII(content: string): { passed: boolean; detected: string[] } {
  const piiPatterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  };

  const detected: string[] = [];

  for (const [type, pattern] of Object.entries(piiPatterns)) {
    const matches = content.match(pattern);
    if (matches) {
      detected.push(...matches.map(m => `${type}: ${m}`));
    }
  }

  return {
    passed: detected.length === 0,
    detected,
  };
}

function detectMaliciousContent(content: string): { passed: boolean; threats: string[] } {
  const threats = ['sql injection', 'xss', 'command injection', 'directory traversal'];
  const detected = threats.filter(threat =>
    content.toLowerCase().includes(threat)
  );

  return {
    passed: detected.length === 0,
    threats: detected,
  };
}

async function checkRateLimit(userId?: string): Promise<{ passed: boolean; remaining: number }> {
  // Implement rate limiting logic
  return {
    passed: true,
    remaining: 100,
  };
}

function analyzeIntent(content: string): {
  primary: string;
  secondary: string[];
  confidence: number;
} {
  // Implement intent analysis
  const intents = {
    code_analysis: ['analyze', 'review', 'debug', 'quality'],
    test_generation: ['test', 'spec', 'unit test', 'coverage'],
    documentation: ['document', 'readme', 'docs', 'explain'],
    security: ['security', 'vulnerability', 'scan', 'audit'],
    general: ['help', 'how to', 'what is'],
  };

  let bestMatch = 'general';
  let maxScore = 0;
  const secondary: string[] = [];

  for (const [intent, keywords] of Object.entries(intents)) {
    const score = keywords.reduce((sum, keyword) => {
      return sum + (content.toLowerCase().includes(keyword) ? 1 : 0);
    }, 0);

    if (score > maxScore) {
      if (bestMatch !== 'general') {
        secondary.push(bestMatch);
      }
      bestMatch = intent;
      maxScore = score;
    } else if (score > 0) {
      secondary.push(intent);
    }
  }

  return {
    primary: bestMatch,
    secondary,
    confidence: Math.min(maxScore / 3, 1),
  };
}

function determineCapabilities(intent: any, content: string): string[] {
  const capabilityMap: Record<string, string[]> = {
    code_analysis: ['code-parser', 'linter', 'security-scanner'],
    test_generation: ['test-generator', 'coverage-analyzer'],
    documentation: ['doc-generator', 'markdown-formatter'],
    security: ['security-scanner', 'vulnerability-db'],
    general: ['web-search', 'calculator'],
  };

  return capabilityMap[intent.primary] || capabilityMap.general;
}

function selectTools(capabilities: string[], availableTools: any[]): string[] {
  return availableTools
    .filter(tool => capabilities.some(cap => tool.name.includes(cap)))
    .map(tool => tool.name);
}

async function executeTool(toolName: string, params: any): Promise<any> {
  // Implement tool execution via MCP
  console.log(`Executing tool: ${toolName}`, params);

  // Mock response for now
  if (toolName.includes('failing')) {
    throw new Error(`Tool ${toolName} failed`);
  }

  return {
    success: true,
    result: `Tool ${toolName} executed successfully`,
    timestamp: new Date().toISOString(),
  };
}

async function synthesizeResponse(params: {
  input: string;
  toolResults: any[];
  context: any;
}): Promise<string> {
  const { input, toolResults, context } = params;

  // Build response based on tool results
  let response = `I've processed your request: "${input}"\n\n`;

  for (const result of toolResults) {
    if (result.status === 'success') {
      response += `✓ ${result.tool}: ${JSON.stringify(result.result)}\n`;
    } else {
      response += `✗ ${result.tool}: Error - ${result.error}\n`;
    }
  }

  return response;
}

function generateInteractionId(): string {
  return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function storeInteraction(interaction: any): Promise<void> {
  // Store in memory system
  console.log('Storing interaction:', interaction);
}

function generateErrorResponse(error: string): string {
  return `I apologize, but I encountered an error while processing your request: ${error}

Please try:
1. Rephrasing your request
2. Providing more specific details
3. Breaking down complex requests into smaller parts

If the issue persists, please contact support.`;
}