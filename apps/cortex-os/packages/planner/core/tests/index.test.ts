import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configManager } from '../src/config.js';
import { formatCurrent, getCurrent, listAdapters, setCurrent } from '../src/models.js';

let _originalConfig: unknown;

beforeEach(async () => {
	_originalConfig = await configManager.getAll();
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
