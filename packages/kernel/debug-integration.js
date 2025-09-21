import { CortexKernel } from './dist/index.js';

async function debugIntegrationTest() {
	const blueprint = {
		title: 'Integration Test Project',
		description: 'A test project to validate kernel integration',
		requirements: [
			'Feature A',
			'Feature B',
			'Testing',
			'Security authentication',
			'User interface design',
			'Architecture design',
			'Accessibility compliance'
		],
	};

	console.log('Running debug integration test...');

	const kernel = new CortexKernel();

	const result = await kernel.runPRPWorkflow(blueprint, {
		runId: 'debug-test-001',
	});

	console.log('Final result gates:');
	console.log('G0:', result.gates.G0);
	console.log('G2:', result.gates.G2);
	console.log('G5:', result.gates.G5);

	if (result.gates.G5?.status === 'failed') {
		console.log('G5 automated checks:', result.gates.G5.automatedChecks);
	}
}

debugIntegrationTest().catch(console.error);