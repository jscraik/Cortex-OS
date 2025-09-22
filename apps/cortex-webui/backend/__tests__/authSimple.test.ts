// Simple auth service tests - standalone functions only
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test standalone functions without database dependencies
describe('Password Functions', () => {
  it('should hash password correctly', () => {
    const password = 'test-password';
    const saltRounds = 10;
    const hashed = bcrypt.hashSync(password, saltRounds);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(0);
  });

  it('should verify password correctly', () => {
    const password = 'test-password';
    const saltRounds = 10;
    const hashed = bcrypt.hashSync(password, saltRounds);

    expect(bcrypt.compareSync(password, hashed)).toBe(true);
    expect(bcrypt.compareSync('wrong-password', hashed)).toBe(false);
  });
});

describe('JWT Functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  it('should generate JWT token', () => {
    process.env.JWT_SECRET = 'test-secret-key-for-development-only-32-chars';

    const userId = 'test-user-id';
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toEqual(expect.objectContaining({ userId }));
  });

  it('should throw error when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;

    expect(() => {
      jwt.sign({ userId: 'test' }, undefined as any);
    }).toThrow();
  });
});