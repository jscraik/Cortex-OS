import { describe, expect, it } from 'vitest';
import { parseSlash } from '../src/parseSlash.js';

describe('parseSlash', () => {
	it('parses command and args', () => {
		expect(parseSlash('/help')).toEqual({ cmd: 'help', args: [] });
		expect(parseSlash('/Model gpt-4o mini')).toEqual({ cmd: 'model', args: ['gpt-4o', 'mini'] });
	});
	it('returns null for non-slash input', () => {
		expect(parseSlash('hello')).toBeNull();
	});
});
