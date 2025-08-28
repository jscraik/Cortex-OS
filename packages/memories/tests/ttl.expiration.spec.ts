import { describe, it, expect } from 'vitest';
import { isExpired, isoDurationToMs } from '../src/domain/policies.js';
import { Memory } from '../src/domain/types.js';

describe('Memory expiration and TTL handling', () => {
  it('correctly identifies expired memories', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    const now = new Date().toISOString();
    
    // Non-expired memory
    const freshMemory: Memory = {
      id: '1',
      kind: 'note',
      text: 'fresh memory',
      tags: [],
      ttl: 'P1D', // 1 day
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'user' },
    };
    
    // Expired memory
    const expiredMemory: Memory = {
      id: '2',
      kind: 'note',
      text: 'expired memory',
      tags: [],
      ttl: 'P1D', // 1 day
      createdAt: past,
      updatedAt: past,
      provenance: { source: 'user' },
    };
    
    expect(isExpired(freshMemory, now)).toBe(false);
    expect(isExpired(expiredMemory, now)).toBe(true);
  });

  it('handles various ISO duration formats', () => {
    // Test various ISO duration formats
    expect(isoDurationToMs('P1D')).toBe(24 * 60 * 60 * 1000); // 1 day
    expect(isoDurationToMs('PT1H')).toBe(60 * 60 * 1000); // 1 hour
    expect(isoDurationToMs('PT30M')).toBe(30 * 60 * 1000); // 30 minutes
    expect(isoDurationToMs('PT45S')).toBe(45 * 1000); // 45 seconds
    expect(isoDurationToMs('P1DT12H')).toBe((24 + 12) * 60 * 60 * 1000); // 1 day 12 hours
  });

  it('correctly handles edge cases for expiration', () => {
    const now = new Date().toISOString();
    
    // Memory with no TTL should not be expired
    const noTtlMemory: Memory = {
      id: '3',
      kind: 'note',
      text: 'no ttl memory',
      tags: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      provenance: { source: 'user' },
    };
    
    expect(isExpired(noTtlMemory, now)).toBe(false);
    
    // Invalid TTL should not cause expiration
    const invalidTtlMemory: Memory = {
      id: '4',
      kind: 'note',
      text: 'invalid ttl memory',
      tags: [],
      ttl: 'invalid-format',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      provenance: { source: 'user' },
    };
    
    expect(isExpired(invalidTtlMemory, now)).toBe(false);
  });
});