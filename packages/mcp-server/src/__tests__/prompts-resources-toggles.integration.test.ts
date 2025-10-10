import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrompts } from '../prompts/index.js';
import { createResources } from '../resources/index.js';

const createLoggerStub = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	trace: vi.fn(),
});

const createServerStub = () => {
	return {
		prompts: {
			add: vi.fn(),
		},
		resources: {
			add: vi.fn(),
		},
	};
};

const ORIGINAL_ENV = { ...process.env };

describe('MCP feature toggles', () => {
	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		vi.restoreAllMocks();
	});

	it('skips prompt registration when MCP_PROMPTS_ENABLED=false', () => {
		process.env.MCP_PROMPTS_ENABLED = 'false';
		const server = createServerStub();
		const logger = createLoggerStub();

		createPrompts(server as any, logger);

		expect(server.prompts.add).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ branding: expect.any(String), event: 'prompts_disabled' }),
			'MCP prompts disabled',
		);
	});

	it('skips resource registration when MCP_RESOURCES_ENABLED=false', () => {
		process.env.MCP_RESOURCES_ENABLED = 'false';
		const server = createServerStub();
		const logger = createLoggerStub();

		createResources(server as any, logger);

		expect(server.resources.add).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ branding: expect.any(String), event: 'resources_disabled' }),
			'MCP resources disabled',
		);
	});

	it('registers prompts and resources when toggles enabled', () => {
		process.env.MCP_PROMPTS_ENABLED = 'true';
		process.env.MCP_RESOURCES_ENABLED = 'true';
		const server = createServerStub();
		const logger = createLoggerStub();

		createPrompts(server as any, logger);
		createResources(server as any, logger);

		expect(server.prompts.add).toHaveBeenCalledTimes(3);
		expect(server.resources.add).toHaveBeenCalledTimes(4);
	});
});
