import { describe, expect, it } from 'vitest';
import { SecureCommandExecutor } from '../src/secure-executor.js';

describe('SecureCommandExecutor', () => {
	it('executes allowed command', async () => {
		const result = await SecureCommandExecutor.executeCommand(['echo', 'test']);
		expect(result.stdout.trim()).toBe('test');
		expect(result.exitCode).toBe(0);
	});

	it('rejects disallowed command', async () => {
		await expect(
			SecureCommandExecutor.executeCommand(['rm', '-rf', '/']),
		).rejects.toThrow();
	});

	it('allows configuration of limits', () => {
		SecureCommandExecutor.configure({
			maxConcurrentProcesses: 5,
			defaultTimeout: 1000,
		});
		expect(SecureCommandExecutor.getProcessStats().maxConcurrentProcesses).toBe(
			5,
		);
	});
});
