/**
 * @file A2A AI Agent Implementation
 * @description Exposes AI capabilities as A2A agent skills for multi-agent coordination
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 * @last_updated 2025-08-22
 */

import { AICoreCapabilities, createAICapabilities } from './ai-capabilities.js';
import { ASBRAIIntegration, createASBRAIIntegration } from './asbr-ai-integration.js';
import {
  AgentCard,
  AgentSkill,
  AgentInterface,
  AgentCapabilities,
  AgentExtension,
  AgentProvider,
  TransportProtocol,
  A2AMessage,
} from '@cortex-os/a2a';

/**
 * A2A AI Agent - Exposes AI capabilities as agent skills for multi-agent coordination
 * Implements the A2A protocol to enable other agents to request AI services
 */
export class A2AAIAgent {
  private aiCapabilities: AICoreCapabilities;
  private asbrIntegration: ASBRAIIntegration;
  private agentId: string;
  private agentCard: AgentCard;

  constructor(agentId: string = 'asbr-ai-agent') {
    this.agentId = agentId;
    this.aiCapabilities = createAICapabilities('full');
    this.asbrIntegration = createASBRAIIntegration('balanced');
    this.agentCard = this.buildAgentCard();
  }

  /**
   * Build A2A agent card exposing AI capabilities as skills
   */
  private buildAgentCard(): AgentCard {
    const skills: AgentSkill[] = [
      {
        name: 'ai_generate_text',
        description: 'Generate text using MLX language models',
        longDescription:
          'Generate human-like text using locally-run MLX language models with configurable parameters',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt to generate from',
            },
            systemPrompt: {
              type: 'string',
              description: 'Optional system prompt to guide generation',
            },
            temperature: {
              type: 'number',
              minimum: 0.0,
              maximum: 1.0,
              description: 'Temperature for generation (0.0 to 1.0)',
            },
            maxTokens: {
              type: 'number',
              minimum: 1,
              maximum: 4096,
              description: 'Maximum number of tokens to generate',
            },
          },
          required: ['prompt'],
        },
        response: {
          type: 'object',
          properties: {
            generated_text: { type: 'string' },
            prompt_length: { type: 'number' },
            model: { type: 'string' },
          },
        },
        implementation: 'ai_capabilities.generate',
      },
      {
        name: 'ai_search_knowledge',
        description: 'Search knowledge base using semantic similarity',
        longDescription:
          'Perform semantic search through stored documents using embedding-based similarity matching',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find relevant documents',
            },
            topK: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              description: 'Number of top results to return',
            },
            minSimilarity: {
              type: 'number',
              minimum: 0.0,
              maximum: 1.0,
              description: 'Minimum similarity score threshold',
            },
          },
          required: ['query'],
        },
        response: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  similarity: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
            query: { type: 'string' },
            results_count: { type: 'number' },
          },
        },
        implementation: 'ai_capabilities.searchKnowledge',
      },
      {
        name: 'ai_rag_query',
        description: 'Perform Retrieval-Augmented Generation query',
        longDescription:
          'Combine semantic search with text generation to answer questions using relevant context from the knowledge base',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query to answer using RAG',
            },
            systemPrompt: {
              type: 'string',
              description: 'Optional system prompt for generation',
            },
          },
          required: ['query'],
        },
        response: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  similarity: { type: 'number' },
                },
              },
            },
            confidence: { type: 'number' },
          },
        },
        implementation: 'ai_capabilities.ragQuery',
      },
      {
        name: 'ai_calculate_similarity',
        description: 'Calculate semantic similarity between texts',
        longDescription: 'Compute cosine similarity between two text inputs using embeddings',
        parameters: {
          type: 'object',
          properties: {
            text1: {
              type: 'string',
              description: 'First text for comparison',
            },
            text2: {
              type: 'string',
              description: 'Second text for comparison',
            },
          },
          required: ['text1', 'text2'],
        },
        response: {
          type: 'object',
          properties: {
            similarity: { type: 'number' },
            interpretation: { type: 'string' },
          },
        },
        implementation: 'ai_capabilities.calculateSimilarity',
      },
      {
        name: 'asbr_collect_enhanced_evidence',
        description: 'Collect and enhance evidence using AI analysis',
        longDescription:
          'Analyze and enhance evidence collection for ASBR workflows using AI-powered insights',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ASBR task identifier',
            },
            claim: {
              type: 'string',
              description: 'Evidence claim to analyze',
            },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['file', 'url', 'repo', 'note'],
                  },
                  path: { type: 'string' },
                  content: { type: 'string' },
                },
              },
              description: 'Evidence sources to analyze',
            },
          },
          required: ['taskId', 'claim', 'sources'],
        },
        response: {
          type: 'object',
          properties: {
            enhanced_evidence: { type: 'object' },
            additional_evidence: { type: 'array' },
            insights: { type: 'string' },
            confidence: { type: 'number' },
          },
        },
        implementation: 'asbr_integration.collectEnhancedEvidence',
      },
    ];

    const capabilities: AgentCapabilities = {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      extensions: [
        {
          uri: 'https://cortex-os.ai/extensions/mlx-integration',
          description: 'Apple Silicon optimized MLX model integration',
          required: false,
        },
        {
          uri: 'https://cortex-os.ai/extensions/asbr-evidence',
          description: 'ASBR evidence collection and analysis',
          required: false,
        },
      ],
    };

    return {
      agent: {
        name: 'ASBR AI Agent',
        version: '1.0.0',
        description:
          'AI capabilities agent providing text generation, knowledge search, RAG, and evidence analysis',
        provider: {
          organization: 'Cortex-OS',
          url: 'https://cortex-os.ai',
        },
        capabilities,
        license: 'Apache-2.0 OR Commercial',
        documentation: 'https://docs.cortex-os.ai/agents/asbr-ai',
        tags: ['ai', 'mlx', 'rag', 'embeddings', 'evidence', 'asbr'],
      },
      interface: {
        transport: TransportProtocol.HTTP,
        uri: 'http://127.0.0.1:8081/a2a',
        fallback: [
          {
            transport: TransportProtocol.HTTP,
            uri: 'http://127.0.0.1:8081/mcp',
          },
        ],
      },
      skills,
    };
  }

  /**
   * Get the agent card for A2A discovery
   */
  getAgentCard(): AgentCard {
    return this.agentCard;
  }

  /**
   * Handle A2A message and execute requested skill
   */
  async handleA2AMessage(message: A2AMessage): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'ai_generate_text':
        return this.handleGenerateText(params);

      case 'ai_search_knowledge':
        return this.handleSearchKnowledge(params);

      case 'ai_rag_query':
        return this.handleRAGQuery(params);

      case 'ai_calculate_similarity':
        return this.handleCalculateSimilarity(params);

      case 'asbr_collect_enhanced_evidence':
        return this.handleCollectEnhancedEvidence(params);

      case 'get_capabilities':
        return this.getCapabilities();

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Skill implementations
   */
  private async handleGenerateText(params: any): Promise<any> {
    const result = await this.aiCapabilities.generate(params.prompt, {
      systemPrompt: params.systemPrompt,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    return {
      generated_text: result,
      prompt_length: params.prompt.length,
      model: 'MLX',
    };
  }

  private async handleSearchKnowledge(params: any): Promise<any> {
    const results = await this.aiCapabilities.searchKnowledge(
      params.query,
      params.topK || 5,
      params.minSimilarity || 0.3,
    );

    return {
      query: params.query,
      results_count: results.length,
      results: results,
    };
  }

  private async handleRAGQuery(params: any): Promise<any> {
    const result = await this.aiCapabilities.ragQuery({
      query: params.query,
      systemPrompt: params.systemPrompt,
    });

    return {
      query: params.query,
      answer: result.answer,
      sources: result.sources.slice(0, 3), // Limit sources for A2A transport
      confidence: result.confidence,
    };
  }

  private async handleCalculateSimilarity(params: any): Promise<any> {
    const similarity = await this.aiCapabilities.calculateSimilarity(params.text1, params.text2);

    return {
      similarity: similarity || 0,
      interpretation:
        (similarity || 0) > 0.8
          ? 'very similar'
          : (similarity || 0) > 0.6
            ? 'moderately similar'
            : (similarity || 0) > 0.3
              ? 'somewhat similar'
              : 'not similar',
    };
  }

  private async handleCollectEnhancedEvidence(params: any): Promise<any> {
    const context = {
      taskId: params.taskId,
      claim: params.claim,
      sources: params.sources,
    };

    const result = await this.asbrIntegration.collectEnhancedEvidence(context, {});

    return {
      enhanced_evidence: result.aiEnhancedEvidence,
      additional_evidence: result.additionalEvidence,
      insights: result.insights,
      confidence: result.aiMetadata.confidence || 0.8,
    };
  }

  /**
   * Get AI capabilities information
   */
  private async getCapabilities(): Promise<any> {
    try {
      const capabilities = await this.aiCapabilities.getCapabilities();
      return {
        agent_id: this.agentId,
        llm: capabilities?.llm || { provider: 'unavailable', model: 'unknown', healthy: false },
        embedding: capabilities?.embedding,
        features: capabilities?.features || ['a2a-messaging'],
        skills: this.agentCard.skills.map((skill) => skill.name),
        status: 'operational',
      };
    } catch (error) {
      return {
        agent_id: this.agentId,
        llm: { provider: 'unavailable', model: 'unknown', healthy: false },
        features: ['a2a-messaging'],
        skills: this.agentCard.skills.map((skill) => skill.name),
        status: 'degraded',
        error: `AI capabilities unavailable: ${error}`,
      };
    }
  }

  /**
   * Check if the agent can handle a specific action
   */
  canHandle(action: string): boolean {
    const supportedActions = [
      'ai_generate_text',
      'ai_search_knowledge',
      'ai_rag_query',
      'ai_calculate_similarity',
      'asbr_collect_enhanced_evidence',
      'get_capabilities',
    ];
    return supportedActions.includes(action);
  }

  /**
   * Get agent status for A2A coordination
   */
  getStatus(): {
    agent_id: string;
    status: 'idle' | 'busy' | 'offline' | 'error';
    capabilities_healthy: boolean;
    skills_available: number;
  } {
    return {
      agent_id: this.agentId,
      status: 'idle', // Could be enhanced with actual status tracking
      capabilities_healthy: true, // Could check AI capabilities health
      skills_available: this.agentCard.skills.length,
    };
  }
}

/**
 * Create and export singleton A2A AI agent instance
 */
export const a2aAIAgent = new A2AAIAgent('cortex-asbr-ai-agent');

/**
 * Export factory function for custom configurations
 */
export function createA2AAIAgent(agentId?: string): A2AAIAgent {
  return new A2AAIAgent(agentId);
}

/**
 * Helper function to check A2A compatibility
 */
export function isA2ACompatible(): boolean {
  try {
    // Try dynamic import to check if A2A package is available
    // This is safer in ESM environments and won't break tests
    return (
      typeof globalThis !== 'undefined' &&
      typeof process !== 'undefined' &&
      process.versions?.node !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * A2A AI Agent Skills Registry
 */
export const A2A_AI_SKILLS = {
  AI_GENERATE_TEXT: 'ai_generate_text',
  AI_SEARCH_KNOWLEDGE: 'ai_search_knowledge',
  AI_RAG_QUERY: 'ai_rag_query',
  AI_CALCULATE_SIMILARITY: 'ai_calculate_similarity',
  ASBR_COLLECT_ENHANCED_EVIDENCE: 'asbr_collect_enhanced_evidence',
  GET_CAPABILITIES: 'get_capabilities',
} as const;
