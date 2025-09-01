import { describe, expect, it } from 'vitest';
import { validateCommandInput } from '../src/validation.js';

describe('validateCommandInput', () => {
  it('accepts allowed docker command', () => {
    const result = validateCommandInput.docker(['docker', 'ps']);
    expect(result.success).toBe(true);
  });

  it('rejects disallowed docker subcommand', () => {
    const result = validateCommandInput.docker(['docker', 'run']);
    expect(result.success).toBe(false);
  });

  it('accepts generic command', () => {
    const result = validateCommandInput.generic(['echo', 'hello']);
    expect(result.success).toBe(true);
  });

  it('rejects command with invalid characters', () => {
    const result = validateCommandInput.generic(['echo', 'hello;rm']);
    expect(result.success).toBe(false);
  });
});
