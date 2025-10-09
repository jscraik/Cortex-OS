import { describe, expect, it, vi } from 'vitest';

const mockSuite = () => ({
	optionsSchema: { parse: vi.fn().mockReturnValue({}) },
	run: vi.fn(),
});

const ragSuiteMock = mockSuite();
const routerSuiteMock = mockSuite();
const promptSuiteMock = mockSuite();
const redteamSuiteMock = mockSuite();
const mcpToolsSuiteMock = mockSuite();

vi.mock('./suites/rag', () => ({ ragSuite: ragSuiteMock }));
vi.mock('./suites/router', () => ({ routerSuite: routerSuiteMock }));
vi.mock('./suites/promptfoo', () => ({ promptSuite: promptSuiteMock }));
vi.mock('./suites/redteam', () => ({ redteamSuite: redteamSuiteMock }));
vi.mock('./suites/mcp-tools', () => ({ mcpToolsSuite: mcpToolsSuiteMock }));

import { runGate } from './index.js';
import { mcpToolsSuite } from './suites/mcp-tools.js';
import { promptSuite } from './suites/promptfoo.js';
import { ragSuite } from './suites/rag.js';
import { redteamSuite } from './suites/redteam.js';
import { routerSuite } from './suites/router.js';

describe('runGate', () => {
	const dataset = { docs: [], queries: [] };

	it('returns pass when all suites pass', async () => {
		vi.mocked(ragSuite.run).mockResolvedValueOnce({
			name: 'rag',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(routerSuite.run).mockResolvedValueOnce({
			name: 'router',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(promptSuite.run).mockResolvedValueOnce({
			name: 'prompt',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(redteamSuite.run).mockResolvedValueOnce({
			name: 'redteam',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(mcpToolsSuite.run).mockResolvedValueOnce({
			name: 'mcpTools',
			pass: true,
			metrics: {},
			notes: [],
		});
		const cfg = {
			dataset,
			suites: [
				{ name: 'rag', enabled: true, thresholds: {}, options: {} },
				{ name: 'router', enabled: true, thresholds: {} },
				{ name: 'prompt', enabled: true, thresholds: {}, options: {} },
				{ name: 'redteam', enabled: true, thresholds: {}, options: {} },
				{ name: 'mcpTools', enabled: true, thresholds: {}, options: {} },
				{ name: 'router', enabled: false, thresholds: {} },
			],
		} as const;
		const res = await runGate(cfg, {
			rag: {},
			router: {},
			prompt: {},
			redteam: {},
			mcpTools: {},
		} as any);
		expect(res.pass).toBe(true);
	});

	it('returns fail when a suite fails', async () => {
		vi.mocked(ragSuite.run).mockResolvedValueOnce({
			name: 'rag',
			pass: false,
			metrics: {},
			notes: [],
		});
		vi.mocked(routerSuite.run).mockResolvedValueOnce({
			name: 'router',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(promptSuite.run).mockResolvedValueOnce({
			name: 'prompt',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(redteamSuite.run).mockResolvedValueOnce({
			name: 'redteam',
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(mcpToolsSuite.run).mockResolvedValueOnce({
			name: 'mcpTools',
			pass: true,
			metrics: {},
			notes: [],
		});
		const cfg = {
			dataset,
			suites: [
				{ name: 'rag', enabled: true, thresholds: {}, options: {} },
				{ name: 'router', enabled: true, thresholds: {} },
				{ name: 'prompt', enabled: true, thresholds: {}, options: {} },
				{ name: 'redteam', enabled: true, thresholds: {}, options: {} },
				{ name: 'mcpTools', enabled: true, thresholds: {}, options: {} },
				{ name: 'router', enabled: false, thresholds: {} },
			],
		} as const;
		const res = await runGate(cfg, {
			rag: {},
			router: {},
			prompt: {},
			redteam: {},
			mcpTools: {},
		} as any);
		expect(res.pass).toBe(false);
	});

	it('throws on invalid config', async () => {
		await expect(runGate({} as any, {} as any)).rejects.toThrow();
	});
});
