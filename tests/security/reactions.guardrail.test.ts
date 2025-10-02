/**
 * Guardrail test: ensure only supported GitHub reaction content strings are used
 * Allowed: '+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes'
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Guardrails: only supported GitHub reactions are used', () => {
	it('no unsupported reaction strings appear in server code', () => {
		const files = [
			join(process.cwd(), 'packages/cortex-ai-github/src/server/webhook-server'),
			join(process.cwd(), 'packages/cortex-semgrep-github/src/server/app'),
			join(process.cwd(), 'packages/cortex-structure-github/src/server/app'),
		];

		const unsupportedTokens = ['gear', 'x', 'warning'];

		for (const file of files) {
			const content = readFileSync(file, 'utf8');
			for (const token of unsupportedTokens) {
				expect(content).not.toContain(`'${token}'`);
				expect(content).not.toContain(`"${token}"`);
			}
		}
	});
});
