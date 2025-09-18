export interface AgentInfo {
	id: string;
	capabilities: string[];
	currentLoad: number;
}

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface AgentSelectionResult {
	agentId: string;
	reasoning: string;
	confidence: number;
}

export function buildAgentPrompt(
	taskDescription: string,
	availableAgents: AgentInfo[],
	urgency: Urgency = 'medium',
): string {
	const agentInfo = availableAgents
		.map(
			(a) =>
				`${a.id}: capabilities=[${a.capabilities.join(', ')}], load=${a.currentLoad}%`,
		)
		.join('\n');

	return `Select the best agent for this task:

TASK: ${taskDescription}
URGENCY: ${urgency}

AVAILABLE AGENTS:
${agentInfo}

Consider:
- Agent capabilities vs task requirements
- Current workload distribution
- Task urgency
- Specialization match

Select agent ID and explain reasoning.`;
}

export function parseAgentSelection(
	content: string,
	agents: AgentInfo[],
): AgentSelectionResult {
	// Helper to escape regex special characters in agent IDs
	function escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	const agentMention = agents.find((a) => {
		const regex = new RegExp(`\\b${escapeRegExp(a.id)}\\b`);
		return regex.test(content);
	});

	return {
		agentId: agentMention?.id ?? agents[0]?.id ?? 'default',
		reasoning: content.trim(),
		confidence: 0.7,
	};
}
