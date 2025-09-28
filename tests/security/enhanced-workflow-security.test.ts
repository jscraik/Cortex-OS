import { describe, expect, it } from 'vitest';

import { executePlannedWorkflow } from '../../packages/orchestration/src/langgraph/planning-orchestrator.js';
import { securityAccessControlTool } from '../../packages/security/src/mcp/tools.js';

describe('Cross-cutting security validation', () => {
        it('evaluates brAInwav access control for orchestrated planning data', async () => {
                const base = new Date('2025-01-03T00:00:00.000Z').getTime();
                let tick = 0;
                const clock = () => new Date(base + tick++ * 750);

                const workflow = await executePlannedWorkflow({
                        input: 'Assess security guardrails for coordinated planning output.',
                        task: {
                                description: 'Security validation for orchestration results',
                                complexity: 6,
                                priority: 7,
                                metadata: { capabilities: ['security', 'analysis'] },
                        },
                        session: {
                                id: 'security-session',
                                model: 'mlx-brainwav',
                                user: 'qa-security',
                                cwd: '/workspace/security',
                        },
                        clock,
                });

                const primaryAssignment = workflow.coordinationDecision.assignments[0];
                expect(primaryAssignment).toBeDefined();

                const response = await securityAccessControlTool.handler({
                        subject: {
                                id: primaryAssignment?.agentId ?? 'brAInwav.agent.primary',
                                roles: ['security-admin', 'orchestration-lead'],
                                clearance: 'top-secret',
                        },
                        resource: {
                                id: workflow.planningResult.taskId,
                                type: 'orchestration.plan',
                                ownerId: primaryAssignment?.agentId,
                                sensitivity: 'restricted',
                        },
                        action: 'read',
                        context: {
                                environment: 'production',
                                timestamp: new Date().toISOString(),
                                location: 'global',
                        },
                });

                expect(response.metadata.tool).toBe('security_access_control');
                expect(response.metadata.correlationId).toMatch(/^sec-/);
                expect(response.isError).toBe(false);

                const payload = JSON.parse(response.content[0]?.text ?? '{}') as {
                        allowed?: boolean;
                        reasons?: string[];
                        decisions?: Array<{ score: number; effect: string; action: string }>;
                        riskScore?: number;
                        context?: { environment?: string };
                };

                expect(payload.allowed).toBe(true);
                expect(payload.context?.environment).toBe('production');
                expect(payload.decisions?.[0]?.action).toBe('read');
                expect(payload.decisions?.[0]?.effect).toBe('allow');
                expect(payload.decisions?.[0]?.score).toBeGreaterThan(30);
                expect(payload.decisions?.[0]?.score).toBeLessThanOrEqual(100);
                expect(payload.reasons?.some((reason) => reason.toLowerCase().includes('privileged role'))).toBe(true);
        });
});
