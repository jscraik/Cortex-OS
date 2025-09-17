import { AgentRegistry } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import { honoServer } from '@voltagent/server-hono';
import { CortexAgent } from './src';

const logger = createPinoLogger({ name: 'CortexAgentServer' });

// Create and initialize Agent Registry
const agentRegistry = AgentRegistry.getInstance();
agentRegistry.initialize();

// Create Cortex Agent instance
const agent = new CortexAgent({
	name: 'CortexAgent',
	cortex: {
		enableMLX: true,
		apiProviders: {
			openai: {
				apiKey: process.env.OPENAI_API_KEY || '',
				baseURL: process.env.OPENAI_BASE_URL,
			},
		},
	},
});

// Register the agent with the registry
agentRegistry.registerAgent(agent);

// Create server provider
const serverProvider = honoServer({
	port: parseInt(process.env.PORT || '4310', 10),
	enableSwaggerUI: true,
});

// Create server with agent registry
const server = serverProvider({
	agentRegistry,
	logger,
});

// Start server
logger.info(`Starting CortexAgent server on port ${process.env.PORT || 4310}`);
server.start();
