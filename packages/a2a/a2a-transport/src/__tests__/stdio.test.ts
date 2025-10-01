/**
 * @fileoverview Tests for stdio transport with simple logging
 * Tests systematic improvements to error handling
 */

import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

let stdio: typeof import('../stdio').stdio;

// Mock child_process.spawn
vi.mock('node:child_process', () => {
	return {
		spawn: vi.fn(() => ({
			stdout: {
				on: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
			},
			stdin: {
				write: vi.fn(),
				end: vi.fn(),
			},
			on: vi.fn(),
			kill: vi.fn(),
		})),
	};
});

describe('Stdio Transport', () => {
	let mockSpawn: Mock;

	beforeEach(async () => {
		// Reset modules and mocks
		vi.resetModules();
		// Set up spawn mock
		mockSpawn = vi.fn();
		vi.doMock('node:child_process', () => ({
			spawn: mockSpawn,
		}));
		// Import stdio after mocks are set up
		stdio = (await import('../stdio')).stdio;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Transport creation', () => {
		it('should create transport with default arguments', () => {
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('test-command');
			expect(mockSpawn).toHaveBeenCalledWith(
				'test-command',
				['stdio'],
				expect.objectContaining({
					stdio: ['pipe', 'pipe', 'pipe'],
					env: expect.any(Object),
				}),
			);
		});

		it('should create transport with custom arguments', () => {
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('custom-command', ['arg1', 'arg2'], { ENV_VAR: 'value' });
			expect(mockSpawn).toHaveBeenCalledWith(
				'custom-command',
				['arg1', 'arg2'],
				expect.objectContaining({
					env: expect.objectContaining({ ENV_VAR: 'value' }),
				}),
			);
		});
	});

	describe('Message parsing with structured logging', () => {
		it('should handle valid JSON messages', () => {
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('test-command');
			// Simulate data event
			const dataHandler = mockChild.stdout.on.mock.calls.find(([event]) => event === 'data')?.[1];
			if (dataHandler) {
				// Simulate receiving valid JSON
				dataHandler(Buffer.from('{"type":"test","data":"valid"}\n'));
			}
			// Should handle valid JSON without errors
			expect(dataHandler).toBeDefined();
		});

		it('should log warnings for invalid JSON', () => {
			// Mock console.warn to verify logging
			const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('test-command');
			// Get the data handler
			const dataHandler = mockChild.stdout.on.mock.calls.find(([event]) => event === 'data')?.[1];
			if (dataHandler) {
				// Simulate receiving invalid JSON
				dataHandler(Buffer.from('invalid-json\n'));
			}
			// Should call console.warn for invalid JSON
			expect(mockConsoleWarn).toHaveBeenCalledWith(
				'[a2a-stdio-transport] Failed to parse JSON message from stdio',
				expect.objectContaining({
					error: expect.any(String),
					context: 'stdio-message-parsing',
				}),
			);

			mockConsoleWarn.mockRestore();
		});

		it('should handle empty lines gracefully', () => {
			const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('test-command');
			const dataHandler = mockChild.stdout.on.mock.calls.find(([event]) => event === 'data')?.[1];
			if (dataHandler) {
				// Simulate empty lines and whitespace
				dataHandler(Buffer.from('\n\n  \n\t\n'));
			}
			// Should handle gracefully without logging errors
			expect(mockConsoleWarn).not.toHaveBeenCalled();

			mockConsoleWarn.mockRestore();
		});
	});

	describe('Transport lifecycle', () => {
		it('should provide terminate functionality', async () => {
			let closeHandler: (() => void) | undefined;
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn((event: string, handler: () => void) => {
					if (event === 'close') closeHandler = handler;
				}),
				removeListener: vi.fn(),
				kill: vi.fn(() => {
					// Simulate process closing after kill
					if (closeHandler) closeHandler();
				}),
				killed: false,
				exitCode: null,
			};
			mockSpawn.mockReturnValue(mockChild);
			const transport = stdio('test-command');
			// Should have terminate method
			expect(typeof transport.terminate).toBe('function');
			// Should call kill on child process
			await transport.terminate();
			expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
		});
		// Removed unused assignments
		it('should handle publish operations', () => {
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			const transport = stdio('test-command');
			const envelope: Envelope = createEnvelope({
				id: 'test-id-123',
				type: 'test.message',
				// Provide a valid absolute URI for source per schema
				source: 'https://example.com/test/source',
				data: { message: 'test' },
			});
			// Should not throw when publishing
			expect(() => transport.publish(envelope)).not.toThrow();
		});
	});

	describe('Error handling and resilience', () => {
		it('should handle process spawn errors', () => {
			mockSpawn.mockImplementation(() => {
				throw new Error('Spawn failed');
			});

			expect(() => stdio('failing-command')).toThrow('Spawn failed');
		});

		it('should handle unexpected data types', () => {
			const mockChild = {
				stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
				stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				once: vi.fn(),
				removeListener: vi.fn(),
				kill: vi.fn(),
			};
			mockSpawn.mockReturnValue(mockChild);
			stdio('test-command');
			const dataHandler = mockChild.stdout.on.mock.calls.find(([event]) => event === 'data')?.[1];
			if (dataHandler) {
				// Simulate non-Buffer data (edge case)
				expect(() => dataHandler('string-data')).not.toThrow();
			}
		});
	});
});
