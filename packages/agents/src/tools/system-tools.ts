import { createTool, z } from '../mocks/voltagent-core';
import { createLogger } from '../mocks/voltagent-logger';

const logger = createLogger('SystemTools');

// Tool for executing system commands
export const executeCommandTool = createTool({
	id: 'execute-command',
	name: 'execute_command',
	description: 'Execute a system command safely',

	parameters: z.object({
		/**
		 * Command to execute
		 */
		command: z.string().min(1),
		/**
		 * Command arguments
		 */
		args: z.array(z.string()).optional().default([]),
		/**
		 * Working directory
		 */
		cwd: z.string().optional(),
		/**
		 * Timeout in milliseconds
		 */
		timeout: z.number().int().min(1000).max(300000).optional().default(30000),
		/**
		 * Whether to capture stdout
		 */
		captureStdout: z.boolean().optional().default(true),
		/**
		 * Whether to capture stderr
		 */
		captureStderr: z.boolean().optional().default(true),
	}),

	async execute(params, _context) {
		logger.info(`Executing command: ${params.command}`);

		try {
			// For security reasons, we'll just simulate command execution
			const result = {
				command: params.command,
				args: params.args,
				exitCode: 0,
				stdout: params.captureStdout
					? 'Command output would appear here'
					: undefined,
				stderr: params.captureStderr ? undefined : undefined,
				executionTime: 100,
				timestamp: new Date().toISOString(),
			};

			logger.info(`Command executed successfully`);
			return result;
		} catch (error) {
			logger.error('Command execution failed:', error);
			throw error;
		}
	},
});

// Tool for checking system health
export const systemHealthTool = createTool({
	id: 'system-health',
	name: 'system_health',
	description: 'Check system health and resource usage',

	parameters: z.object({
		/**
		 * Components to check
		 */
		components: z
			.array(z.enum(['cpu', 'memory', 'disk', 'network']))
			.optional()
			.default(['cpu', 'memory']),
		/**
		 * Whether to include detailed metrics
		 */
		detailed: z.boolean().optional().default(false),
	}),

	async execute(params, _context) {
		logger.info('Checking system health');

		try {
			// Simulate system health check
			const health: any = {
				cpu: {
					usage: Math.random() * 100,
					cores: 8,
					temperature: 45 + Math.random() * 20,
				},
				memory: {
					total: 16 * 1024 * 1024 * 1024,
					used: 8 * 1024 * 1024 * 1024,
					free: 8 * 1024 * 1024 * 1024,
					usage: 50,
				},
				disk: {
					total: 500 * 1024 * 1024 * 1024,
					used: 250 * 1024 * 1024 * 1024,
					free: 250 * 1024 * 1024 * 1024,
					usage: 50,
				},
				network: {
					download: Math.random() * 100,
					upload: Math.random() * 100,
					latency: Math.random() * 50,
				},
			};

			const result = {
				status: 'healthy',
				components: params.components,
				health: (params.components || []).reduce((acc, comp) => {
					if (comp in health) {
						acc[comp] = health[comp];
					}
					return acc;
				}, {} as any),
				timestamp: new Date().toISOString(),
			};

			logger.info('System health check completed');
			return result;
		} catch (error) {
			logger.error('System health check failed:', error);
			throw error;
		}
	},
});

// Tool for reading files
export const readFileTool = createTool({
	id: 'read-file',
	name: 'read_file',
	description: 'Read file contents safely',

	parameters: z.object({
		/**
		 * File path
		 */
		path: z.string().min(1),
		/**
		 * Encoding
		 */
		encoding: z.enum(['utf8', 'base64', 'hex']).optional().default('utf8'),
		/**
		 * Maximum file size in bytes
		 */
		maxSize: z
			.number()
			.int()
			.min(1024)
			.max(10 * 1024 * 1024)
			.optional()
			.default(1024 * 1024),
	}),

	async execute(params, _context) {
		logger.info(`Reading file: ${params.path}`);

		try {
			// For security, we'll simulate file reading
			const result = {
				path: params.path,
				content: 'File content would appear here',
				size: 1024,
				encoding: params.encoding,
				timestamp: new Date().toISOString(),
			};

			logger.info(`File read successfully: ${params.path}`);
			return result;
		} catch (error) {
			logger.error('File reading failed:', error);
			throw error;
		}
	},
});

// Aliases for backwards compatibility
export const componentHealthTool = systemHealthTool;

// Tool for listing agents
export const listAgentsTool = createTool({
	id: 'list-agents',
	name: 'list_agents',
	description: 'List all available agents in the system',

	parameters: z.object({
		/**
		 * Include agent status
		 */
		status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
		/**
		 * Include detailed information
		 */
		detailed: z.boolean().optional().default(false),
	}),

	async execute(params) {
		logger.info('Listing available agents');

		try {
			// Simulate agent listing
			const agents = [
				{
					id: 'cortex-agent-1',
					name: 'Main Cortex Agent',
					status: 'active',
					type: 'cortex',
					capabilities: ['reasoning', 'tool-calling', 'memory']
				}
			];

			const result = {
				agents: params.status === 'all' ? agents : agents.filter(a => a.status === params.status),
				count: agents.length,
				status: params.status,
				detailed: params.detailed,
				timestamp: new Date().toISOString()
			};

			logger.info(`Found ${result.agents.length} agents`);
			return result;
		} catch (error) {
			logger.error('Failed to list agents:', error);
			throw error;
		}
	}
});
