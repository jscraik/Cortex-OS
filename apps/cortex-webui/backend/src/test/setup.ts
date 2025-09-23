import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-development-only-32-chars';
process.env.JWT_SECRET = 'test-jwt-secret-for-development-only-32-chars';
process.env.DATABASE_URL = ':memory:';
process.env.BASE_URL = 'http://localhost:3000';
process.env.GITHUB_CLIENT_ID = 'test-github-client';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.DISCORD_CLIENT_ID = 'test-discord-client';
process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';
process.env.JWT_SECRET = 'test-jwt-secret-for-development-only-32-chars';

// Global test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// Mock console methods in tests to reduce noise
global.console = {
	...console,
	log: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
};

// Setup global test timeouts
vi.setConfig({
	testTimeout: 10000,
	hookTimeout: 10000,
});

// Mock fetch for OAuth providers
global.fetch = vi.fn();

// Mock window location for browser tests
Object.defineProperty(window, 'location', {
	value: {
		href: 'http://localhost:3000',
		origin: 'http://localhost:3000',
		pathname: '/',
		search: '',
		hash: '',
		assign: vi.fn(),
		replace: vi.fn(),
		reload: vi.fn(),
	},
	writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = String(value);
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		key: (index: number) => Object.keys(store)[index] || null,
		length: Object.keys(store).length,
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = String(value);
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, 'sessionStorage', {
	value: sessionStorageMock,
});

// Mock crypto for JWT operations
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: () => `test-uuid-${Math.random().toString(36).substring(2)}`,
		getRandomValues: (arr: Uint8Array) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		},
		subtle: {
			digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
			encrypt: vi.fn(),
			decrypt: vi.fn(),
			sign: vi.fn(),
			verify: vi.fn(),
		},
	},
});

// Mock performance API
Object.defineProperty(window, 'performance', {
	value: {
		now: () => Date.now(),
		getEntriesByType: vi.fn(),
		mark: vi.fn(),
		measure: vi.fn(),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
	},
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
	return setTimeout(callback, 0);
});

// Mock cancelAnimationFrame
global.cancelAnimationFrame = vi.fn((id) => {
	clearTimeout(id);
});

// Setup before and after hooks
beforeEach(() => {
	// Clear all mocks before each test
	vi.clearAllMocks();

	// Clear localStorage and sessionStorage
	localStorageMock.clear();
	sessionStorageMock.clear();

	// Reset fetch mock
	(fetch as any).mockClear();
});

afterEach(() => {
	// Cleanup after each test
	cleanup();
});

// Global test matchers
expect.extend({
	toBeWithinRange(received: number, floor: number, ceiling: number) {
		const pass = received >= floor && received <= ceiling;
		if (pass) {
			return {
				message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
				pass: false,
			};
		}
	},

	toBeValidEmail(received: string) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const pass = emailRegex.test(received);
		if (pass) {
			return {
				message: () => `expected ${received} not to be a valid email`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be a valid email`,
				pass: false,
			};
		}
	},

	toBeStrongPassword(received: string) {
		const hasUpperCase = /[A-Z]/.test(received);
		const hasLowerCase = /[a-z]/.test(received);
		const hasNumbers = /\d/.test(received);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(received);
		const isLongEnough = received.length >= 8;

		const pass = hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough;

		if (pass) {
			return {
				message: () => `expected ${received} not to be a strong password`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to be a strong password`,
				pass: false,
			};
		}
	},
});

// Declare module to extend expect
declare global {
	namespace Vi {
		interface Assertion extends JestMatchers<any> {
			toBeWithinRange(floor: number, ceiling: number): void;
			toBeValidEmail(): void;
			toBeStrongPassword(): void;
		}
	}
}
