/**
 * Agent Toolkit Integration Demo
 *
 * Demonstrates the comprehensive integration of @cortex-os/agent-toolkit
 * with the agents package, showcasing code analysis, validation, and
 * transformation workflows alongside AGUI functionality.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { createCerebrumAgent } from '../src/CerebrumAgent';
import { createAgentToolkitBusIntegration } from '../src/integrations/AgentToolkitBusIntegration.js';
import { createToolLayerAgent } from '../src/subagents/ToolLayerAgent.js';

/**
 * Comprehensive Agent Toolkit Integration Demo
 */
async function runAgentToolkitDemo() {
	console.log('🔧 Agent Toolkit Integration Demo\n');

	// Demo 1: Code Search Workflow
	await demoCodeSearch();

	// Demo 2: Code Modification Workflow
	await demoCodeModification();

	// Demo 3: Code Validation Workflow
	await demoCodeValidation();

	// Demo 4: Comprehensive Code Analysis
	await demoComprehensiveAnalysis();

	// Demo 5: Agent Toolkit + AGUI Integration
	await demoAgentToolkitWithAGUI();

	// Demo 6: A2A Event Integration
	await demoA2AEventIntegration();

	console.log('✅ Agent Toolkit Integration Demo completed successfully!');
}

/**
 * Demo 1: Code Search Workflow
 */
async function demoCodeSearch() {
	console.log('📍 Demo 1: Code Search Workflow');

	const cerebrum = createCerebrumAgent({
		name: 'demo-cerebrum-agent',
		enableAGUI: true,
	});

	try {
		// Search for TypeScript function patterns
		console.log('  🔍 Searching for function patterns...');
		const searchId = await cerebrum.searchCode({
			pattern: 'function\\s+\\w+\\s*\\(',
			path: './src',
			toolType: 'multi_search',
		});
		console.log(`  ✓ Search initiated with ID: ${searchId}`);

		// Search for error handling patterns
		console.log('  🔍 Searching for error handling patterns...');
		const errorSearchId = await cerebrum.searchCode({
			pattern: 'try.*catch|throw.*Error',
			path: './src',
			toolType: 'search',
		});
		console.log(`  ✓ Error pattern search initiated with ID: ${errorSearchId}`);

		// Search for imports and dependencies
		console.log('  🔍 Searching for import patterns...');
		const importSearchId = await cerebrum.searchCode({
			pattern: 'import.*from.*@cortex-os',
			path: './src',
			toolType: 'multi_search',
		});
		console.log(`  ✓ Import search initiated with ID: ${importSearchId}`);
	} catch (error) {
		console.error('  ❌ Code search demo failed:', error);
	}

	console.log('  ✅ Code search workflow completed\n');
}

/**
 * Demo 2: Code Modification Workflow
 */
async function demoCodeModification() {
	console.log('📍 Demo 2: Code Modification Workflow');

	const cerebrum = createCerebrumAgent({
		name: 'demo-cerebrum-agent',
		enableAGUI: true,
	});

	try {
		// Refactor console.log to proper logging
		console.log('  🔄 Refactoring console.log statements...');
		const codemodId1 = await cerebrum.modifyCode({
			find: 'console.log(:[args])',
			replace: 'logger.info(:[args])',
			path: './src',
		});
		console.log(`  ✓ Console.log refactoring initiated with ID: ${codemodId1}`);

		// Update error handling patterns
		console.log('  🔄 Updating error handling patterns...');
		const codemodId2 = await cerebrum.modifyCode({
			find: 'throw new Error(:[message])',
			replace: 'throw new ApplicationError(:[message])',
			path: './src',
		});
		console.log(`  ✓ Error handling update initiated with ID: ${codemodId2}`);

		// Modernize async/await patterns
		console.log('  🔄 Modernizing async patterns...');
		const codemodId3 = await cerebrum.modifyCode({
			find: '.then(:[callback])',
			replace: 'await :[callback]',
			path: './src',
		});
		console.log(`  ✓ Async modernization initiated with ID: ${codemodId3}`);
	} catch (error) {
		console.error('  ❌ Code modification demo failed:', error);
	}

	console.log('  ✅ Code modification workflow completed\n');
}

/**
 * Demo 3: Code Validation Workflow
 */
async function demoCodeValidation() {
	console.log('📍 Demo 3: Code Validation Workflow');

	const cerebrum = createCerebrumAgent({
		name: 'demo-cerebrum-agent',
		enableAGUI: true,
	});

	try {
		// Validate TypeScript files
		console.log('  ✅ Validating TypeScript files...');
		const validationId1 = await cerebrum.validateCode({
			files: ['./src/**/*.ts'],
			validators: ['eslint', 'tsc'],
		});
		console.log(`  ✓ TypeScript validation initiated with ID: ${validationId1}`);

		// Validate JavaScript files
		console.log('  ✅ Validating JavaScript files...');
		const validationId2 = await cerebrum.validateCode({
			files: ['./src/**/*.js'],
			validators: ['eslint'],
		});
		console.log(`  ✓ JavaScript validation initiated with ID: ${validationId2}`);

		// Comprehensive project validation
		console.log('  ✅ Running comprehensive validation...');
		const validationId3 = await cerebrum.validateCode({
			files: ['./src', './packages'],
			validators: ['multi-validator'],
		});
		console.log(`  ✓ Comprehensive validation initiated with ID: ${validationId3}`);
	} catch (error) {
		console.error('  ❌ Code validation demo failed:', error);
	}

	console.log('  ✅ Code validation workflow completed\n');
}

/**
 * Demo 4: Comprehensive Code Analysis
 */
async function demoComprehensiveAnalysis() {
	console.log('📍 Demo 4: Comprehensive Code Analysis');

	const cerebrum = createCerebrumAgent({
		name: 'demo-cerebrum-agent',
		enableAGUI: true,
	});

	try {
		// Security analysis
		console.log('  🔒 Running security analysis...');
		const securityResults = await cerebrum.analyzeCodeProject({
			projectPath: './src',
			analysisType: 'security',
			includeValidation: true,
			searchPatterns: ['eval\\s*\\(', 'innerHTML\\s*=', 'document\\.write', 'process\\.env\\.'],
		});
		console.log(`  ✓ Security analysis completed: ${JSON.stringify(securityResults)}`);

		// Quality analysis
		console.log('  📊 Running quality analysis...');
		const qualityResults = await cerebrum.analyzeCodeProject({
			projectPath: './src',
			analysisType: 'quality',
			includeValidation: true,
			searchPatterns: ['TODO|FIXME|HACK', 'console\\.log', 'debugger', 'any\\s*;'],
		});
		console.log(`  ✓ Quality analysis completed: ${JSON.stringify(qualityResults)}`);

		// Performance analysis
		console.log('  ⚡ Running performance analysis...');
		const performanceResults = await cerebrum.analyzeCodeProject({
			projectPath: './src',
			analysisType: 'performance',
			includeValidation: true,
			searchPatterns: [
				'for\\s*\\(.*\\.length',
				'while\\s*\\(true\\)',
				'setTimeout\\s*\\(',
				'setInterval\\s*\\(',
			],
		});
		console.log(`  ✓ Performance analysis completed: ${JSON.stringify(performanceResults)}`);
	} catch (error) {
		console.error('  ❌ Comprehensive analysis demo failed:', error);
	}

	console.log('  ✅ Comprehensive code analysis completed\n');
}

/**
 * Demo 5: Agent Toolkit + AGUI Integration
 */
async function demoAgentToolkitWithAGUI() {
	console.log('📍 Demo 5: Agent Toolkit + AGUI Integration');

	const cerebrum = createCerebrumAgent({
		name: 'demo-cerebrum-agent',
		enableAGUI: true,
		defaultUILayout: 'grid',
		maxUIComponents: 15,
	});

	try {
		// Create code analysis dashboard
		console.log('  🎨 Creating code analysis dashboard...');
		const dashboardId = await cerebrum.renderUIView({
			components: [],
			layout: 'grid',
			responsive: true,
		});
		console.log(`  ✓ Dashboard created with ID: ${dashboardId}`);

		// Create search results component
		console.log('  🎨 Creating search results component...');
		const searchComponentId = await cerebrum.createUIComponent({
			type: 'table',
			properties: {
				id: 'search-results-table',
				label: 'Code Search Results',
				columns: ['File', 'Line', 'Match', 'Context'],
				sortable: true,
				filterable: true,
			},
		});
		console.log(`  ✓ Search results component created with ID: ${searchComponentId}`);

		// Create validation results component
		console.log('  🎨 Creating validation results component...');
		const validationComponentId = await cerebrum.createUIComponent({
			type: 'chart',
			properties: {
				id: 'validation-chart',
				label: 'Code Quality Metrics',
				chartType: 'bar',
				data: [],
				responsive: true,
			},
		});
		console.log(`  ✓ Validation results component created with ID: ${validationComponentId}`);

		// Create code modification form
		console.log('  🎨 Creating code modification form...');
		const codemodFormId = await cerebrum.createUIComponent({
			type: 'form',
			properties: {
				id: 'codemod-form',
				label: 'Code Transformation',
				fields: [
					{ name: 'find', type: 'textarea', label: 'Find Pattern', required: true },
					{ name: 'replace', type: 'textarea', label: 'Replace Pattern', required: true },
					{ name: 'path', type: 'input', label: 'Target Path', required: true },
				],
				submitLabel: 'Apply Transformation',
			},
		});
		console.log(`  ✓ Code modification form created with ID: ${codemodFormId}`);

		// Simulate user interactions
		console.log('  👆 Simulating user interactions...');
		await cerebrum.handleUserInteraction({
			componentId: searchComponentId,
			action: 'search',
			value: { pattern: 'function', path: './src' },
		});

		await cerebrum.handleUserInteraction({
			componentId: codemodFormId,
			action: 'submit',
			value: {
				find: 'console.log',
				replace: 'logger.info',
				path: './src',
			},
		});
	} catch (error) {
		console.error('  ❌ Agent Toolkit + AGUI integration demo failed:', error);
	}

	console.log('  ✅ Agent Toolkit + AGUI integration completed\n');
}

/**
 * Demo 6: A2A Event Integration
 */
async function demoA2AEventIntegration() {
	console.log('📍 Demo 6: A2A Event Integration');

	try {
		// Create agent toolkit bus integration
		console.log('  🚌 Creating A2A bus integration...');
		const busIntegration = createAgentToolkitBusIntegration('demo-agent');

		// Set up event listeners
		busIntegration.on('search:started', (event) => {
			console.log(`  📡 Search started event received: ${event.searchId}`);
		});

		busIntegration.on('search:completed', (event) => {
			console.log(
				`  📡 Search completed event received: ${event.searchId} (${event.results.totalMatches} matches)`,
			);
		});

		busIntegration.on('codemod:started', (event) => {
			console.log(`  📡 Codemod started event received: ${event.codemodId}`);
		});

		busIntegration.on('codemod:completed', (event) => {
			console.log(
				`  📡 Codemod completed event received: ${event.codemodId} (${event.results.filesModified} files modified)`,
			);
		});

		busIntegration.on('validation:started', (event) => {
			console.log(`  📡 Validation started event received: ${event.validationId}`);
		});

		busIntegration.on('validation:completed', (event) => {
			console.log(
				`  📡 Validation completed event received: ${event.validationId} (${event.results.totalIssues} issues found)`,
			);
		});

		// Test event publishing
		console.log('  📤 Publishing test events...');

		await busIntegration.publishSearchStarted({
			searchId: 'demo-search-1',
			pattern: 'test-pattern',
			path: './src',
			toolType: 'search',
			requestedBy: 'demo-agent',
		});

		await busIntegration.publishCodemodStarted({
			codemodId: 'demo-codemod-1',
			find: 'old-pattern',
			replace: 'new-pattern',
			path: './src',
			requestedBy: 'demo-agent',
		});

		await busIntegration.publishValidationStarted({
			validationId: 'demo-validation-1',
			files: ['./src/test.ts'],
			validators: ['eslint'],
			requestedBy: 'demo-agent',
		});

		// Wait for events to process
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Get event statistics
		const stats = busIntegration.getEventStats();
		console.log(`  📊 Event statistics: ${JSON.stringify(stats)}`);

		// Get event history
		const history = busIntegration.getEventHistory();
		console.log(`  📜 Event history: ${history.length} events recorded`);
	} catch (error) {
		console.error('  ❌ A2A event integration demo failed:', error);
	}

	console.log('  ✅ A2A event integration completed\n');
}

/**
 * Demo Tool Layer Agent with Agent Toolkit
 */
async function demoToolLayerWithAgentToolkit() {
	console.log('📍 Demo: Tool Layer Agent with Agent Toolkit');

	try {
		// Create enhanced tool layer agent
		const toolAgent = createToolLayerAgent({
			name: 'demo-tool-agent',
			enableAGUI: true,
			enableAgentToolkit: true,
			allowedTools: [
				'agent_toolkit_search',
				'agent_toolkit_multi_search',
				'agent_toolkit_codemod',
				'agent_toolkit_validate',
				'validator',
				'monitor',
			],
			codeSearchPaths: ['./src', './packages'],
			validationEnabled: true,
		});

		// Test code search through tool layer
		console.log('  🔍 Testing code search through tool layer...');
		const searchResult = await toolAgent.execute('search for function patterns in ./src');
		console.log(`  ✓ Search result: ${JSON.stringify(searchResult.result)}`);

		// Test code validation through tool layer
		console.log('  ✅ Testing code validation through tool layer...');
		const validationResult = await toolAgent.execute('validate code quality in ./src');
		console.log(`  ✓ Validation result: ${JSON.stringify(validationResult.result)}`);

		// Test code modification through tool layer
		console.log('  🔄 Testing code modification through tool layer...');
		const codemodResult = await toolAgent.execute('refactor console.log to logger.info in ./src');
		console.log(`  ✓ Codemod result: ${JSON.stringify(codemodResult.result)}`);

		// Get tool capabilities
		const capabilities = toolAgent.getCapabilities();
		console.log(`  🛠 Tool capabilities: ${capabilities.join(', ')}`);

		// Get available tools
		const availableTools = toolAgent.getAvailableTools();
		console.log(`  🔧 Available tools: ${availableTools.join(', ')}`);

		// Health check
		const health = await toolAgent.healthCheck();
		console.log(`  ❤️ Health status: ${JSON.stringify(health)}`);
	} catch (error) {
		console.error('  ❌ Tool layer agent demo failed:', error);
	}

	console.log('  ✅ Tool layer agent with agent toolkit completed\n');
}

// Export demo functions for use in tests or other examples
export {
	demoA2AEventIntegration,
	demoAgentToolkitWithAGUI,
	demoCodeModification,
	demoCodeSearch,
	demoCodeValidation,
	demoComprehensiveAnalysis,
	demoToolLayerWithAgentToolkit,
	runAgentToolkitDemo,
};

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runAgentToolkitDemo().catch(console.error);
}
