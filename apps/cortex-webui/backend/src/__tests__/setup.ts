// Test setup file for Vitest
import { vi } from 'vitest';

import { vitestCommonEnv } from '../../vitest.env';

for (const [key, value] of Object.entries(vitestCommonEnv) as [string, string][]) {
	if (process.env[key] === undefined) {
		process.env[key] = value;
	}
}

// Mock external dependencies
vi.mock('openai', () => ({
	OpenAI: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({
					choices: [{ message: { content: 'Mock response' } }],
				}),
			},
		},
	})),
}));

vi.mock('@anthropic-ai/sdk', () => ({
	Anthropic: vi.fn().mockImplementation(() => ({
		messages: {
			create: vi.fn().mockResolvedValue({
				content: [{ text: 'Mock response' }],
			}),
		},
	})),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
	default: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	},
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	},
	logError: vi.fn(),
	logInfo: vi.fn(),
	logWarn: vi.fn(),
	logDebug: vi.fn(),
}));

// Mock file system operations
vi.mock('fs/promises', () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	unlink: vi.fn(),
	mkdir: vi.fn(),
	stat: vi.fn(),
}));

// Global test utilities
beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});
