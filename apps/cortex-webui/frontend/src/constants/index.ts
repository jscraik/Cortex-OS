// Application constants for the Cortex WebUI

export const APP_NAME = 'Cortex WebUI';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

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
