import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID for jsdom
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
	// @ts-expect-error - we're adding a mock
	crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
}

// Provide a basic mock for next/navigation hooks used by components under test
vi.mock('next/navigation', () => {
	const push = vi.fn();
	const replace = vi.fn();
	const back = vi.fn();
	const mockSearchParams = new URLSearchParams();

	return {
		useRouter: () => ({ push, replace, back, prefetch: vi.fn() }),
		usePathname: () => '/test',
		useSearchParams: () => mockSearchParams,
	};
});

// Minimal mock for next/link used in layout components
vi.mock('next/link', () => ({
        default: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window for client-side code
if (typeof window !== 'undefined') {
	// jsdom doesn't implement scrollIntoView by default
	if (!('scrollIntoView' in HTMLElement.prototype)) {
		// @ts-expect-error - defining missing DOM API for tests
		HTMLElement.prototype.scrollIntoView = vi.fn();
	}
	// Ensure localStorage is available
	if (!window.localStorage) {
		const storageMock: Storage = {
			getItem: vi.fn((_key: string) => null),
			setItem: vi.fn((_key: string, _value: string) => undefined),
			removeItem: vi.fn((_key: string) => undefined),
			clear: vi.fn(() => undefined),
			key: vi.fn((_index: number) => null),
			length: 0,
		};
		// @ts-expect-error - assigning to readonly for test environment
		window.localStorage = storageMock;
	}
}
