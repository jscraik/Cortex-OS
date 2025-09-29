import { describe, expect, it } from 'vitest';

import { parseSlash } from '../src/parseSlash.js';

describe('parseSlash', () => {
        it('returns null when the input does not start with a slash', () => {
                expect(parseSlash('help')).toBeNull();
                expect(parseSlash('  status')).toBeNull();
        });

        it('normalises the command to lowercase and parses arguments', () => {
                const parsed = parseSlash('/DEPLOY Prod us-east-1');
                expect(parsed).toEqual({ cmd: 'deploy', args: ['Prod', 'us-east-1'] });
        });

        it('trims surrounding whitespace and collapses extra spacing', () => {
                const parsed = parseSlash('   /build    feature   branch   ');
                expect(parsed).toEqual({ cmd: 'build', args: ['feature', 'branch'] });
        });
});
