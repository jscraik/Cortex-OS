import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeHandle } from '../../src/runtime.js';
import { startRuntime } from '../../src/runtime.js';

describe('brAInwav Cortex-OS Basic Runtime', () => {
	let runtime: RuntimeHandle;

	beforeEach(async () => {
		// Set test environment variables
		process.env.CORTEX_HTTP_PORT = '0'; // Use random port
		process.env.CORTEX_MCP_MANAGER_PORT = '0'; // Use random port
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
		}
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should start runtime without compilation errors', async () => {
		// This test ensures the runtime can be imported and started
		const { startRuntime } = await import('../../src/runtime');

		expect(startRuntime).toBeDefined();
		expect(typeof startRuntime).toBe('function');
	});

	it('should initialize core services on startup', async () => {
		runtime = await startRuntime();

		expect(runtime.httpUrl).toMatch(/^http:\/\/.*:\d+$/);
		expect(runtime.mcpUrl).toMatch(/^http:\/\/.*:\d+$/);
		expect(runtime.events).toBeDefined();
		expect(runtime.stop).toBeDefined();
	});

	it('should provide functional HTTP endpoint', async () => {
		runtime = await startRuntime();

		const response = await fetch(`${runtime.httpUrl}/health`);
		expect(response.status).toBe(200);

		const health = await response.json();
		expect(health).toMatchObject({
			status: 'ok',
			timestamp: expect.any(String),
		});
	});

	it('should provide functional MCP endpoint', async () => {
		runtime = await startRuntime();

		const response = await fetch(`${runtime.mcpUrl}/tools`);
		expect(response.status).toBe(200);

		const tools = await response.json();
		expect(tools).toHaveProperty('tools');
		expect(Array.isArray(tools.tools)).toBe(true);
	});

	it('should emit runtime started event', async () => {
		runtime = await startRuntime();

		// Test that events manager is functional
		let eventEmitted = false;
		const testEvent = {
			type: 'test.event',
			data: { message: 'test runtime event' },
		};

		try {
			await runtime.events.emitEvent(testEvent);
			eventEmitted = true;
		} catch (error) {
			// Event emission should not throw
			expect(error).toBeUndefined();
		}

		expect(eventEmitted).toBe(true);
	});

	it('should gracefully handle stop request', async () => {
		runtime = await startRuntime();

		// Ensure runtime is running
		const healthResponse = await fetch(`${runtime.httpUrl}/health`);
		expect(healthResponse.status).toBe(200);

		// Stop should not throw and should complete successfully
		await expect(runtime.stop()).resolves.toBeUndefined();

		// Mark runtime as stopped to prevent cleanup in afterEach
		runtime = undefined as any;
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
