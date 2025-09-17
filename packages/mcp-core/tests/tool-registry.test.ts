import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	type McpTool,
	McpToolError,
	ToolExecutionError,
	ToolNotFoundError,
	ToolRegistrationError,
	ToolRegistry,
	ToolValidationError,
} from '../src/tools.js';

describe('ToolRegistry', () => {
	it('registers tools and executes them with validated input', async () => {
		const registry = new ToolRegistry();
		const tool: McpTool<{ message: string }, { echoed: string }> = {
			name: 'test',
			description: 'test tool',
			inputSchema: z.object({ message: z.string() }),
			async execute(input) {
				return { echoed: input.message };
			},
		};

		registry.register(tool);

		await expect(
			registry.execute('test', { message: 'hello world' }),
		).resolves.toEqual({ echoed: 'hello world' });
	});

	it('throws when registering duplicate tool names', () => {
		const registry = new ToolRegistry();
		const tool: McpTool = {
			name: 'duplicate',
			description: 'duplicate tool',
			inputSchema: z.object({}),
			async execute() {
				return {};
			},
		};

		registry.register(tool);

		expect(() => registry.register(tool)).toThrow(ToolRegistrationError);
	});

	it('throws when executing an unknown tool', async () => {
		const registry = new ToolRegistry();

		await expect(registry.execute('missing', {})).rejects.toBeInstanceOf(
			ToolNotFoundError,
		);
	});

	it('validates input using the tool schema', async () => {
		const registry = new ToolRegistry();
		const tool: McpTool<{ message: string }> = {
			name: 'validate',
			description: 'validation tool',
			inputSchema: z.object({ message: z.string().min(2) }),
			async execute() {
				return {};
			},
		};
		registry.register(tool);

		await expect(
			registry.execute('validate', { message: 'x' }),
		).rejects.toBeInstanceOf(ToolValidationError);
	});

	it('wraps unexpected errors in ToolExecutionError', async () => {
		const registry = new ToolRegistry();
		const tool: McpTool<{ message: string }> = {
			name: 'boom',
			description: 'explodes',
			inputSchema: z.object({ message: z.string() }),
			async execute() {
				throw new Error('kaboom');
			},
		};
		registry.register(tool);

		await expect(
			registry.execute('boom', { message: 'test' }),
		).rejects.toBeInstanceOf(ToolExecutionError);
	});

	it('propagates explicit McpToolError errors without wrapping', async () => {
		const registry = new ToolRegistry();
		const error = new McpToolError('nope', { code: 'E_CUSTOM' });
		const tool: McpTool<{ message: string }> = {
			name: 'fail',
			description: 'failing tool',
			inputSchema: z.object({ message: z.string() }),
			async execute() {
				throw error;
			},
		};
		registry.register(tool);

		await expect(registry.execute('fail', { message: 'test' })).rejects.toBe(
			error,
		);
	});

	it('lists registered tools', () => {
		const registry = new ToolRegistry();
		const toolA: McpTool = {
			name: 'a',
			description: 'A',
			inputSchema: z.object({}),
			async execute() {
				return {};
			},
		};
		const toolB: McpTool = {
			name: 'b',
			description: 'B',
			inputSchema: z.object({}),
			async execute() {
				return {};
			},
		};

		registry.register(toolA);
		registry.register(toolB);

		const tools = registry.list();

		expect(tools.map((t) => t.name).sort()).toEqual(['a', 'b']);
	});
});
