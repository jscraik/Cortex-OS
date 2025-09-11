import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AuthService as AuthServiceType } from '../src/services/authService';

describe('AuthService configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('generateToken throws when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_PATH;
    const { AuthService } = (await import('../src/services/authService')) as {
      AuthService: typeof AuthServiceType;
    };
    expect(() => AuthService.generateToken('123')).toThrow();
  });

  test('generateToken returns token when config is present', async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.DATABASE_PATH = ':memory:';
    const { AuthService } = (await import('../src/services/authService')) as {
      AuthService: typeof AuthServiceType;
    };
    const token = AuthService.generateToken('123');
    expect(typeof token).toBe('string');
  });
});
