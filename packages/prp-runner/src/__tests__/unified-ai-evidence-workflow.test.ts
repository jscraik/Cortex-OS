/**
 * @file Unified AI Evidence Workflow Tests
 * @description Tests for the real unified evidence workflow without mocks
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status active
 */

import { describe, test, expect } from 'vitest';
import { UnifiedAIEvidenceWorkflow } from '../unified-ai-evidence-workflow.js';

describe('🔄 Unified AI Evidence Workflow (real implementation)', () => {
  test('initializes workflow with default configuration', async () => {
    const workflow = new UnifiedAIEvidenceWorkflow();
    const status = await workflow.getWorkflowStatus();


    expect(status.status).toBe('active');
    expect(status.components.asbrIntegration).toBe('connected');
    expect(status.components.embeddingAdapter).toBe('connected');

  });

  test('supports graceful shutdown', async () => {
    const workflow = new UnifiedAIEvidenceWorkflow();
    await expect(workflow.shutdown()).resolves.not.toThrow();
  });
});
