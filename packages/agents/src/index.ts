import { openai } from '@ai-sdk/openai';
import { Agent, Memory, VoltAgent } from '@voltagent/core';
import { LibSQLMemoryAdapter } from '@voltagent/libsql';
import { createPinoLogger } from '@voltagent/logger';
import { honoServer } from '@voltagent/server-hono';
// Workflows to be implemented once API is better understood
import {
	callMCPToolTool,
	componentHealthTool,
	getA2AStatsTool,
	getMCPServerCapabilitiesTool,
	getMemoryStatsTool,
	listAgentsTool,
	listMCPServersTool,
	retrieveMemoryTool,
	searchMemoriesTool,
	sendA2AMessageTool,
	storeMemoryTool,
	systemInfoTool,
	systemMetricsTool,
} from './tools';

// A2A Events and Bus for inter-package communication
export {
	type AgentsBusConfig,
	createAgentsBus,
	createAgentsSchemaRegistry,
} from './a2a.js';
export * from './events/agents-events.js';

// Create a logger instance
const logger = createPinoLogger({
	name: 'cortex-os-agent',
	level: 'info',
});

// Optional persistent memory (remove to use default in-memory)
const memory = new Memory({
	storage: new LibSQLMemoryAdapter({ url: 'file:./.voltagent/memory.db' }),
});

// All tools are now imported from the tools directory

// Create a specialized Cortex-OS agent
const cortexAgent = new Agent({
	name: 'cortex-os-agent',
	instructions: `You are a Cortex-OS system agent that helps users understand and interact with the Cortex-OS autonomous software behavior reasoning runtime.

Your capabilities include:
- Providing information about Cortex-OS architecture and components
- Checking system status and health
- Assisting with agent development and deployment
- Explaining A2A (Agent-to-Agent) communication patterns
- Guiding users through MCP (Model Context Protocol) integrations
- Helping with memory management and RAG implementations

Always be helpful, concise, and provide practical examples when possible.`,
	model: openai('gpt-4o-mini'),
	tools: [
		systemInfoTool,
		componentHealthTool,
		systemMetricsTool,
		sendA2AMessageTool,
		listAgentsTool,
		getA2AStatsTool,
		listMCPServersTool,
		callMCPToolTool,
		getMCPServerCapabilitiesTool,
		storeMemoryTool,
		retrieveMemoryTool,
		searchMemoriesTool,
		getMemoryStatsTool,
	],
	memory,
});

// Initialize VoltAgent with the agent
new VoltAgent({
	agents: {
		cortexAgent,
	},
	server: honoServer(),
	logger,
});
