import { describe, expect, it } from "vitest";
import { agentEventCatalog } from "@/events/agent-events.js";

const iso = () => new Date().toISOString();

describe("Event Contract: agentEventCatalog", () => {
	it("validates all known event schemas with sample payloads", () => {
		const samples: Record<string, any> = {
			"agent.started": {
				type: "agent.started",
				data: {
					agentId: "a",
					traceId: "t",
					capability: "documentation",
					input: {},
					timestamp: iso(),
				},
			},
			"agent.completed": {
				type: "agent.completed",
				data: {
					agentId: "a",
					traceId: "t",
					capability: "documentation",
					metrics: { latencyMs: 10, tokensUsed: 1, suggestionsCount: 0 },
					timestamp: iso(),
				},
			},
			"agent.failed": {
				type: "agent.failed",
				data: {
					agentId: "a",
					traceId: "t",
					capability: "documentation",
					error: "x",
					metrics: { latencyMs: 1 },
					timestamp: iso(),
				},
			},
			"provider.success": {
				type: "provider.success",
				data: {
					providerId: "p",
					modelId: "m",
					latencyMs: 1,
					tokensUsed: 2,
					timestamp: iso(),
				},
			},
			"provider.fallback": {
				type: "provider.fallback",
				data: {
					fromProvider: "p1",
					toProvider: "p2",
					reason: "timeout",
					timestamp: iso(),
				},
			},
			"system.thermal_throttle": {
				type: "system.thermal_throttle",
				data: { temperature: 90, throttleLevel: "severe", timestamp: iso() },
			},
			"system.memory_pressure": {
				type: "system.memory_pressure",
				data: { memoryUsage: 12, pressureLevel: "warning", timestamp: iso() },
			},
			"mcp.server_connected": {
				type: "mcp.server_connected",
				data: {
					serverId: "s1",
					serverName: "svc",
					capabilities: ["text-generation"],
					timestamp: iso(),
				},
			},
			"mcp.server_disconnected": {
				type: "mcp.server_disconnected",
				data: { serverId: "s1", reason: "bye", timestamp: iso() },
			},
			"workflow.started": {
				type: "workflow.started",
				data: { workflowId: "w1", name: "wf", tasksCount: 1, timestamp: iso() },
			},
			"workflow.completed": {
				type: "workflow.completed",
				data: {
					workflowId: "w1",
					status: "completed",
					metrics: {
						totalTime: 1,
						tasksCompleted: 1,
						tasksTotal: 1,
						agentsUsed: ["documentation"],
					},
					timestamp: iso(),
				},
			},
			"workflow.cancelled": {
				type: "workflow.cancelled",
				data: { workflowId: "w1", timestamp: iso() },
			},
			"security.dependabot_config_loaded": {
				type: "security.dependabot_config_loaded",
				data: {
					path: ".github/dependabot.yml",
					projects: [
						{
							packageEcosystem: "npm",
							directory: "/",
							scheduleInterval: "weekly",
						},
						{
							packageEcosystem: "github-actions",
							directory: "/",
							scheduleInterval: "weekly",
						},
					],
					timestamp: iso(),
				},
			},
			"security.dependabot_assessed": {
				type: "security.dependabot_assessed",
				data: {
					path: ".github/dependabot.yml",
					totalProjects: 2,
					dailyOrWeekly: 2,
					monthlyOrOther: 0,
					hasGithubActions: true,
					hasJsEcosystem: true,
					weakProjects: [],
					score: 100,
					timestamp: iso(),
				},
			},
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
