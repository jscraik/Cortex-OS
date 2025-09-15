// Global ambient type declarations for the cortex-webui frontend.
// Extends the Window interface with optional utilities injected at runtime.

export {};

declare global {
	interface Window {
		addNotification?: (
			type: 'success' | 'error' | 'info' | 'warning',
			message: string,
		) => void;
	}
}
