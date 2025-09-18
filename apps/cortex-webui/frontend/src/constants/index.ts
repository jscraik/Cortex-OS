// Application constants for the Cortex WebUI

export const APP_NAME = 'Cortex WebUI';
export const APP_VERSION = '1.0.0';

// Vite exposes env vars on import.meta.env; fall back to localhost API if not set
// Import the Vite ambient types to get ImportMetaEnv typings
/// <reference types="vite/client" />

// Debug logging for API base URL resolution
console.log('🔧 Environment Variables Debug:');
console.log('import.meta.env:', import.meta?.env);
console.log('VITE_API_BASE_URL from env:', import.meta?.env?.VITE_API_BASE_URL);

export const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:3033/api';

console.log('🌐 Final API_BASE_URL:', API_BASE_URL);

export const THEME_OPTIONS = {
	LIGHT: 'light',
	DARK: 'dark',
} as const;

export const DEFAULT_MODEL = 'gpt-4';

export const MESSAGE_ROLES = {
	USER: 'user',
	ASSISTANT: 'assistant',
	SYSTEM: 'system',
} as const;

export const TOOL_STATUS = {
	PENDING: 'pending',
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed',
} as const;
