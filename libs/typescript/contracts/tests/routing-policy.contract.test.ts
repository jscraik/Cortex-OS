import { describe, expect, it } from 'vitest';

import { RoutingPolicySchema } from '../src/orchestration/routing-policy.js';

describe('RoutingPolicySchema', () => {
        it('validates a minimal capability routing policy', () => {
                const policy = RoutingPolicySchema.parse({
                        version: '0.4',
                        interfaces: {
                                cli: {
                                        app: 'apps/cortex-os',
                                        priority_base: 80,
                                        safety: {
                                                allow_network: true,
                                                allow_fs_write: 'workspace_only',
                                        },
                                },
                        },
                        routing: {
                                strategy: {
                                        plan_with: 'packages/orchestration/planners/policy-driven',
                                        select_by: ['capability_score'],
                                        fallbacks: ['packages/agents/generalist'],
                                        guardrails: 'packages/security/policies/llm-guardrails.yaml',
                                        evidence: {
                                                require_provenance: true,
                                                sink: 'packages/memories',
                                        },
                                },
                        },
                        capability_matrix: {
                                required: [
                                        {
                                                id: 'code_edit',
                                                providers: ['packages/agents/dev'],
                                        },
                                ],
                                incompatible: [],
                        },
                });

                expect(policy.capability_matrix.required[0]?.id).toBe('code_edit');
        });

        it('rejects policies with missing interface locator', () => {
                expect(() =>
                        RoutingPolicySchema.parse({
                                version: '0.4',
                                interfaces: {
                                        webui: {
                                                priority_base: 10,
                                                safety: {
                                                        allow_network: 'ask',
                                                        allow_fs_write: 'tempdir',
                                                },
                                        },
                                },
                                routing: {
                                        strategy: {
                                                plan_with: 'packages/orchestration/planners/policy-driven',
                                                select_by: ['capability_score'],
                                                fallbacks: [],
                                                guardrails: 'packages/security/policies/llm-guardrails.yaml',
                                                evidence: {
                                                        require_provenance: true,
                                                        sink: 'packages/memories',
                                                },
                                        },
                                },
                                capability_matrix: {
                                        required: [
                                                {
                                                        id: 'code_edit',
                                                        providers: ['packages/agents/dev'],
                                                },
                                        ],
                                },
                        }),
                ).toThrow(/app/);
        });
});
