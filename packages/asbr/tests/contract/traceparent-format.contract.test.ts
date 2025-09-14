import { describe, expect, it } from 'vitest';

// Duplicate lightweight validator logic (not exporting ensureTraceparent yet) to avoid reaching into server internals.
// W3C traceparent: version(2)-trace-id(32)-span-id(16)-flags(2)
function isValidTraceparent(tp: string): boolean {
  const parts = tp.split('-');
  if (parts.length !== 4) return false;
  const [ver, traceId, spanId, flags] = parts;
  const hex = /^[0-9a-f]+$/;
  if (ver !== '00') return false;
  if (traceId.length !== 32 || !hex.test(traceId) || /^0+$/.test(traceId)) return false;
  if (spanId.length !== 16 || !hex.test(spanId) || /^0+$/.test(spanId)) return false;
  if (flags.length !== 2 || !hex.test(flags)) return false;
  return true;
}

function normalizeTraceparent(v?: string): string {
  if (!v || !isValidTraceparent(v)) {
    // Generate minimal valid
    const rand = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `00-${rand(32)}-${rand(16)}-01`;
  }
  return v;
}

describe('contract: traceparent format', () => {
  it('accepts valid traceparent', () => {
    const tp = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    expect(isValidTraceparent(tp)).toBe(true);
  });
  it('rejects malformed parts', () => {
    const bad = '00-123-456-01';
    expect(isValidTraceparent(bad)).toBe(false);
  });
  it('rejects zero trace id/span', () => {
    const bad = '00-00000000000000000000000000000000-0000000000000000-01';
    expect(isValidTraceparent(bad)).toBe(false);
  });
  it('normalizes invalid into valid', () => {
    const out = normalizeTraceparent('00-short-xyz-ff');
    expect(isValidTraceparent(out)).toBe(true);
  });
});
