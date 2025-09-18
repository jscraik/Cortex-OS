// Using vitest syntax instead of jest globals

describe('CortexAgent Dependencies', () => {
	it('should import without errors', () => {
		expect(() => import('../src/CortexAgent')).not.toThrow();
	});

	it('should export expected interface', async () => {
		const { CortexAgent } = await import('../src/CortexAgent');
		expect(typeof CortexAgent).toBe('function');
	});

	it('should have required constructor parameters', async () => {
		const { CortexAgent } = await import('../src/CortexAgent');

		// Should require config parameter
		expect(() => {
			// @ts-expect-error - Testing without required parameter
			new CortexAgent();
		}).toThrow();
	});

	it('should accept valid configuration', async () => {
		const { CortexAgent } = await import('../src/CortexAgent');
		const config = {
			name: 'test-agent',
			model: 'test-model',
		};

		expect(() => {
			new CortexAgent(config);
		}).not.toThrow();
	});
});
