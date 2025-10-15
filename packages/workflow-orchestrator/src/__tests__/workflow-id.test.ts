import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWorkflowId } from '../orchestrator/WorkflowEngine.js';
import { resetSecureRandomSource, withSecureRandomSource } from '../utils/secure-random.js';

describe('workflow id generation', () => {
        afterEach(() => {
                resetSecureRandomSource();
                vi.useRealTimers();
        });

        it('produces deterministic ids when secure source is overridden', async () => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

                const workflowId = await withSecureRandomSource(
                        () => 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                        () => generateWorkflowId(),
                );

                expect(workflowId).toBe('wf-1735689600000-ccccccccc');
        });
});
