/**
 * brAInwav Cortex-OS Agent Server with LangGraphJS
 *
 * Production server implementing master-agent coordination
 * following the architecture diagram pattern.
 */

import { randomUUID } from 'node:crypto';
import { createAgentsBusIntegration } from './AgentsBusIntegration.js';
import { createMasterAgentGraph, type SubAgentConfig } from './MasterAgent.js';

// Define specialized sub-agents following your architecture diagram
const subAgents: SubAgentConfig[] = [
	{
		name: 'code-analysis-agent',
		description: 'Analyzes code quality, complexity, and maintainability',
		capabilities: ['code-analysis', 'quality-review', 'refactoring'],
		model_targets: ['glm-4.5-mlx', 'gpt-4o-mini'],
		tools: ['analyze_code', 'review_quality', 'suggest_improvements'],
		specialization: 'code-analysis',
	},
	{
		name: 'test-generation-agent',
		description: 'Generates comprehensive unit and integration tests',
		capabilities: ['test-generation', 'coverage-analysis', 'mocking'],
		model_targets: ['glm-4.5-mlx', 'claude-3-haiku'],
		tools: ['generate_tests', 'analyze_coverage', 'create_mocks'],
		specialization: 'test-generation',
	},
	{
		name: 'documentation-agent',
		description: 'Creates and maintains technical documentation',
		capabilities: ['documentation', 'markdown', 'api-docs'],
		model_targets: ['glm-4.5-mlx', 'gpt-4o-mini'],
		tools: ['write_docs', 'update_readme', 'generate_api_docs'],
		specialization: 'documentation',
	},
	{
		name: 'security-agent',
		description: 'Performs security analysis and vulnerability scanning',
		capabilities: ['security-analysis', 'vulnerability-scan', 'compliance'],
		model_targets: ['glm-4.5-mlx', 'claude-3-sonnet'],
		tools: ['scan_vulnerabilities', 'check_compliance', 'audit_security'],
		specialization: 'security',
	},
];

/**
 * Create and start the brAInwav agent system
 */
const startAgentSystem = async () => {
	console.log('🚀 Starting brAInwav Cortex-OS Agent System...');

	// Initialize A2A Bus Integration
	const busIntegration = createAgentsBusIntegration();
	await busIntegration.initialize();

	// Create master agent with LangGraphJS
	const masterAgent = createMasterAgentGraph({
		name: 'brAInwav-MasterAgent',
		subAgents,
		mcpEndpoint: process.env.MCP_ENDPOINT || 'http://localhost:3001/mcp',
	});

	// Notify A2A bus about agent creation
	for (const agent of subAgents) {
		const agentId = randomUUID();
		await busIntegration.notifyAgentCreated(agentId, agent.specialization, agent.capabilities);
	}

	console.log(`✅ Master agent initialized with ${subAgents.length} sub-agents:`);
	for (const agent of subAgents) {
		console.log(`   📋 ${agent.name} - ${agent.description}`);
	}

	// Test the coordination workflow
	console.log('\n🧪 Testing agent coordination...');

	const testCases = [
		'Please analyze this code for quality issues',
		'Generate unit tests for the MasterAgent class',
		'Update the README with installation instructions',
		'Scan for security vulnerabilities in the authentication module',
	];

	for (const testCase of testCases) {
		try {
			console.log(`\n🔄 Processing: "${testCase}"`);
			const result = await masterAgent.coordinate(testCase);
			console.log(`   ✅ Agent: ${result.currentAgent}`);
			console.log(`   📊 Result: ${JSON.stringify(result.result, null, 2)}`);
		} catch (error) {
			console.error(`   ❌ Error: ${error}`);
		}
	}

	console.log('\n🎉 brAInwav Agent System is ready!');
	return masterAgent;
};

// Start the system
if (import.meta.url === `file://${process.argv[1]}`) {
	startAgentSystem()
		.then(() => {
			console.log('📡 Agent system running. Press Ctrl+C to stop.');
		})
		.catch((error) => {
			console.error('💥 Failed to start agent system:', error);
			process.exit(1);
		});
}

export { startAgentSystem };
