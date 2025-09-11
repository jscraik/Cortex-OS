import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { PolicyEncryptedStore } from '../src/adapters/store.encrypted.policy.js';
import { InMemoryAesGcm } from '../src/ports/Encryption.js';
import type { Memory } from '../src/domain/types.js';

describe('PolicyEncryptedStore', () => {
  it('encrypts only selected namespaces and supports vectors/tags', async () => {
    const base = new InMemoryStore();
    const crypto = new InMemoryAesGcm('k');
    const policy = (ns: string) => ns === 'secure';
    const store = new PolicyEncryptedStore(base, crypto, policy, {
      encryptVectors: true,
      encryptTags: true,
    });

    const now = new Date().toISOString();
    const m: Memory = {
      id: 'p1',
      kind: 'note',
      text: 'secret',
      vector: [1, 2, 3],
      tags: ['a', 'b'],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'user' },
    };

    await store.upsert(m, 'secure');
    const raw = await base.get('p1', 'secure');
    expect(typeof raw?.text).toBe('string');
    expect(raw?.text?.startsWith('enc:')).toBe(true);
    expect(typeof raw?.provenance).toBe('string');
    // vector/tags also encrypted as strings
    expect(typeof (raw as any).vector).toBe('string');
    expect(((raw as any).vector as string).startsWith('enc:')).toBe(true);
    expect(typeof (raw as any).tags).toBe('string');

    const got = await store.get('p1', 'secure');
    expect(got?.text).toBe('secret');
    expect(got?.vector).toEqual([1, 2, 3]);
    expect(got?.tags).toEqual(['a', 'b']);

    // Non-secure namespace should remain plaintext
    await store.upsert({ ...m, id: 'p2' }, 'public');
    const raw2 = await base.get('p2', 'public');
    expect(raw2?.text).toBe('secret');
    expect(raw2?.vector).toEqual([1, 2, 3]);
    expect(raw2?.tags).toEqual(['a', 'b']);
  });
});

