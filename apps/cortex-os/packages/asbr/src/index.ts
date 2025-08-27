/**
 * ASBR Main Entry Point
 * Agentic Second-Brain Runtime (ASBR) - Brain-only orchestration runtime
 */

// Core exports
export { ASBRServer } from './api/server.js';
export {
  ASBRClient,
  createASBRClient,
  createTaskInput,
  createIdempotencyKey,
} from './sdk/index.js';

// Configuration and XDG
export { loadConfig, saveConfig, getFullConfig } from './core/config.js';
export { initializeXDG, getXDGPaths } from './xdg/index.js';

// Event system
export { EventManager, getEventManager, createA11yEvent } from './core/events.js';

// Diff and normalization
export { ContentNormalizer, createNormalizer } from './diff/normalizer.js';
export { DiffGenerator, createDiffGenerator } from './diff/generator.js';
export { DiffValidator, createDiffValidator } from './diff/validator.js';

// Evidence system
export { EvidenceCollector } from './evidence/collector.js';
export { EvidenceStorage } from './evidence/storage.js';

// MCP and security
export { MCPSandbox, MCPToolRegistry } from './mcp/sandbox.js';
export { OWASPLLMGuard, createDefaultSecurityPolicy } from './security/owasp-llm-guard.js';

// Accessibility
export {
  AriaAnnouncer,
  createDefaultAccessibilityProfile,
  createAccessibilityProfileFromProfile,
} from './accessibility/aria-announcer.js';
export {
  KeyboardNavigationManager,
  getKeyboardNavigationManager,
  createFocusableElement,
} from './accessibility/keyboard-nav.js';

// Authentication
export {
  initializeAuth,
  generateToken,
  validateToken,
  revokeToken,
  cleanupExpiredTokens,
} from './api/auth.js';

// Types
export type {
  // Core types
  Task,
  TaskInput,
  TaskRef,
  Evidence,
  EvidencePointer,
  Profile,
  ArtifactRef,
  Event,
  Config,
  XDGPaths,

  // API types
  CreateTaskRequest,
  CreateTaskResponse,
  GetTaskResponse,
  ListArtifactsQuery,
  ListArtifactsResponse,

  // SDK types
  UnsubscribeFunction,

  // Evidence types
  EvidenceRisk,

  // Security types
  SecurityPolicy,
  SecurityRule,
  MCPAllowlistEntry,

  // Accessibility types
  AriaLivePriority,
  AnnouncementType,

  // Event types
  EventType,

  // Error types
  ASBRError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from './types/index.js';

// Default configuration
export { DEFAULT_CONFIG } from './core/config.js';

/**
 * Initialize ASBR with default configuration
 */
export async function initializeASBR(
  options: {
    port?: number;
    host?: string;
    autoStart?: boolean;
  } = {},
): Promise<{
  server: ASBRServer;
  client: ASBRClient;
  token: string;
}> {
  // Initialize XDG directories
  await initializeXDG();

  // Initialize authentication
  const tokenInfo = await initializeAuth();

  // Create server
  const server = new ASBRServer({
    port: options.port || 7439,
    host: options.host || '127.0.0.1',
  });

  // Start server if requested
  if (options.autoStart !== false) {
    await server.start();
  }

  // Create client
  const client = createASBRClient({
    baseUrl: `http://${options.host || '127.0.0.1'}:${options.port || 7439}`,
    token: tokenInfo.token,
  });

  return {
    server,
    client,
    token: tokenInfo.token,
  };
}

/**
 * ASBR Version
 */
export const VERSION = '1.0.0';

/**
 * ASBR Schema Versions
 */
export const SCHEMA_VERSIONS = {
  TASK: 'cortex.task@1',
  TASK_INPUT: 'cortex.task.input@1',
  EVIDENCE: 'cortex.evidence@1',
  ARTIFACT: 'cortex.artifact@1',
  PROFILE: 'cortex.profile@1',
} as const;
