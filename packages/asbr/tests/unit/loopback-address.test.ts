import { describe, expect, it } from 'vitest';
import { isLoopbackAddress } from '../../src/api/auth.js';

describe('isLoopbackAddress', () => {
  it('detects IPv4 loopback addresses', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('127.10.20.30')).toBe(true);
    expect(isLoopbackAddress('192.168.1.1')).toBe(false);
  });

  it('detects IPv6 loopback addresses', () => {
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('2001:db8::1')).toBe(false);
  });
});
