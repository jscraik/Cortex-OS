import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { buildNamespaceSelector, createPolicyAwareStore } from '../src/service/store-factory.js';
import type { Memory } from '../src/domain/types.js';

describe('Store Factory', () => {
  it('buildNamespaceSelector supports map and regex', () => {
    const sel1 = buildNamespaceSelector({ namespaces: ['secure', 'pii'] });
    expect(sel1('secure')).toBe(true);
    expect(sel1('public')).toBe(false);

    const sel2 = buildNamespaceSelector({ regex: '^sec:' });
    expect(sel2('sec:alpha')).toBe(true);
    expect(sel2('public')).toBe(false);
  });

  it('createPolicyAwareStore builds layered + policy-encrypted store', async () => {
    const short = new InMemoryStore();
    const long = new InMemoryStore();
    const store = createPolicyAwareStore({
      shortTerm: short,
      longTerm: long,
      encryption: {
        secret: 'factory-secret',
        selector: buildNamespaceSelector({ namespaces: ['secure'] }),
        encryptTags: true,
        encryptVectors: true,
      },
    });

    const now = new Date().toISOString();
    const m: Memory = {
      id: 'fac-1',
      kind: 'note',
      text: 'top secret',
      vector: [0.1, 0.2],
      tags: ['x'],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'user' },
      policy: { scope: 'session' },
    };
    await store.upsert(m, 'secure');

    // Should be routed to short-term and be encrypted at rest
    const raw = await short.get('fac-1', 'secure');
    expect(typeof raw?.text).toBe('string');
    expect((raw as any).text.startsWith('enc:')).toBe(true);
    expect(typeof (raw as any).vector).toBe('string');
    expect(((raw as any).vector as string).startsWith('enc:')).toBe(true);
    expect(typeof (raw as any).tags).toBe('string');

    // Reading through composed store returns plaintext
    const got = await store.get('fac-1', 'secure');
    expect(got?.text).toBe('top secret');
    expect(got?.vector).toEqual([0.1, 0.2]);
    expect(got?.tags).toEqual(['x']);

    // Public namespace should be unencrypted and routed by scope
    await store.upsert({ ...m, id: 'fac-2', policy: { scope: 'user' } }, 'public');
    const raw2 = await long.get('fac-2', 'public');
    expect(raw2?.text).toBe('top secret');
    expect(raw2?.vector).toEqual([0.1, 0.2]);
    expect(raw2?.tags).toEqual(['x']);
  });
});

