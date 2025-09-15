import assert from 'node:assert/strict';
import test from 'node:test';
import { findMismatches } from './sync.mjs';

test('detects mismatched versions', () => {
  const npmMap = new Map([['foo', '1.0.0']]);
  const pyMap = new Map([['foo', '1.0.1']]);
  assert.deepEqual(findMismatches(npmMap, pyMap), [
    { name: 'foo', npm: '1.0.0', python: '1.0.1' },
  ]);
});

test('returns empty when versions match', () => {
  const npmMap = new Map([['foo', '1.0.0']]);
  const pyMap = new Map([['foo', '1.0.0']]);
  assert.deepEqual(findMismatches(npmMap, pyMap), []);
});
