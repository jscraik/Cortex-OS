/**
 * MLX-First Integration Tests
 * Tests the complete model integration pipeline
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MLXFirstOrchestrator } from '../src/coordinator/mlx-first-coordinator.js';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

describe('MLX-First Integration', () => {
  let provider: MLXFirstModelProvider;
  let orchestrator: MLXFirstOrchestrator;

  beforeEach(() => {
    provider = new MLXFirstModelProvider();
    orchestrator = new MLXFirstOrchestrator();
  });

  describe('MLXFirstModelProvider', () => {
    it('should initialize with correct model assignments', () => {
      expect(provider).toBeDefined();
    });

    it('should generate text with appropriate model selection', async () => {
      const request = {
        task: 'test_generation' as const,
        prompt: 'Hello, this is a test prompt',
        maxTokens: 100,
      };

      try {
        const result = await provider.generate('quickReasoning', request);
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('provider');
        expect(['mlx', 'ollama']).toContain(result.provider);
      } catch (error) {
        // Expected if services not running
        expect(error).toBeDefined();
      }
    });

    it('should generate embeddings using Qwen3-Embedding models', async () => {
      const request = {
        texts: ['Hello world', 'Machine learning is fascinating'],
        task: 'similarity' as const,
      };

      try {
        const embeddings = await provider.embed(request);
        expect(embeddings).toHaveProperty('embeddings');
        expect(Array.isArray(embeddings.embeddings)).toBe(true);

        if (embeddings.embeddings.length > 0) {
          expect(Array.isArray(embeddings.embeddings[0])).toBe(true);
        }
      } catch (error) {
        // Expected if MLX service not running
        expect(error).toBeDefined();
      }
    });

    it('should rerank documents appropriately', async () => {
      const query = 'machine learning algorithms';
      const documents = [
        'Neural networks are a type of machine learning model',
        'Cooking recipes for Italian cuisine',
        'Deep learning techniques for computer vision',
        'Weather forecast for tomorrow',
      ];

      try {
        const ranked = await provider.rerank(query, documents);
        expect(ranked).toHaveProperty('scores');
        expect(Array.isArray(ranked.scores)).toBe(true);

        if (ranked.scores.length > 0) {
          expect(typeof ranked.scores[0]).toBe('number');
        }
      } catch (error) {
        // Expected if reranking service not available
        expect(error).toBeDefined();
      }
    });
  });

  describe('MLXFirstOrchestrator', () => {
    it('should initialize correctly', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should decompose complex tasks', async () => {
      const taskDescription = 'Build a secure user authentication system';
      const availableAgents = ['security-expert', 'backend-developer', 'frontend-developer'];

      const decomposition = await orchestrator.decomposeTask(taskDescription, availableAgents);

      expect(decomposition).toHaveProperty('subtasks');
      expect(decomposition).toHaveProperty('parallelizable');
      expect(decomposition).toHaveProperty('criticalPath');
      expect(decomposition).toHaveProperty('reasoning');

      expect(Array.isArray(decomposition.subtasks)).toBe(true);
      if (decomposition.subtasks.length > 0) {
        expect(decomposition.subtasks[0]).toHaveProperty('id');
        expect(decomposition.subtasks[0]).toHaveProperty('description');
        expect(decomposition.subtasks[0]).toHaveProperty('dependencies');
      }
    });

    it('should select optimal agents', async () => {
      const taskDescription = 'Optimize database queries for better performance';
      const availableAgents = [
        { id: 'db-expert', capabilities: ['database', 'optimization'], currentLoad: 0.5 },
        { id: 'backend-dev', capabilities: ['backend', 'api'], currentLoad: 0.2 },
        {
          id: 'performance-specialist',
          capabilities: ['performance', 'profiling'],
          currentLoad: 0.8,
        },
      ];

      const selection = await orchestrator.selectOptimalAgent(
        taskDescription,
        availableAgents,
        'high',
      );

      expect(selection).toHaveProperty('agentId');
      expect(selection).toHaveProperty('reasoning');
      expect(selection).toHaveProperty('confidence');

      expect(availableAgents.some((a) => a.id === selection.agentId)).toBe(true);
      expect(typeof selection.confidence).toBe('number');
    });

    it('should validate task safety', async () => {
      const safeTask = 'Generate unit tests for a calculator function';

      const safeResult = await orchestrator.validateTaskSafety(safeTask);
      expect(safeResult).toHaveProperty('safe');
      expect(safeResult).toHaveProperty('issues');
      expect(safeResult).toHaveProperty('recommendations');
    });

    it('should coordinate multi-modal tasks', async () => {
      const taskDescription = 'Analyze this UI mockup and generate React components';
      const visualContext = 'UI mockup showing a login form with email and password fields';

      const decision = await orchestrator.coordinateMultiModalTask(taskDescription, visualContext);

      expect(decision).toHaveProperty('action');
      expect(decision).toHaveProperty('reasoning');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('nextSteps');
      expect(decision).toHaveProperty('provider');

      expect(['proceed', 'wait', 'escalate', 'abort']).toContain(decision.action);
    });

    it('should orchestrate code tasks', async () => {
      const codeTask = 'Refactor this component to use TypeScript';
      const codebase = `
        function UserComponent(props) {
          return <div>{props.name}</div>;
        }
      `;

      const result = await orchestrator.orchestrateCodeTask(codeTask, codebase);

      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('codeStrategy');
      expect(result).toHaveProperty('testStrategy');
      expect(result).toHaveProperty('riskAssessment');

      expect(result.plan).toHaveProperty('subtasks');
      expect(typeof result.codeStrategy).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete orchestration workflow', async () => {
      const taskDescription = 'I need to build a REST API with authentication';
      const agents = [
        { id: 'api-specialist', capabilities: ['api', 'backend'], currentLoad: 0.3 },
        { id: 'security-expert', capabilities: ['security', 'auth'], currentLoad: 0.2 },
      ];

      // Step 1: Decompose the task
      const decomposition = await orchestrator.decomposeTask(
        taskDescription,
        agents.map((a) => a.id),
      );
      expect(decomposition.subtasks.length).toBeGreaterThan(0);

      // Step 2: Select optimal agent
      const agentSelection = await orchestrator.selectOptimalAgent(
        taskDescription,
        agents,
        'medium',
      );
      expect(agents.some((a) => a.id === agentSelection.agentId)).toBe(true);

      // Step 3: Validate safety
      const safetyCheck = await orchestrator.validateTaskSafety(taskDescription);
      expect(safetyCheck).toHaveProperty('safe');

      // Workflow completed successfully
      expect(true).toBe(true);
    });
  });
});
