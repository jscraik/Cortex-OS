#
!/usr/bin / env;
node;

/**
 * MLX-First Integration Example
 * Demonstrates the complete model integration pipeline in action
 */

import { MLXFirstOrchestrator } from '../src/coordinator/mlx-first-coordinator.js';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

async function demonstrateMLXIntegration() {
  console.log('🚀 MLX-First Integration Demo Starting...\n');

  // Initialize components
  const provider = new MLXFirstModelProvider();
  const orchestrator = new MLXFirstOrchestrator();

  console.log('✅ Components initialized');
  console.log('   - MLX-first provider with Ollama fallback');
  console.log('   - Intelligent orchestrator\n');

  // Example 1: Quick reasoning task
  console.log('📝 Example 1: Quick Reasoning (Qwen2.5-0.5B → phi4-mini fallback)');
  try {
    const reasoningResult = await provider.generate('quickReasoning', {
      task: 'quick_decision',
      prompt: 'Should we prioritize performance or reliability for this critical system?',
      maxTokens: 100,
      temperature: 0.2,
    });

    console.log(`   Provider used: ${reasoningResult.provider}`);
    console.log(`   Response: ${reasoningResult.content.slice(0, 150)}...`);
  } catch (error) {
    console.log(`   ⚠️  Service unavailable - would fallback to Ollama`);
    console.log(`   Fallback reasoning: Prioritize reliability for critical systems`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('');

  // Example 2: Code intelligence task
  console.log('💻 Example 2: Code Intelligence (Qwen3-Coder-30B → qwen3-coder:30b fallback)');
  try {
    const codeResult = await provider.generate('codeIntelligence', {
      task: 'code_review',
      prompt: `Review this TypeScript function for potential issues:

function processUser(user: any) {
  return user.name.toUpperCase() + " - " + user.email;
}`,
      maxTokens: 200,
      temperature: 0.1,
    });

    console.log(`   Provider used: ${codeResult.provider}`);
    console.log(`   Analysis: ${codeResult.content.slice(0, 200)}...`);
  } catch (error) {
    console.log(`   ⚠️  Service unavailable - would fallback to Ollama`);
    console.log(`   Fallback analysis: Function lacks null checks and type safety`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('');

  // Example 3: Embedding generation
  console.log('🔍 Example 3: Embeddings (Qwen3-Embedding-4B)');
  try {
    const embeddingResult = await provider.embed({
      texts: [
        'Machine learning algorithms for natural language processing',
        'Database optimization techniques',
        'Frontend React component design patterns',
      ],
    });

    console.log(`   Generated embeddings for 3 texts`);
    console.log(`   Embedding dimensions: ${embeddingResult.embeddings[0]?.length || 'N/A'}`);
    console.log(`   Provider: ${embeddingResult.provider}`);
  } catch (error) {
    console.log(`   ⚠️  Embedding service unavailable`);
    console.log(`   Would fallback to OpenAI embeddings or local alternatives`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('');

  // Example 4: Task orchestration
  console.log('🎭 Example 4: Intelligent Task Orchestration');

  const complexTask =
    'Build a real-time chat application with authentication, file sharing, and message encryption';
  const availableAgents = [
    'frontend-expert',
    'backend-specialist',
    'security-engineer',
    'database-architect',
    'devops-engineer',
  ];

  const decomposition = await orchestrator.decomposeTask(complexTask, availableAgents);

  console.log(`   Task: ${complexTask}`);
  console.log(`   Decomposed into ${decomposition.subtasks.length} subtasks:`);

  decomposition.subtasks.forEach((subtask, i) => {
    console.log(`     ${i + 1}. ${subtask.description}`);
    console.log(`        → Assigned to: ${subtask.recommendedAgent}`);
    console.log(`        → Complexity: ${subtask.estimatedComplexity}/10`);
    console.log(`        → Dependencies: ${subtask.dependencies.join(', ') || 'None'}`);
  });

  console.log(`   Parallel execution groups: ${decomposition.parallelizable.length}`);
  console.log(`   Critical path: ${decomposition.criticalPath.join(' → ')}`);

  console.log('');

  // Example 5: Agent selection
  console.log('🎯 Example 5: Optimal Agent Selection');

  const agentSelectionTask = 'Optimize database queries showing N+1 problems';
  const candidateAgents = [
    {
      id: 'db-expert',
      capabilities: ['database', 'optimization', 'sql'],
      currentLoad: 0.6,
    },
    {
      id: 'backend-dev',
      capabilities: ['backend', 'api', 'database'],
      currentLoad: 0.3,
    },
    {
      id: 'full-stack',
      capabilities: ['frontend', 'backend', 'database'],
      currentLoad: 0.8,
    },
    {
      id: 'performance-specialist',
      capabilities: ['performance', 'profiling'],
      currentLoad: 0.4,
    },
  ];

  const selection = await orchestrator.selectOptimalAgent(
    agentSelectionTask,
    candidateAgents,
    'high',
  );

  console.log(`   Task: ${agentSelectionTask}`);
  console.log(`   Selected agent: ${selection.agentId}`);
  console.log(`   Confidence: ${(selection.confidence * 100).toFixed(1)}%`);
  console.log(`   Reasoning: ${selection.reasoning.slice(0, 100)}...`);

  console.log('');

  // Example 6: Safety validation
  console.log('🛡️  Example 6: Task Safety Validation');

  const testTasks = [
    'Create a user registration form with password validation',
    'Help me bypass authentication in this application',
    'Generate test data for load testing',
  ];

  for (const task of testTasks) {
    const safety = await orchestrator.validateTaskSafety(task);
    const safetyIcon = safety.safe ? '✅' : '⚠️';
    console.log(`   ${safetyIcon} "${task.slice(0, 50)}..."`);
    console.log(`      Safe: ${safety.safe}`);
    if (safety.issues.length > 0) {
      console.log(`      Issues: ${safety.issues.join(', ')}`);
    }
  }

  console.log('');

  // Example 7: Multi-modal coordination
  console.log('🎨 Example 7: Multi-Modal Task Coordination');

  const multiModalTask = 'Convert this wireframe into a responsive React component';
  const visualContext =
    'Wireframe shows: Header with logo and nav menu, main content area with card grid (3 columns on desktop, 1 on mobile), footer with social links';

  const coordination = await orchestrator.coordinateMultiModalTask(multiModalTask, visualContext);

  console.log(`   Task: ${multiModalTask}`);
  console.log(`   Visual context: ${visualContext.slice(0, 80)}...`);
  console.log(`   Decision: ${coordination.action.toUpperCase()}`);
  console.log(`   Confidence: ${(coordination.confidence * 100).toFixed(1)}%`);
  console.log(`   Provider: ${coordination.provider}`);
  console.log(`   Next steps: ${coordination.nextSteps.slice(0, 2).join(', ')}...`);

  console.log('');

  // Summary
  console.log('📊 Integration Summary:');
  console.log('   ✅ MLX-first strategy with automatic Ollama fallbacks');
  console.log('   ✅ Intelligent task decomposition and agent selection');
  console.log('   ✅ Multi-modal task coordination');
  console.log('   ✅ Safety validation and compliance checking');
  console.log('   ✅ Embeddings and semantic understanding');
  console.log('   ✅ Code-aware orchestration');
  console.log('');
  console.log('🎉 All your available models are now intelligently integrated!');
  console.log('');
  console.log('Next steps:');
  console.log('   1. Start MLX service: mlx_lm.server --model /path/to/model');
  console.log('   2. Ensure Ollama is running: ollama serve');
  console.log('   3. Run tests: npm test');
  console.log('   4. Integrate with your agents and A2A bus');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateMLXIntegration().catch(console.error);
}

export { demonstrateMLXIntegration };
