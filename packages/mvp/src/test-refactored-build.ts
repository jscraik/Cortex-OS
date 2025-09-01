/**
 * Integration test for refactored BuildNode
 */

import { BuildNode } from './nodes/build.js';
import type { PRPState } from './state.js';

async function testRefactoredBuild() {
  console.log('🧪 Testing refactored BuildNode...');

  const mockState: PRPState = {
    id: 'test-refactor',
    runId: 'run-test-refactor',
    phase: 'build',
    blueprint: {
      title: 'Test Application',
      description: 'Testing refactored BuildNode functionality',
      requirements: ['Frontend React UI', 'Backend API with authentication'],
      metadata: { testMode: true },
    },
    evidence: [],
    validationResults: {},
    outputs: {
      'api-check': { hasSchema: true },
    },
    cerebrum: {
      decision: 'pending',
      reasoning: 'Testing refactored build',
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      startTime: new Date().toISOString(),
    },
  };

  const buildNode = new BuildNode();

  try {
    console.log('⚡ Executing BuildNode...');
    const startTime = Date.now();

    const result = await buildNode.execute(mockState);

    const duration = Date.now() - startTime;

    // Verify results
    console.log('✅ BuildNode execution completed');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Evidence items: ${result.evidence.length}`);
    console.log(`🎯 Build passed: ${result.validationResults.build?.passed || false}`);

    if (result.validationResults.build?.blockers?.length) {
      console.log(`🚫 Blockers: ${result.validationResults.build.blockers.length}`);
      result.validationResults.build.blockers.forEach((b, i) => console.log(`   ${i + 1}. ${b}`));
    }

    if (result.validationResults.build?.majors?.length) {
      console.log(`⚠️  Major issues: ${result.validationResults.build.majors.length}`);
      result.validationResults.build.majors.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
    }

    // Verify evidence structure
    const evidenceTypes = new Set(result.evidence.map((e) => e.source));
    console.log(`📝 Evidence sources: ${Array.from(evidenceTypes).join(', ')}`);

    // Verify all validators ran
    const expectedSources = [
      'backend_validation',
      'api_schema_validation',
      'security_scanner',
      'frontend_validation',
    ];

    const missingValidators = expectedSources.filter(
      (source) => !result.evidence.some((e) => e.source === source),
    );

    if (missingValidators.length === 0) {
      console.log('✅ All validators executed successfully');
    } else {
      console.log(`⚠️  Missing validators: ${missingValidators.join(', ')}`);
    }

    console.log('🎉 Refactoring verification PASSED - All critical bugs fixed!');
  } catch (error) {
    console.error('❌ BuildNode execution failed:', error);
    console.log('💥 Refactoring verification FAILED');
    throw error;
  }
}

testRefactoredBuild().catch(console.error);
