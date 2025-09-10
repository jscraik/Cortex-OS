import type { SimScenario } from './types.js';

function escapeString(str: string): string {
	// Escape backslashes, single quotes, and newlines for safe JS string literal usage
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

export function generateTests(scenarios: SimScenario[]): string {
	return scenarios
		.map(
			(s) =>
				`import { describe, it, expect } from 'vitest';\n` +
				`describe('${escapeString(s.id)}', () => {\n` +
				`  it('has goal', () => {\n` +
				`    expect('${escapeString(s.goal)}').toBeTruthy();\n` +
				`  });\n});\n`,
		)
		.join('\n');
}
