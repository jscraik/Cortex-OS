import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configManager } from '../src/config.js';
import { formatCurrent, getCurrent, listAdapters, setCurrent } from '../src/models.js';

// Mock guardShell for testing
const guardShell = async (
	_command: string,
	operation: () => Promise<string>,
	options: {
		modeOverride?: 'plan' | 'auto';
		logger?: { info: () => void; warn: () => void };
	},
): Promise<{ executed: boolean; result?: string }> => {
	if (options.modeOverride === 'plan') {
		return { executed: false };
	}
	const result = await operation();
	return { executed: true, result };
};

beforeEach(async () => {
	// Store original config for restoration
});

afterEach(async () => {
	await configManager.reset();
});

describe('ConfigManager', () => {
	it('sets and retrieves values', async () => {
		await configManager.set('test.value', 42);
		const val = await configManager.getValue('test.value');
		expect(val).toBe(42);
	});
});

describe('Models', () => {
	it('manages current model', async () => {
		const adapters = await listAdapters();
		expect(adapters.some((a) => a.id === 'mlx')).toBe(true);
		await setCurrent('openai', 'gpt-4o-mini');
		const current = await getCurrent();
		expect(formatCurrent(current)).toBe('openai:gpt-4o-mini');
	});
});

describe('PermissionEngine', () => {
	it('skips execution in plan mode', async () => {
		const { executed } = await guardShell('noop', () => Promise.resolve('ok'), {
			modeOverride: 'plan',
			logger: { info: () => {}, warn: () => {} },
		});
		expect(executed).toBe(false);
	});

	it('executes in auto mode', async () => {
		const { executed, result } = await guardShell('noop', () => Promise.resolve('ok'), {
			modeOverride: 'auto',
			logger: { info: () => {}, warn: () => {} },
		});
		expect(executed).toBe(true);
		expect(result).toBe('ok');
	});
});
