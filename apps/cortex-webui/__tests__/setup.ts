import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock crypto.randomUUID for jsdom
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
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

// Provide a simple mock for `sonner` used by frontend components (toast)
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		// allow other toast methods if needed
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		custom: (_: unknown) => ({
			dismiss: vi.fn(),
		}),
	},
}));

// Mock window for client-side code
if (typeof window !== 'undefined') {
	// jsdom doesn't implement scrollIntoView by default
	if (!('scrollIntoView' in HTMLElement.prototype)) {
		(HTMLElement.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
	}
	// Ensure localStorage is available
	if (!window.localStorage) {
		const storageMock: Storage = {
			getItem: vi.fn((_k: string) => {
				if (_k) {
					// param intentionally unused beyond presence check
				}
				return null;
			}),
			setItem: vi.fn((_k: string, _v: string) => {
				if (_k || _v) {
					// params intentionally unused beyond presence check
				}
				return undefined;
			}),
			removeItem: vi.fn((_k: string) => {
				if (_k) {
					// param intentionally unused beyond presence check
				}
				return undefined;
			}),
			clear: vi.fn(() => undefined),
			key: vi.fn((_i: number) => {
				if (_i || _i === 0) {
					// param intentionally unused beyond presence check
				}
				return null;
			}),
			length: 0,
		};
		window.localStorage = storageMock;
	}
}

// Provide a simple global fetch mock to handle relative API routes used by the frontend
// so tests do not attempt real network calls and relative paths don't break in Node.
if (typeof (globalThis as { fetch?: typeof fetch }).fetch === 'undefined') {
	(globalThis as { fetch: typeof fetch }).fetch = vi.fn(
		async (_input: RequestInfo | URL, _init?: RequestInit) => {
			if (_init) {
				// init intentionally unused in mock
			}
			const url = typeof _input === 'string' ? _input : String(_input);
			// handle models endpoint used by Chat component
			if (url.endsWith('/api/models/ui')) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						models: [
							{ id: 'model1', label: 'Model 1' },
							{ id: 'model2', label: 'Model 2' },
						],
						default: 'model1',
					}),
				};
			}

			// generic ok response
			return {
				ok: true,
				status: 200,
				json: async () => ({}),
			};
		},
	) as unknown as typeof fetch;
}
