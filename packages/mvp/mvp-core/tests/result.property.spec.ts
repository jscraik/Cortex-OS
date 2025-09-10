import fc from 'fast-check';
import { describe, it } from 'vitest';
import { err, ok, wrap } from '../src/result.js';

describe('result property tests', () => {
	it('ok returns value', () => {
		fc.assert(
			fc.property(fc.anything(), (value) => {
				return ok(value).value === value;
			}),
			{ numRuns: 100, seed: 12345 },
		);
	});

	it('err returns error', () => {
		fc.assert(
			fc.property(fc.string(), (msg) => {
				const e = new Error(msg);
				return err(e).error === e;
			}),
			{ numRuns: 100, seed: 12345 },
		);
	});

	it('wrap resolves', async () => {
		await fc.assert(
			fc.asyncProperty(fc.anything(), async (value) => {
				const r = await wrap(async () => value);
				return r.ok && r.value === value;
			}),
			{ numRuns: 100, seed: 12345 },
		);
	});

	it('wrap captures errors', async () => {
		await fc.assert(
			fc.asyncProperty(fc.string(), async (msg) => {
				const r = await wrap(async () => {
					throw new Error(msg);
				});
				return !r.ok && (r.error as Error).message === msg;
			}),
			{ numRuns: 100, seed: 12345 },
		);
	});
});
