/**
 * Cerebrum Agent Demo - LangGraphJS Implementation
 *
 * Demonstrates the new architecture following the diagram pattern:
 * User Input → Cerebrum Master Agent → Specialized Sub-Agents → Tool Layer → Execution Surface
 *
 * Co-authored-by: brAInwav Development Team
 */

import {
	type CerebrumConfig,
	createCerebrumAgent,
	createCoordinationAgent,
	createExecutionSurfaceAgent,
	createIntelligenceSchedulerAgent,
	createToolLayerAgent,
} from '../src/index.js';

/**
 * Demo configuration following the architecture diagram
 */
const demoConfig: CerebrumConfig = {
	name: 'cerebrum-demo-agent',
	subAgents: [
		{
			name: 'intelligence-scheduler-agent',
			specialization: 'intelligence-scheduler',
			description: 'Intelligent task analysis and scheduling coordinator',
			capabilities: ['analysis', 'planning', 'scheduling', 'routing'],
			model_targets: ['glm-4.5-mlx'],
			tools: ['analyzer', 'scheduler', 'router'],
			priority: 10,
		},
		{
			name: 'tool-layer-agent',
			specialization: 'tool-layer',
			description: 'Tool execution and dashboard management specialist',
			capabilities: ['tool-execution', 'dashboard', 'validation', 'monitoring'],
			model_targets: ['glm-4.5-mlx'],
			tools: ['tool-executor', 'dashboard', 'validator', 'monitor'],
			priority: 8,
		},
		{
			name: 'execution-surface-agent',
			specialization: 'execution-surface',
			description: 'External system integration and execution specialist',
			capabilities: ['deployment', 'networking', 'file-system', 'git-operations'],
			model_targets: ['glm-4.5-mlx'],
			tools: ['deployer', 'network-connector', 'fs-manager', 'git-client'],
			priority: 7,
		},
		{
			name: 'coordination-agent',
			specialization: 'coordination',
			description: 'Cross-agent coordination and workflow management',
			capabilities: ['coordination', 'workflow', 'communication', 'synchronization'],
			model_targets: ['glm-4.5-mlx'],
			tools: ['coordinator', 'workflow-manager', 'communicator'],
			priority: 6,
		},
	],
	enableStreaming: true,
	maxRetries: 3,
	timeout: 60000,
};

/**
 * Main demo function
 */
async function runCerebrumDemo(): Promise<void> {
	console.log('🧠 Starting Cerebrum Agent Demo - brAInwav Cortex-OS');
	console.log('='.repeat(60));

	try {
		// Create Cerebrum master agent
		const cerebrumAgent = createCerebrumAgent(demoConfig);
		console.log('✅ Cerebrum master agent created successfully');

		// Setup event listeners
		cerebrumAgent.on('update', (state) => {
			console.log(`📊 State update: ${state.currentStep}`);
		});

		cerebrumAgent.on('error', (error) => {
			console.error('❌ Cerebrum error:', error);
		});

		// Test different types of tasks
		const testCases = [
			{
				name: 'Intelligence Analysis Task',
				input: 'Analyze the current system performance and create an optimization plan',
				description: 'Should route to Intelligence & Scheduler Agent',
			},
			{
				name: 'Tool Execution Task',
				input: 'Execute validation tools and update the dashboard with results',
				description: 'Should route to Tool Layer Agent',
			},
			{
				name: 'Deployment Task',
				input: 'Deploy the latest version to the production environment',
				description: 'Should route to Execution Surface Agent',
			},
			{
				name: 'Coordination Task',
				input: 'Coordinate a complex multi-agent workflow for system upgrade',
				description: 'Should route to Coordination Agent',
			},
		];

		// Execute test cases
		for (const testCase of testCases) {
			console.log(`\n🔄 Running: ${testCase.name}`);
			console.log(`📝 Description: ${testCase.description}`);
			console.log(`💬 Input: "${testCase.input}"`);

			try {
				// Execute with streaming
				const result = await cerebrumAgent.execute(testCase.input, {
					stream: false, // Set to true to see streaming updates
					context: {
						testCase: testCase.name,
						timestamp: new Date().toISOString(),
					},
				});

				console.log('✅ Execution completed');
				console.log(`📍 Final step: ${result.currentStep}`);
				console.log(`🎯 Selected agent: ${result.selectedSubAgent || 'none'}`);
				console.log(`📊 Messages: ${result.messages.length}`);

				if (result.result) {
					console.log('📋 Result:', JSON.stringify(result.result, null, 2));
				}
			} catch (error) {
				console.error(`❌ Test case failed:`, error);
			}

			console.log('-'.repeat(40));
		}

		// Test health check
		console.log('\n🏥 Running health check...');
		const healthStatus = await cerebrumAgent.healthCheck();
		console.log('📊 Health Status:', JSON.stringify(healthStatus, null, 2));

		// Display sub-agent information
		console.log('\n🤖 Available Sub-Agents:');
		const subAgents = cerebrumAgent.getSubAgents();
		subAgents.forEach((agent, index) => {
			console.log(`${index + 1}. ${agent.name}`);
			console.log(`   Specialization: ${agent.specialization}`);
			console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
			console.log(`   Priority: ${agent.priority}`);
		});
	} catch (error) {
		console.error('💥 Demo failed:', error);
		process.exit(1);
	}

	console.log('\n✨ Cerebrum Demo completed successfully!');
}

/**
 * Demo individual sub-agents
 */
async function runSubAgentDemos(): Promise<void> {
	console.log('\n🔧 Testing Individual Sub-Agents');
	console.log('='.repeat(40));

	// Intelligence Scheduler Agent Demo
	console.log('\n🧠 Intelligence Scheduler Agent Demo');
	try {
		const intelligenceAgent = createIntelligenceSchedulerAgent();
		const result = await intelligenceAgent.execute('Plan a complex software development project');
		console.log('✅ Intelligence analysis completed');
		console.log(`📊 Result:`, JSON.stringify(result.result, null, 2));
	} catch (error) {
		console.error('❌ Intelligence agent failed:', error);
	}

	// Tool Layer Agent Demo
	console.log('\n🛠️ Tool Layer Agent Demo');
	try {
		const toolAgent = createToolLayerAgent();
		const result = await toolAgent.execute('Execute validation tools and monitor system');
		console.log('✅ Tool execution completed');
		console.log(`📊 Result:`, JSON.stringify(result.result, null, 2));
	} catch (error) {
		console.error('❌ Tool agent failed:', error);
	}

	// Execution Surface Agent Demo
	console.log('\n🚀 Execution Surface Agent Demo');
	try {
		const surfaceAgent = createExecutionSurfaceAgent();
		const result = await surfaceAgent.execute('Deploy application to production');
		console.log('✅ Surface execution completed');
		console.log(`📊 Result:`, JSON.stringify(result.result, null, 2));
	} catch (error) {
		console.error('❌ Surface agent failed:', error);
	}

	// Coordination Agent Demo
	console.log('\n🎭 Coordination Agent Demo');
	try {
		const coordinationAgent = createCoordinationAgent();
		const result = await coordinationAgent.execute('Coordinate multi-agent workflow');
		console.log('✅ Coordination completed');
		console.log(`📊 Result:`, JSON.stringify(result.result, null, 2));
	} catch (error) {
		console.error('❌ Coordination agent failed:', error);
	}
}

/**
 * Run the complete demo
 */
async function main(): Promise<void> {
	try {
		await runCerebrumDemo();
		await runSubAgentDemos();
	} catch (error) {
		console.error('💥 Main demo failed:', error);
		process.exit(1);
	}
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { runCerebrumDemo, main as runFullDemo, runSubAgentDemos };
