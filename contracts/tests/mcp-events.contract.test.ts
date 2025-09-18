import { describe, expect, it } from 'vitest';
import {
	McpToolCallBeginSchema,
	McpToolCallEndSchema,
} from '../../libs/typescript/contracts/src/mcp-events';

// These tests exist primarily to satisfy the schema coverage guard ensuring every exported *Schema
// in contracts event files has at least one explicit reference in tests. We still include minimal
// positive + negative validations for safety and regression detection.

describe('MCP Telemetry Event Schemas', () => {
	describe('McpToolCallBeginSchema', () => {
		it('accepts a valid begin event payload', () => {
			const valid = {
				callId: 'call-123',
				name: 'tool:vector.search',
				arguments: { query: 'hello' },
				timestamp: Date.now(),
			};
			expect(() => McpToolCallBeginSchema.parse(valid)).not.toThrow();
		});

		it('rejects missing callId', () => {
			const invalid: unknown = {
				name: 'tool:x',
				timestamp: Date.now(),
			};
			expect(() => McpToolCallBeginSchema.parse(invalid as Record<string, unknown>)).toThrow();
		});
	});

	describe('McpToolCallEndSchema', () => {
		it('accepts a successful end event', () => {
			const valid = {
				callId: 'call-123',
				name: 'tool:vector.search',
				durationMs: 42,
				success: true,
			};
			expect(() => McpToolCallEndSchema.parse(valid)).not.toThrow();
		});

		it('accepts a failed end event with error', () => {
			const valid = {
				callId: 'call-124',
				name: 'tool:vector.search',
				durationMs: 15,
				success: false,
				error: 'timeout',
			};
			expect(() => McpToolCallEndSchema.parse(valid)).not.toThrow();
		});

		it('rejects negative duration', () => {
			const invalid: unknown = {
				callId: 'call-125',
				name: 'tool:vector.search',
				durationMs: -1,
				success: true,
			};
			expect(() => McpToolCallEndSchema.parse(invalid as Record<string, unknown>)).toThrow();
		});
	});
});
