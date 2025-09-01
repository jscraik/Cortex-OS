import { TOKENS } from '@cortex-os/contracts';
import { describe, expect, test } from 'vitest';
import { createContainer } from '../src/boot';

describe('boot container', () => {
  test('creates container with required bindings', () => {
    const container = createContainer();
    expect(container.isBound(TOKENS.Memories)).toBe(true);
    expect(container.isBound(TOKENS.Orchestration)).toBe(true);
    expect(container.isBound(TOKENS.MCPGateway)).toBe(true);
  });
});
