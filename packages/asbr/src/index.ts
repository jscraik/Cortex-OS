/**
 * ASBR Main Entry Point
 * Agentic Second-Brain Runtime (ASBR) - Brain-only orchestration runtime
 */

// Direct imports for internal use
import { initializeAuth } from './api/auth.js';
import { type ASBRServer, createASBRServer } from './api/server.js';
import { type ASBRClient, createASBRClient } from './sdk/index.js';
import { ValidationError } from './types/index.js';
import { initializeXDG } from './xdg/index.js';

export type { ASBRServer } from './api/server.js';
// Core exports
export { createASBRServer } from './api/server.js';
// Configuration and XDG
export { getFullConfig, loadConfig, saveConfig } from './core/config.js';
export {
	ASBRClient,
	createASBRClient,
	createIdempotencyKey,
	createTaskInput,
} from './sdk/index.js';
export { getXDGPaths, initializeXDG } from './xdg/index.js';

// Event system

// Accessibility
export {
	AriaAnnouncer,
	createAccessibilityProfileFromProfile,
	createDefaultAccessibilityProfile,
} from './accessibility/aria-announcer.js';
export {
	createFocusableElement,
	getKeyboardNavigationManager,
	KeyboardNavigationManager,
} from './accessibility/keyboard-nav.js';
// Authentication
export {
	cleanupExpiredTokens,
	generateToken,
	initializeAuth,
	revokeToken,
	validateToken,
} from './api/auth.js';
export type {
	CritiqueOptions,
	CritiqueResult,
	Plan,
	PlanningContext,
	PlanOptions,
	PlanStatus,
	PlanStep,
	SimulationGate,
	SimulationOptions,
	SimulationResult,
	TeachingOptions,
	TeachingSession,
} from './cerebrum/index.js';
// Cerebrum - Meta-agent layer
export { Cerebrum, Critique } from './cerebrum/index.js';
// Default configuration
export { DEFAULT_CONFIG } from './core/config.js';
export type { EventManager } from './core/events.js';
export {
	createA11yEvent,
	createEventManager,
	getEventManager,
} from './core/events.js';
// Diff and normalization
export { createDiffGenerator, DiffGenerator } from './diff/generator.js';
export { ContentNormalizer, createNormalizer } from './diff/normalizer.js';
export { createDiffValidator, DiffValidator } from './diff/validator.js';
// Evidence system
export { EvidenceCollector } from './evidence/collector.js';
export { EvidenceStorage } from './evidence/storage.js';
// MCP and security
export { MCPSandbox, MCPToolRegistry } from './mcp/sandbox.js';
export {
	createDefaultSecurityPolicy,
	OWASPLLMGuard,
} from './security/owasp-llm-guard.js';
// Types
export type {
	AnnouncementType,
	// Accessibility types
	AriaLivePriority,
	ArtifactRef,
	// Error types
	ASBRError,
	AuthenticationError,
	AuthorizationError,
	Config,
	// API types
	CreateTaskRequest,
	CreateTaskResponse,
	Event,
	// Event types
	EventType,
	Evidence,
	EvidencePointer,
	// Evidence types
	EvidenceRisk,
	GetTaskResponse,
	ListArtifactsQuery,
	ListArtifactsResponse,
	MCPAllowlistEntry,
	NotFoundError,
	Profile,
	// Security types
	SecurityPolicy,
	SecurityRule,
	// Core types
	Task,
	TaskInput,
	TaskRef,
	// SDK types
	UnsubscribeFunction,
	ValidationError,
	XDGPaths,
} from './types/index.js';

/**
 * Initialize ASBR with default configuration
 */
export async function initializeASBR(
	options: { port?: number; host?: string; autoStart?: boolean } = {},
): Promise<{
	server: ASBRServer;
	client: ASBRClient;
	token: string;
}> {
	// Initialize XDG directories
	await initializeXDG();

	// Initialize authentication
	let tokenInfo: { token: string };
	try {
		tokenInfo = await initializeAuth();
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new ValidationError(`Failed to initialize ASBR: ${msg}`);
	}

	// Create server
	const server = createASBRServer({
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
};
