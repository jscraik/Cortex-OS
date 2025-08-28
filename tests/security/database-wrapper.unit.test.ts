import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureDatabaseWrapper } from '../../packages/mvp-core/src/secure-db';

// Mock database and statement for testing
let mockStatement: any;
let mockDatabase: any;
let wrapper: SecureDatabaseWrapper;

beforeEach(() => {
  mockStatement = {
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
  };
  mockDatabase = {
    prepare: vi.fn().mockReturnValue(mockStatement),
  };
  wrapper = new SecureDatabaseWrapper(mockDatabase);
});

describe('securePrepare', () => {
  it('throws on _raw parameter', () => {
    expect(() => wrapper.securePrepare('SELECT ? as x', [{ _raw: 'DROP TABLE users' }])).toThrow(
      'Raw SQL injection detected',
    );
  });

  it('rejects invalid string parameter', () => {
    const invalid = 'a'.repeat(1001);
    expect(() => wrapper.securePrepare('SELECT ? as x', [invalid])).toThrow(
      'Invalid string parameter',
    );
  });

  it('returns statement on valid query', () => {
    const stmt = wrapper.securePrepare('SELECT ? as x', ['ok']);
    expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT ? as x');
    expect(stmt).toBe(mockStatement);
  });
});

describe('secureRun', () => {
  it('executes valid query', () => {
    wrapper.secureRun('INSERT INTO t VALUES (?)', 'ok');
    expect(mockDatabase.prepare).toHaveBeenCalledWith('INSERT INTO t VALUES (?)');
    expect(mockStatement.run).toHaveBeenCalledWith('ok');
  });

  it('rejects _raw object parameter', () => {
    expect(() => wrapper.secureRun('INSERT INTO t VALUES (?)', { _raw: '1' } as any)).toThrow(
      'Raw SQL injection detected',
    );
  });

  it('rejects invalid string parameter', () => {
    const invalid = 'a'.repeat(1001);
    expect(() => wrapper.secureRun('INSERT INTO t VALUES (?)', invalid)).toThrow(
      'Invalid string parameter',
    );
  });
});

describe('secureGet', () => {
  it('executes valid query', () => {
    wrapper.secureGet('SELECT ? as x', 'ok');
    expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT ? as x');
    expect(mockStatement.get).toHaveBeenCalledWith('ok');
  });

  it('rejects _raw object parameter', () => {
    expect(() => wrapper.secureGet('SELECT ? as x', { _raw: '1' } as any)).toThrow(
      'Raw SQL injection detected',
    );
  });

  it('rejects invalid string parameter', () => {
    const invalid = 'a'.repeat(1001);
    expect(() => wrapper.secureGet('SELECT ? as x', invalid)).toThrow('Invalid string parameter');
  });
});

describe('secureAll', () => {
  it('executes valid query', () => {
    wrapper.secureAll('SELECT ? as x', 'ok');
    expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT ? as x');
    expect(mockStatement.all).toHaveBeenCalledWith('ok');
  });

  it('rejects _raw object parameter', () => {
    expect(() => wrapper.secureAll('SELECT ? as x', { _raw: '1' } as any)).toThrow(
      'Raw SQL injection detected',
    );
  });

  it('rejects invalid string parameter', () => {
    const invalid = 'a'.repeat(1001);
    expect(() => wrapper.secureAll('SELECT ? as x', invalid)).toThrow('Invalid string parameter');
  });
});
