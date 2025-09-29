import { describe, expect, it } from 'vitest';
import { PromptTemplateManager, PlanningPhase } from '../../src/lib/prompt-template-manager.js';

describe('PromptTemplateManager security integration', () => {
        it('registers cortex-sec security prompts for high risk contexts', () => {
                const manager = new PromptTemplateManager();
                const context: Parameters<PromptTemplateManager['selectTemplate']>[0] = {
                        taskId: 'security-task',
                        agentId: 'security-agent',
                        complexity: 6,
                        priority: 8,
                        capabilities: ['security', 'analysis'],
                        tools: ['security.run_semgrep_scan', 'security.validate_compliance'],
                        currentPhase: PlanningPhase.ANALYSIS,
                        planningContext: {
                                id: 'security-task',
                                currentPhase: PlanningPhase.ANALYSIS,
                                compliance: {
                                        riskScore: 0.8,
                                        standards: ['owasp-top10'],
                                        outstandingViolations: [],
                                        lastCheckedAt: null,
                                },
                        },
                        compliance: {
                                riskScore: 0.8,
                                standards: ['owasp-top10'],
                                outstandingViolations: [],
                                lastCheckedAt: null,
                        },
                        nOArchitecture: true,
                        riskScore: '0.80',
                        standards: 'owasp-top10',
                        primaryAction: 'execute-critical-security-scan',
                        playbook: '- run_semgrep_scan\n- validate_compliance',
                        riskLabel: 'critical',
                        violations: 'None',
                };

                const selection = manager.selectTemplate(context);

                expect(selection.template.id).toMatch(/security-/);
                const prompt = manager.generatePrompt(selection, context);

                expect(prompt).toContain('brAInwav Security Response Console');
        });
});
