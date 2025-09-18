import express, { type Request, type Response } from 'express';
import type { TDDCoach } from '../TDDCoach.js';
import { createTDDCoach } from '../TDDCoach.js';
import type { ChangeSet } from '../types/TDDTypes.js';
import { InterventionLevel } from '../types/TDDTypes.js';
import { tddCoachMcpTools } from './tools.js';

/**
 * MCP Server for TDD Coach
 * Exposes TDD Coach tools via HTTP endpoints for AI system integration
 */

// Create Express app
const app: express.Application = express();
app.use(express.json());

// Initialize TDD Coach instance
const coach: TDDCoach = createTDDCoach({
	workspaceRoot: process.cwd(),
	config: {
		universalMode: true,
		defaultInterventionLevel: InterventionLevel.COACHING,
		adaptiveLearning: true,
	},
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
	res.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
	});
});

// Tools list endpoint
app.get('/tools/list', (_req: Request, res: Response) => {
	try {
		const tools = tddCoachMcpTools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
		}));

		res.json({
			tools,
		});
	} catch (error) {
		res.status(500).json({
			error: {
				type: 'tools_list_error',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
		});
	}
});

// Tool call endpoint
app.post('/tools/call', async (req: Request, res: Response) => {
	try {
		const { name, arguments: args } = req.body;

		if (!name) {
			return res.status(400).json({
				error: {
					type: 'invalid_request',
					message: 'Tool name is required',
				},
			});
		}

		// Find the tool
		const tool = tddCoachMcpTools.find((t) => t.name === name);
		if (!tool) {
			return res.status(404).json({
				error: {
					type: 'tool_not_found',
					message: `Tool '${name}' not found`,
				},
			});
		}

		// Validate arguments against schema
		if (tool.inputSchema && args) {
			try {
				tool.inputSchema.parse(args);
			} catch (validationError) {
				return res.status(400).json({
					error: {
						type: 'validation_error',
						message: 'Invalid arguments',
						details:
							validationError instanceof Error ? validationError.message : 'Validation failed',
					},
				});
			}
		}

		// Execute the tool based on its name
		let result: unknown;

		switch (name) {
			case 'analyze_test_coverage': {
				// Get current TDD status from the coach
				const status = await coach.getStatus();
				result = {
					coverage: status.testsStatus.passing + status.testsStatus.failing,
					totalTests: status.testsStatus.total,
					passingTests: status.testsStatus.passing,
					failingTests: status.testsStatus.failing,
					tddState: status.state,
					coachingMessage: status.coaching,
					lastUpdate: status.lastUpdate,
				};
				break;
			}

			case 'generate_test': {
				// For test generation, we'd need to implement actual test generation logic
				// This is a simplified example
				result = {
					message: 'Test generation functionality would be implemented here',
					sourceFile: args?.sourceFile || 'unknown',
					testType: args?.testType || 'unit',
					framework: args?.framework || 'vitest',
				};
				break;
			}

			case 'refactor_test': {
				result = {
					message: 'Test refactoring functionality would be implemented here',
					testFile: args?.testFile || 'unknown',
					improvements: args?.improvements || ['readability'],
				};
				break;
			}

			case 'validate_tdd_flow': {
				// Create a mock change set for validation
				const files = args?.files || [];
				const changeSet: ChangeSet = {
					files: files.map((file: string) => ({
						path: file,
						status: 'modified',
						diff: '',
						linesAdded: 0,
						linesDeleted: 0,
					})),
					totalChanges: files.length,
					timestamp: new Date().toISOString(),
					author: 'mcp-server',
				};

				// Validate the change through the TDD Coach
				const validationResponse = await coach.validateChange({
					proposedChanges: changeSet,
				});

				result = {
					allowed: validationResponse.allowed,
					tddState: validationResponse.state.current,
					coaching: {
						level: validationResponse.coaching.level,
						message: validationResponse.coaching.message,
						explanation: validationResponse.coaching.explanation,
						suggestedActions: validationResponse.coaching.suggestedActions,
					},
					metadata: validationResponse.metadata,
				};
				break;
			}

			case 'coach_recommendation': {
				// Get current status for recommendations
				const status = await coach.getStatus();
				result = {
					tddState: status.state,
					coachingMessage: status.coaching,
					recommendations: [
						'Follow the RED-GREEN-REFACTOR cycle',
						'Write tests before implementation',
						'Keep tests small and focused',
						status.coaching,
					],
					experience: args?.experience || 'intermediate',
					strategy: args?.testStrategy || 'tdd',
				};
				break;
			}

			default: {
				return res.status(404).json({
					error: {
						type: 'tool_not_implemented',
						message: `Tool '${name}' is defined but not implemented`,
					},
				});
			}
		}

		res.json({
			result,
		});
	} catch (error) {
		res.status(500).json({
			error: {
				type: 'tool_execution_error',
				message: error instanceof Error ? error.message : 'Unknown error during tool execution',
			},
		});
	}
});

// Start server
const PORT = process.env.TDD_COACH_MCP_PORT ? parseInt(process.env.TDD_COACH_MCP_PORT, 10) : 8007;
app.listen(PORT, '0.0.0.0', () => {
	console.log(`TDD Coach MCP Server listening on http://0.0.0.0:${PORT}`);
	console.log(`Health check: http://0.0.0.0:${PORT}/health`);
	console.log(`Tools list: http://0.0.0.0:${PORT}/tools/list`);
	console.log(`Access via Cloudflare tunnel at: https://tddcoach-mcp.brainwav.io`);
});

export default app;
