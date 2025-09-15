import { describe, expect, it } from 'vitest';
import { agentEventCatalog } from '@/events/agent-events.js';

const iso = () => new Date().toISOString();
const base = (type: string, data: unknown) => ({
	specversion: '1.0',
	type,
	data,
});

describe('Event Contract: agentEventCatalog', () => {
	it('validates all known event schemas with sample payloads', () => {
		const samples: Record<string, unknown> = {
			'agent.started': base('agent.started', {
				agentId: 'a',
				traceId: 't',
				capability: 'documentation',
				input: {},
				timestamp: iso(),
			}),
			'agent.completed': base('agent.completed', {
				agentId: 'a',
				traceId: 't',
				capability: 'documentation',
				result: {},
				evidence: [],
				metrics: { latencyMs: 10, tokensUsed: 1, suggestionsCount: 0 },
				timestamp: iso(),
			}),
			'agent.failed': base('agent.failed', {
				agentId: 'a',
				traceId: 't',
				capability: 'documentation',
				error: 'x',
				metrics: { latencyMs: 1 },
				timestamp: iso(),
			}),
			'provider.success': base('provider.success', {
				providerId: 'p',
				modelId: 'm',
				latencyMs: 1,
				tokensUsed: 2,
				timestamp: iso(),
			}),
			'provider.fallback': base('provider.fallback', {
				fromProvider: 'p1',
				toProvider: 'p2',
				reason: 'timeout',
				timestamp: iso(),
			}),
			'system.thermal_throttle': base('system.thermal_throttle', {
				temperature: 90,
				throttleLevel: 'severe',
				timestamp: iso(),
			}),
			'system.memory_pressure': base('system.memory_pressure', {
				memoryUsage: 12,
				pressureLevel: 'warning',
				timestamp: iso(),
			}),
			'mcp.server_connected': base('mcp.server_connected', {
				serverId: 's1',
				serverName: 'svc',
				capabilities: ['text-generation'],
				timestamp: iso(),
			}),
			'mcp.server_disconnected': base('mcp.server_disconnected', {
				serverId: 's1',
				reason: 'bye',
				timestamp: iso(),
			}),
			'workflow.started': base('workflow.started', {
				workflowId: 'w1',
				name: 'wf',
				tasksCount: 1,
				timestamp: iso(),
			}),
			'workflow.completed': base('workflow.completed', {
				workflowId: 'w1',
				status: 'completed',
				metrics: {
					totalTime: 1,
					tasksCompleted: 1,
					tasksTotal: 1,
					agentsUsed: ['documentation'],
				},
				timestamp: iso(),
			}),
			'workflow.cancelled': base('workflow.cancelled', {
				workflowId: 'w1',
				timestamp: iso(),
			}),
			'security.dependabot_config_loaded': base(
				'security.dependabot_config_loaded',
				{
					path: '.github/dependabot.yml',
					projects: [
						{
							packageEcosystem: 'npm',
							directory: '/',
							scheduleInterval: 'weekly',
						},
						{
							packageEcosystem: 'github-actions',
							directory: '/',
							scheduleInterval: 'weekly',
						},
					],
					timestamp: iso(),
				},
			),
			'security.dependabot_assessed': base('security.dependabot_assessed', {
				path: '.github/dependabot.yml',
				totalProjects: 2,
				dailyOrWeekly: 2,
				monthlyOrOther: 0,
				hasGithubActions: true,
				hasJsEcosystem: true,
				weakProjects: [],
				score: 100,
				timestamp: iso(),
			}),
			'security.workflow_unauthorized': base('security.workflow_unauthorized', {
				workflowId: 'wf1',
				attemptedAction: 'deploy',
				requiredCapability: 'deployment:write',
				actor: 'user123',
				reason: 'missing capability',
				severity: 'high',
				timestamp: iso(),
			}),
		};

		for (const key of Object.keys(agentEventCatalog)) {
			const schema = agentEventCatalog[key as keyof typeof agentEventCatalog];
			const sample = samples[key];
			expect(sample, `Missing sample for event type ${key}`).toBeTruthy();
			const parsed = schema.parse(sample);
			expect(parsed.type).toBe(key);
		}
	});
});
