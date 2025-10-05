import { mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PolicyRouter } from '../../src/routing/policy-router.js';

describe('PolicyRouter', () => {
        let tempDir: string;
        let policyPath: string;

        beforeEach(() => {
                        tempDir = mkdtempSync(join(tmpdir(), 'policy-router-'));
                        policyPath = join(tempDir, 'routing-policy.yaml');
                        writeFileSync(
                                policyPath,
                                [
                                        'version: 0.4',
                                        'interfaces:',
                                        '  cli:',
                                        '    app: apps/cortex-os',
                                        '    priority_base: 80',
                                        '    safety:',
                                        '      allow_network: true',
                                        '      allow_fs_write: workspace_only',
                                        'routing:',
                                        '  strategy:',
                                        '    plan_with: packages/orchestration/planners/policy-driven',
                                        '    select_by:',
                                        '      - capability_score',
                                        '    fallbacks:',
                                        '      - packages/agents/generalist',
                                        '    guardrails: packages/security/policies/llm-guardrails.yaml',
                                        '    evidence:',
                                        '      require_provenance: true',
                                        '      sink: packages/memories',
                                        'capability_matrix:',
                                        '  required:',
                                        '    - id: code_edit',
                                        "      providers: ['packages/agents/dev']",
                                        '  incompatible: []',
                                ].join('\n'),
                                'utf8',
                        );
        });

        afterEach(async () => {
                await rm(tempDir, { recursive: true, force: true });
        });

        it('selects a provider based on capability requirements', async () => {
                const router = new PolicyRouter(policyPath);
                const decision = await router.route({ interfaceId: 'cli', capabilities: ['code_edit'] });
                expect(decision.selectedAgent).toBe('packages/agents/dev');
                const explanation = router.explain(decision.requestId);
                expect(explanation?.selectedAgent).toBe('packages/agents/dev');
                await router.close();
        });
});
