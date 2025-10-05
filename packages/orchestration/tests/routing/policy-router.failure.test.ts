import { mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PolicyRouter } from '../../src/routing/policy-router.js';

describe('PolicyRouter failure handling', () => {
        let tempDir: string;
        let policyPath: string;

        beforeEach(() => {
                        tempDir = mkdtempSync(join(tmpdir(), 'policy-router-failure-'));
                        policyPath = join(tempDir, 'routing-policy.yaml');
                        writeFileSync(
                                policyPath,
                                [
                                        'version: 0.4',
                                        'interfaces:',
                                        '  cli:',
                                        '    app: apps/cortex-os',
                                        '    priority_base: 10',
                                        '    safety:',
                                        '      allow_network: false',
                                        '      allow_fs_write: tempdir',
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
                                        '    - id: review',
                                        "      providers: ['packages/agents/generalist']",
                                        '  incompatible: []',
                                ].join('\n'),
                                'utf8',
                        );
        });

        afterEach(async () => {
                await rm(tempDir, { recursive: true, force: true });
        });

        it('throws when interface is missing in policy', async () => {
                const router = new PolicyRouter(policyPath);
                await expect(
                        router.route({ interfaceId: 'webui', capabilities: ['code_edit'] }),
                ).rejects.toThrow(/interface_missing/);
                await router.close();
        });
});
