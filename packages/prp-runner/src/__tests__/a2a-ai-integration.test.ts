/**
 * @file A2A AI Integration Tests
 * @description Comprehensive test suite for A2A protocol compatibility with AI capabilities
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock(
  '@cortex-os/a2a',
  () => ({
    TransportProtocol: { HTTP: 'HTTP' },
  }),
  { virtual: true },
);

import { A2AAIAgent, a2aAIAgent, createA2AAIAgent, A2A_AI_SKILLS } from '../a2a-ai-agent.js';

// Mock A2A types since package might not be available in test environment
const mockA2AMessage = {
  sender_id: 'test-agent-1',
  receiver_id: 'cortex-asbr-ai-agent',
  action: 'ai_generate_text',
  params: { prompt: 'Hello, world!' },
  message_id: 'msg_123456',
  timestamp: '2025-08-22T01:00:00Z',
  metadata: { protocol_version: '1.0.0' },
};

// Mock AI capabilities to avoid external dependencies in tests
vi.mock('../ai-capabilities.js', () => ({
  createAICapabilities: vi.fn(() => ({
    generate: vi.fn().mockResolvedValue('Generated text response'),
    searchKnowledge: vi.fn().mockResolvedValue([
      { text: 'Knowledge result 1', similarity: 0.9, metadata: {} },
      { text: 'Knowledge result 2', similarity: 0.7, metadata: {} },
    ]),
    ragQuery: vi.fn().mockResolvedValue({
      answer: 'RAG generated answer',
      sources: [
        { text: 'Source 1', similarity: 0.8 },
        { text: 'Source 2', similarity: 0.6 },
      ],
      confidence: 0.85,
    }),
    calculateSimilarity: vi.fn().mockResolvedValue(0.75),
    getCapabilities: vi.fn().mockResolvedValue({
      llm: { provider: 'mlx', model: 'qwen', healthy: true },
      embedding: { provider: 'sentence-transformers', dimensions: 1024, documents: 10 },
      features: ['text-generation', 'embeddings', 'rag'],
    }),
  })),
}));

vi.mock('../asbr-ai-integration.js', () => ({
  createASBRAIIntegration: vi.fn(() => ({
    collectEnhancedEvidence: vi.fn().mockResolvedValue({
      aiEnhancedEvidence: { id: 'evidence_123', enhanced: true },
      additionalEvidence: [{ id: 'additional_1', type: 'supporting' }],
      insights: 'AI-generated insights about the evidence',
      aiMetadata: { confidence: 0.9, processingTime: 150 },
    }),
  })),
}));

describe('🤖 A2A AI Agent Integration Tests', () => {
  let agent: A2AAIAgent;

  beforeEach(() => {
    agent = createA2AAIAgent('test-ai-agent');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🏗️ Agent Construction and Setup', () => {
    it('should create A2A AI agent with valid configuration', () => {
      expect(agent).toBeInstanceOf(A2AAIAgent);
      expect(agent.getStatus().agent_id).toBe('test-ai-agent');
      expect(agent.getStatus().skills_available).toBeGreaterThan(0);
    });

    it('should export singleton agent instance', () => {
      expect(a2aAIAgent).toBeInstanceOf(A2AAIAgent);
      expect(a2aAIAgent.getStatus().agent_id).toBe('cortex-asbr-ai-agent');
    });

    it('should initialize without compatibility checks', () => {
      expect(() => createA2AAIAgent('nocheck-agent')).not.toThrow();
    });

    it('should create agent card with valid A2A structure', () => {
      const agentCard = agent.getAgentCard();

      // Validate agent metadata
      expect(agentCard.agent).toHaveProperty('name');
      expect(agentCard.agent).toHaveProperty('version');
      expect(agentCard.agent).toHaveProperty('description');
      expect(agentCard.agent.provider).toHaveProperty('organization');
      expect(agentCard.agent.provider).toHaveProperty('url');

      // Validate interface
      expect(agentCard.interface).toHaveProperty('transport');
      expect(agentCard.interface).toHaveProperty('uri');
      expect(agentCard.interface.uri).toBe('http://127.0.0.1:8081/a2a');
      expect(agentCard.interface.fallback).toBeUndefined();

      // Validate skills
      expect(agentCard.skills).toBeInstanceOf(Array);
      expect(agentCard.skills.length).toBeGreaterThan(0);

      // Check each skill has required properties
      agentCard.skills.forEach((skill) => {
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('description');
        expect(skill).toHaveProperty('parameters');
        expect(skill).toHaveProperty('response');
        expect(skill).toHaveProperty('implementation');
      });
    });

    it('should include all expected AI skills in agent card', () => {
      const agentCard = agent.getAgentCard();
      const skillNames = agentCard.skills.map((skill) => skill.name);

      expect(skillNames).toContain('ai_generate_text');
      expect(skillNames).toContain('ai_search_knowledge');
      expect(skillNames).toContain('ai_rag_query');
      expect(skillNames).toContain('ai_calculate_similarity');
      expect(skillNames).toContain('asbr_collect_enhanced_evidence');
    });

    it('should validate A2A skills constants', () => {
      expect(A2A_AI_SKILLS.AI_GENERATE_TEXT).toBe('ai_generate_text');
      expect(A2A_AI_SKILLS.AI_SEARCH_KNOWLEDGE).toBe('ai_search_knowledge');
      expect(A2A_AI_SKILLS.AI_RAG_QUERY).toBe('ai_rag_query');
      expect(A2A_AI_SKILLS.AI_CALCULATE_SIMILARITY).toBe('ai_calculate_similarity');
      expect(A2A_AI_SKILLS.ASBR_COLLECT_ENHANCED_EVIDENCE).toBe('asbr_collect_enhanced_evidence');
      expect(A2A_AI_SKILLS.GET_CAPABILITIES).toBe('get_capabilities');
    });
  });

  describe('🎯 A2A Message Handling', () => {
    it('should handle ai_generate_text A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'ai_generate_text',
        params: {
          prompt: 'Generate a greeting',
          temperature: 0.7,
          maxTokens: 100,
        },
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('generated_text');
      expect(result).toHaveProperty('prompt_length');
      expect(result).toHaveProperty('model');
      expect(result.generated_text).toBe('Generated text response');
      expect(result.model).toBe('MLX');
    });

    it('should handle ai_search_knowledge A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'ai_search_knowledge',
        params: {
          query: 'machine learning',
          topK: 5,
          minSimilarity: 0.3,
        },
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('results_count');
      expect(result).toHaveProperty('results');
      expect(result.query).toBe('machine learning');
      expect(result.results_count).toBe(2);
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle ai_rag_query A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'ai_rag_query',
        params: {
          query: 'What is artificial intelligence?',
          systemPrompt: 'You are a helpful AI assistant',
        },
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('confidence');
      expect(result.answer).toBe('RAG generated answer');
      expect(result.confidence).toBe(0.85);
    });

    it('should handle ai_calculate_similarity A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'ai_calculate_similarity',
        params: {
          text1: 'Machine learning is a subset of AI',
          text2: 'AI includes machine learning',
        },
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('similarity');
      expect(result).toHaveProperty('interpretation');
      expect(result.similarity).toBe(0.75);
      expect(result.interpretation).toBe('moderately similar');
    });

    it('should handle asbr_collect_enhanced_evidence A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'asbr_collect_enhanced_evidence',
        params: {
          taskId: 'task_123',
          claim: 'Test evidence claim',
          sources: [{ type: 'file', path: '/test/file.txt', content: 'Test content' }],
        },
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('enhanced_evidence');
      expect(result).toHaveProperty('additional_evidence');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBe(0.9);
    });

    it('should handle get_capabilities A2A message', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'get_capabilities',
        params: {},
      };

      const result = await agent.handleA2AMessage(message);

      expect(result).toHaveProperty('agent_id');
      expect(result).toHaveProperty('llm');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('operational');
      expect(Array.isArray(result.features)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
    });

    it('should handle unknown action gracefully', async () => {
      const message = {
        ...mockA2AMessage,
        action: 'unknown_action',
        params: {},
      };

      await expect(agent.handleA2AMessage(message)).rejects.toThrow(
        'Unknown action: unknown_action',
      );
    });
  });

  describe('🧭 Agent Capability Detection', () => {
    it('should correctly identify supported actions', () => {
      expect(agent.canHandle('ai_generate_text')).toBe(true);
      expect(agent.canHandle('ai_search_knowledge')).toBe(true);
      expect(agent.canHandle('ai_rag_query')).toBe(true);
      expect(agent.canHandle('ai_calculate_similarity')).toBe(true);
      expect(agent.canHandle('asbr_collect_enhanced_evidence')).toBe(true);
      expect(agent.canHandle('get_capabilities')).toBe(true);
      expect(agent.canHandle('unsupported_action')).toBe(false);
    });

    it('should provide agent status information', () => {
      const status = agent.getStatus();

      expect(status).toHaveProperty('agent_id');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('capabilities_healthy');
      expect(status).toHaveProperty('skills_available');

      expect(['idle', 'busy', 'offline', 'error']).toContain(status.status);
      expect(typeof status.capabilities_healthy).toBe('boolean');
      expect(typeof status.skills_available).toBe('number');
      expect(status.skills_available).toBeGreaterThan(0);
    });
  });

  describe('🔧 Integration Quality Gates', () => {
    it('should handle AI capabilities failure gracefully', async () => {
      // Mock AI capabilities to fail
      const failingAgent = createA2AAIAgent('failing-agent');

      // Mock failed getCapabilities
      vi.mocked(failingAgent['aiCapabilities'].getCapabilities).mockRejectedValue(
        new Error('AI service down'),
      );

      const result = await failingAgent.handleA2AMessage({
        ...mockA2AMessage,
        action: 'get_capabilities',
      });

      expect(result).toHaveProperty('status', 'degraded');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('AI capabilities unavailable');
    });

    it('should validate all skill schemas have required properties', () => {
      const agentCard = agent.getAgentCard();

      agentCard.skills.forEach((skill) => {
        // Validate skill structure
        expect(skill).toHaveProperty('name');
        expect(skill).toHaveProperty('description');
        expect(skill).toHaveProperty('parameters');
        expect(skill).toHaveProperty('response');

        // Validate parameter schema structure
        expect(skill.parameters).toHaveProperty('type', 'object');
        expect(skill.parameters).toHaveProperty('properties');

        // Validate response schema structure
        expect(skill.response).toHaveProperty('type', 'object');
        expect(skill.response).toHaveProperty('properties');
      });
    });

    it('should ensure agent card meets A2A specification requirements', () => {
      const agentCard = agent.getAgentCard();

      // Required agent metadata
      expect(agentCard.agent.name).toBeTruthy();
      expect(agentCard.agent.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(agentCard.agent.description).toBeTruthy();

      // Valid provider information
      expect(agentCard.agent.provider?.organization).toBeTruthy();
      expect(agentCard.agent.provider?.url).toMatch(/^https?:\/\/.+/);

      // Valid interface configuration
      expect(['http', 'https', 'ws', 'wss']).toContain(agentCard.interface.transport);
      expect(agentCard.interface.uri).toMatch(/^https?:\/\/.+/);

      // At least one skill defined
      expect(agentCard.skills.length).toBeGreaterThan(0);
    });

    it('should verify all A2A skills are testable', async () => {
      const skillTests = [
        { action: 'ai_generate_text', params: { prompt: 'test' } },
        { action: 'ai_search_knowledge', params: { query: 'test' } },
        { action: 'ai_rag_query', params: { query: 'test' } },
        { action: 'ai_calculate_similarity', params: { text1: 'a', text2: 'b' } },
        {
          action: 'asbr_collect_enhanced_evidence',
          params: { taskId: 'test', claim: 'test', sources: [] },
        },
        { action: 'get_capabilities', params: {} },
      ];

      for (const test of skillTests) {
        const message = { ...mockA2AMessage, ...test };
        const result = await agent.handleA2AMessage(message);
        expect(result).toBeTruthy();
      }
    });
  });
});

describe('📋 A2A Protocol Compatibility Checklist', () => {
  it('should verify A2A protocol compliance', () => {
    const agent = createA2AAIAgent('compliance-test');
    const agentCard = agent.getAgentCard();

    // ✅ A2A Agent Card Structure Compliance
    expect(agentCard).toHaveProperty('agent');
    expect(agentCard).toHaveProperty('interface');
    expect(agentCard).toHaveProperty('skills');

    // ✅ Agent Metadata Compliance
    expect(agentCard.agent).toHaveProperty('name');
    expect(agentCard.agent).toHaveProperty('version');
    expect(agentCard.agent).toHaveProperty('description');

    // ✅ Interface Configuration Compliance
    expect(agentCard.interface).toHaveProperty('transport');
    expect(agentCard.interface).toHaveProperty('uri');

    // ✅ Skills Definition Compliance
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(agentCard.skills.length).toBeGreaterThan(0);

    // ✅ Message Handling Compliance
    expect(typeof agent.handleA2AMessage).toBe('function');
    expect(typeof agent.canHandle).toBe('function');
    expect(typeof agent.getStatus).toBe('function');

    console.log('✅ A2A Protocol Compatibility: PASSED');
    console.log(`   - Agent: ${agentCard.agent.name} v${agentCard.agent.version}`);
    console.log(`   - Skills: ${agentCard.skills.length} AI capabilities exposed`);
    console.log(`   - Transport: ${agentCard.interface.transport.toUpperCase()}`);
    console.log(`   - Endpoint: ${agentCard.interface.uri}`);
  });
});
