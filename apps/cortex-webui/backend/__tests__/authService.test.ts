import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { AuthService as AuthServiceType } from '../src/services/authService';
import { clearTestStorage, mockDbGet, mockDbRun } from './mocks/database.mock';

// Mock the database module
vi.mock('../src/utils/database-temp', () => ({
	initializeDatabase: vi.fn(),
	getDatabase: vi.fn(),
	closeDatabase: vi.fn(),
	dbGet: mockDbGet,
	dbRun: mockDbRun,
}));

describe('AuthService configuration', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		clearTestStorage();
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
		process.env.JWT_SECRET = 'super-secure-jwt-secret-value-32-chars!!';
		process.env.DATABASE_PATH = ':memory:';
		const { AuthService } = (await import('../src/services/authService')) as {
			AuthService: typeof AuthServiceType;
		};
		const token = AuthService.generateToken('123');
		expect(typeof token).toBe('string');
	});

	test('register creates new user successfully', async () => {
		process.env.JWT_SECRET = 'super-secure-jwt-secret-value-32-chars!!';
		process.env.DATABASE_PATH = ':memory:';
		const { AuthService } = (await import('../src/services/authService')) as {
			AuthService: typeof AuthServiceType;
		};

		// Mock that no existing user is found
		mockDbGet.mockResolvedValueOnce(undefined);
		mockDbRun.mockResolvedValueOnce({ lastID: 1, changes: 1 });

		const result = await AuthService.register('Test User', 'test@example.com', 'password123');
		expect(result.user.email).toBe('test@example.com');
		expect(result.user.name).toBe('Test User');
		expect(typeof result.token).toBe('string');
		expect('password' in result.user).toBe(false); // Password should be removed
	});

	test('login with valid credentials succeeds', async () => {
		process.env.JWT_SECRET = 'super-secure-jwt-secret-value-32-chars!!';
		process.env.DATABASE_PATH = ':memory:';
		const { AuthService } = (await import('../src/services/authService')) as {
			AuthService: typeof AuthServiceType;
		};

		// Mock finding a user with hashed password
		const hashedPassword = AuthService.hashPassword('password123');
		mockDbGet.mockResolvedValueOnce({
			id: '123',
			email: 'test@example.com',
			name: 'Test User',
			password: hashedPassword,
			created_at: '2023-01-01',
			updated_at: '2023-01-01',
		});

		const result = await AuthService.login('test@example.com', 'password123');
		expect(result).not.toBeNull();
		if (result) {
			expect(result.user.email).toBe('test@example.com');
			expect(typeof result.token).toBe('string');
			expect('password' in result.user).toBe(false);
		}
	});

	test('login with invalid credentials fails', async () => {
		process.env.JWT_SECRET = 'super-secure-jwt-secret-value-32-chars!!';
		process.env.DATABASE_PATH = ':memory:';
		const { AuthService } = (await import('../src/services/authService')) as {
			AuthService: typeof AuthServiceType;
		};

		// Mock user not found
		mockDbGet.mockResolvedValueOnce(undefined);

		const result = await AuthService.login('nonexistent@example.com', 'password123');
		expect(result).toBeNull();
	});
});
