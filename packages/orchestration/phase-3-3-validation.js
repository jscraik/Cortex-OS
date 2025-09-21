#!/usr/bin/env node

/**
 * Phase 3.3: Execution Tool Layer - Validation Script
 * Testing direct execution capabilities including file system operations, process management, and tool chaining
 */

const { ExecutionToolLayer } = require('./dist/master-agent-loop/execution-tool-layer.js');

async function validateExecutionToolLayer() {
	console.log('🚀 Phase 3.3: Execution Tool Layer Validation\n');

	const executionLayer = new ExecutionToolLayer();
	let testsPassed = 0;
	let testsTotal = 0;

	const test = (name, condition) => {
		testsTotal++;
		if (condition) {
			console.log(`✅ ${name}`);
			testsPassed++;
		} else {
			console.log(`❌ ${name}`);
		}
	};

	try {
		// Test 1: Layer Initialization
		test(
			'Execution layer should initialize with correct capabilities',
			executionLayer.getCapabilities().includes('execution'),
		);

		// Test 2: Tool Registration
		const availableTools = executionLayer.getAvailableTools();
		test('Should register 5 execution tools', availableTools.length === 5);

		const expectedTools = [
			'file-system-operation',
			'process-management',
			'network-operation',
			'tool-chain-executor',
			'resource-manager',
		];

		expectedTools.forEach((toolId) => {
			test(`Should register ${toolId}`, availableTools.includes(toolId));
		});

		// Test 3: File System Operations
		console.log('\n📁 Testing File System Operations:');

		const fileReadResult = await executionLayer.invoke('file-system-operation', {
			operation: 'read',
			path: '/tmp/test.txt',
			encoding: 'utf8',
		});

		test('File read should return content', fileReadResult.success && fileReadResult.content);

		const fileWriteResult = await executionLayer.invoke('file-system-operation', {
			operation: 'write',
			path: '/tmp/newfile.txt',
			content: 'test content',
		});

		test(
			'File write should succeed',
			fileWriteResult.success && fileWriteResult.metadata.bytesWritten >= 0,
		);

		// Test 4: Process Management
		console.log('\n⚙️ Testing Process Management:');

		const processResult = await executionLayer.invoke('process-management', {
			action: 'execute',
			command: 'echo',
			args: ['hello', 'world'],
			securityPolicy: 'restricted',
		});

		test('Process execution should succeed', processResult.success && processResult.exitCode === 0);

		const monitorResult = await executionLayer.invoke('process-management', {
			action: 'monitor',
			processId: 1234,
		});

		test(
			'Process monitoring should return status',
			monitorResult.success && monitorResult.processInfo,
		);

		// Test 5: Network Operations
		console.log('\n🌐 Testing Network Operations:');

		const httpResult = await executionLayer.invoke('network-operation', {
			type: 'http',
			url: 'https://api.example.com/test',
			method: 'GET',
			timeout: 5000,
		});

		test('HTTP request should succeed', httpResult.success && httpResult.statusCode === 200);

		const pingResult = await executionLayer.invoke('network-operation', {
			type: 'ping',
			host: 'localhost',
			count: 3,
		});

		test(
			'Ping operation should succeed',
			pingResult.success && pingResult.packetsTransmitted === 3,
		);

		// Test 6: Tool Chain Execution
		console.log('\n🔗 Testing Tool Chain Execution:');

		const chainResult = await executionLayer.invoke('tool-chain-executor', {
			id: 'test-chain',
			steps: [
				{
					id: 'step1',
					tool: 'file-system-operation',
					input: { operation: 'read', path: '/tmp/input.txt' },
					dependencies: [],
				},
				{
					id: 'step2',
					tool: 'process-management',
					input: { action: 'execute', command: 'echo', args: ['processed'] },
					dependencies: ['step1'],
				},
			],
			parallelExecution: false,
			enableRollback: true,
		});

		test(
			'Tool chain execution should succeed',
			chainResult.success && chainResult.stepsExecuted === 2,
		);

		// Test 7: Resource Management
		console.log('\n📊 Testing Resource Management:');

		const resourceResult = await executionLayer.invoke('resource-manager', {
			action: 'monitor',
		});

		test(
			'Resource monitoring should return metrics',
			resourceResult.success && resourceResult.resources,
		);

		const limitResult = await executionLayer.invoke('resource-manager', {
			action: 'enforce-limits',
			processId: 1234,
			limits: {
				maxMemory: '512MB',
				maxCpu: '50%',
				maxDiskIo: '100MB/s',
			},
		});

		test(
			'Resource limit enforcement should succeed',
			limitResult.success && limitResult.limitsApplied,
		);

		// Test 8: Security Validation
		console.log('\n🔒 Testing Security Validation:');

		try {
			await executionLayer.invoke('file-system-operation', {
				operation: 'read',
				path: '/etc/passwd',
			});
			test('Should reject dangerous file paths', false);
		} catch (error) {
			test('Should reject dangerous file paths', error.message.includes('security violation'));
		}

		try {
			await executionLayer.invoke('process-management', {
				action: 'execute',
				command: 'rm',
				args: ['-rf', '/'],
				securityPolicy: 'restricted',
			});
			test('Should reject dangerous commands', false);
		} catch (error) {
			test('Should reject dangerous commands', error.message.includes('security violation'));
		}

		// Test 9: Performance Metrics
		console.log('\n📈 Testing Performance Metrics:');

		const metrics = executionLayer.getExecutionMetrics();
		test('Should track execution metrics', metrics.totalExecutions > 0);

		test('Should track tool usage', Object.keys(metrics.toolUsage).length > 0);

		// Test 10: Layer Health
		console.log('\n💚 Testing Layer Health:');

		const health = executionLayer.getLayerHealth();
		test('Should report layer health status', health.status && health.errorRate !== undefined);
	} catch (error) {
		console.error('\n❌ Validation error:', error.message);
		console.error('Stack:', error.stack);
	}

	// Summary
	console.log(`\n📋 Validation Summary:`);
	console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
	console.log(`📊 Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);

	if (testsPassed === testsTotal) {
		console.log('\n🎉 Phase 3.3: Execution Tool Layer Implementation Complete!');
		console.log('✨ All direct execution capabilities validated successfully');
		return true;
	} else {
		console.log('\n⚠️  Some validation tests failed. Please review the implementation.');
		return false;
	}
}

// Run validation
validateExecutionToolLayer()
	.then((success) => process.exit(success ? 0 : 1))
	.catch((error) => {
		console.error('Validation script error:', error);
		process.exit(1);
	});
