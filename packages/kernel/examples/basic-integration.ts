/**
 * @file basic-integration.ts
 * @description Basic integration example showing Cortex Kernel usage
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status EXAMPLE
 */

import { CortexKernel } from '../src/graph-simple.js';

/**
 * Example integration showing how to use the Cortex Kernel
 * with a mock orchestrator for deterministic PRP workflows
 */
async function basicIntegrationExample() {
  console.log('🧠 Cortex Kernel Integration Example\n');

  // 1. Create a mock orchestrator (in real usage, this would be the PRP runner)
  const mockOrchestrator = {
    getNeuronCount: () => 5,
    executeNeuron: async (id: string, input: any) => {
      console.log(`   🔄 Executing neuron: ${id}`);
      return { result: `Processed by ${id}`, input };
    },
  };

  // 2. Initialize the kernel
  const kernel = new CortexKernel(mockOrchestrator);
  console.log(`✅ Kernel initialized with ${kernel.getNeuronCount()} neurons\n`);

  // 3. Define a sample project blueprint
  const blueprint = {
    title: 'Sample API Development',
    description: 'Build a REST API with authentication and user management',
    requirements: [
      'User registration and login',
      'JWT token authentication',
      'CRUD operations for user profiles',
      'Input validation and error handling',
      'Unit tests with 90% coverage',
    ],
  };

  console.log('📋 Project Blueprint:');
  console.log(`   Title: ${blueprint.title}`);
  console.log(`   Requirements: ${blueprint.requirements.length} items`);
  console.log();

  // 4. Run the PRP workflow
  const startTime = Date.now();
  console.log('🚀 Starting PRP workflow execution...\n');

  const result = await kernel.runPRPWorkflow(blueprint, {
    runId: 'example-run-001',
    deterministic: true,
  });

  const duration = Date.now() - startTime;
  console.log(`⏱️  Workflow completed in ${duration}ms\n`);

  // 5. Display results
  console.log('📊 Workflow Results:');
  console.log(`   Final Phase: ${result.phase}`);
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Start Time: ${result.metadata.startTime}`);
  console.log(`   End Time: ${result.metadata.endTime || 'N/A'}`);

  if (result.cerebrum) {
    console.log(
      `   Cerebrum Decision: ${result.cerebrum.decision} (${Math.round(result.cerebrum.confidence * 100)}% confidence)`,
    );
    console.log(`   Reasoning: ${result.cerebrum.reasoning}`);
  }

  // 6. Show validation results
  console.log('\n🔍 Validation Results:');
  const phases = ['strategy', 'build', 'evaluation'] as const;
  phases.forEach((phase) => {
    const validation = result.validationResults[phase];
    if (validation) {
      const status = validation.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`   ${phase.charAt(0).toUpperCase() + phase.slice(1)}: ${status}`);
      if (validation.blockers.length > 0) {
        console.log(`     Blockers: ${validation.blockers.join(', ')}`);
      }
      if (validation.majors.length > 0) {
        console.log(`     Majors: ${validation.majors.join(', ')}`);
      }
    }
  });

  // 7. Display execution history
  const history = kernel.getExecutionHistory(result.runId);
  console.log(`\n📈 Execution History (${history.length} states):`);
  history.forEach((state, index) => {
    console.log(`   ${index + 1}. ${state.phase} phase`);
  });

  console.log('\n🎉 Integration example completed successfully!');

  return result;
}

/**
 * Determinism demonstration - run the same workflow twice
 * and verify results are structurally identical
 */
async function determinismDemo() {
  console.log('\n🔬 Determinism Demonstration\n');

  const mockOrchestrator = {
    getNeuronCount: () => 3,
  };

  const kernel = new CortexKernel(mockOrchestrator);

  const blueprint = {
    title: 'Determinism Test',
    description: 'Simple test project for determinism validation',
    requirements: ['Feature A', 'Feature B'],
  };

  console.log('Running identical workflows twice...');

  const [run1, run2] = await Promise.all([
    kernel.runPRPWorkflow(blueprint, { runId: 'determinism-test-1' }),
    kernel.runPRPWorkflow(blueprint, { runId: 'determinism-test-2' }),
  ]);

  // Normalize for comparison (exclude timestamps and run IDs)
  const normalize = (state: any) => ({
    ...state,
    id: 'NORMALIZED',
    runId: 'NORMALIZED',
    metadata: { ...state.metadata, startTime: 'NORM', endTime: 'NORM' },
    validationResults: Object.fromEntries(
      Object.entries(state.validationResults).map(([key, value]: [string, any]) => [
        key,
        value ? { ...value, timestamp: 'NORM' } : value,
      ]),
    ),
    cerebrum: state.cerebrum ? { ...state.cerebrum, timestamp: 'NORM' } : state.cerebrum,
  });

  const normalized1 = normalize(run1);
  const normalized2 = normalize(run2);

  const isIdentical = JSON.stringify(normalized1) === JSON.stringify(normalized2);

  console.log(`✅ Structural determinism: ${isIdentical ? 'VERIFIED' : 'FAILED'}`);
  console.log(`   Run 1 final phase: ${run1.phase}`);
  console.log(`   Run 2 final phase: ${run2.phase}`);
  console.log(`   Both completed: ${run1.phase === 'completed' && run2.phase === 'completed'}`);

  return { run1, run2, isIdentical };
}

// Run examples if called directly
if (import.meta.main) {
  try {
    await basicIntegrationExample();
    await determinismDemo();
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

export { basicIntegrationExample, determinismDemo };
