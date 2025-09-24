import { z } from 'zod';

/**
 * a2a-services MCP Tooling
 * ---------------------------------
 * Exposes service registry, discovery, and management operations via MCP tools.
 * This initial implementation provides an in-memory store abstraction. It can be
 * swapped with a persistent backend (e.g. Redis/Postgres) without changing the
 * public tool contracts.
 */

// ----------------------------
// Error Formatting
// ----------------------------
export interface McpToolResultContent {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

function ok(text: string): McpToolResultContent {
	return { content: [{ type: 'text', text }] };
}

function error(code: string, message: string, details?: unknown): McpToolResultContent {
	const body = JSON.stringify({ error: { code, message, details } }, null, 2);
	return { content: [{ type: 'text', text: body }], isError: true };
}

// ----------------------------
// Core Domain Types
// ----------------------------
export interface ServiceMetadata {
	description?: string;
	capabilities?: string[];
	tags?: string[];
	owner?: string;
}

export interface ServiceVersionRecord {
	version: string;
	endpoint: string;
	healthCheck?: string;
	metadata?: ServiceMetadata;
	disabled?: boolean;
	createdAt: string;
	updatedAt: string;
	quota?: { limit: number; windowSeconds: number };
	stats: { calls: number; errors: number };
}

export interface ServiceRecord {
	name: string;
	latest: string; // version string
	versions: Map<string, ServiceVersionRecord>;
}

// Simple in-memory service registry (process scoped) ---------------------------------
const services = new Map<string, ServiceRecord>();

// Basic rate limiting per tool (sliding window naive) --------------------------------
interface RateState {
	count: number;
	windowStart: number;
}
const rateState = new Map<string, RateState>();
const RATE_LIMIT = 60; // ops per window
const RATE_WINDOW_MS = 60_000;

function checkRate(tool: string): boolean {
	const now = Date.now();
	const state = rateState.get(tool);
	if (!state) {
		rateState.set(tool, { count: 1, windowStart: now });
		return true;
	}
	if (now - state.windowStart > RATE_WINDOW_MS) {
		state.count = 1;
		state.windowStart = now;
		return true;
	}
	state.count += 1;
	return state.count <= RATE_LIMIT;
}

// Security placeholder (inject later) -------------------------------------------------
function securityCheck(_operation: string): void {
	// Placeholder: integrate with security/access control package.
	return; // No-op for now.
}

// Input Sanitization ------------------------------------------------------------------
function sanitizeString(v: unknown): string | undefined {
	if (typeof v !== 'string') return undefined;
	const trimmed = v.trim();
	return trimmed.length ? trimmed : undefined;
}

// ----------------------------
// Zod Schemas (Contracts)
// ----------------------------
export const RegisterServiceInputSchema = z.object({
	name: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-_:.]+$/i, 'Invalid service name'),
	version: z.string().min(1).default('0.1.0'),
	endpoint: z.string().url(),
	healthCheck: z.string().url().optional(),
	metadata: z
		.object({
			description: z.string().max(500).optional(),
			capabilities: z.array(z.string().min(1)).max(50).optional(),
			tags: z.array(z.string().min(1)).max(25).optional(),
			owner: z.string().optional(),
		})
		.optional(),
	replaceExisting: z.boolean().default(false),
});

export const GetServiceInputSchema = z.object({
	name: z.string(),
	version: z.string().optional(), // latest if omitted
	includeDisabled: z.boolean().default(false),
});

export const ListServicesInputSchema = z.object({
	capability: z.string().optional(),
	tag: z.string().optional(),
	includeDisabled: z.boolean().default(false),
	limit: z.number().int().positive().max(200).default(50),
});

export const DiscoverServiceInputSchema = z.object({
	name: z.string().optional(),
	capability: z.string().optional(),
	healthyOnly: z.boolean().default(true),
});

export const ManageServiceInputSchema = z.object({
	name: z.string(),
	version: z.string().optional(),
	action: z.enum(['enable', 'disable', 'set_quota', 'purge_cache']),
	quota: z
		.object({
			limit: z.number().int().positive(),
			windowSeconds: z.number().int().positive(),
		})
		.optional(),
});

export const GetServiceMetricsInputSchema = z.object({
	name: z.string(),
	version: z.string().optional(),
});

// ----------------------------
// MCP Tool Definitions (no runtime binding here – consumer wires handlers)
// ----------------------------
export interface A2aServicesTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
	handler: (input: Record<string, unknown>) => Promise<McpToolResultContent>;
}

// Internal helpers --------------------------------------------------------------------
function getOrCreateService(name: string): ServiceRecord {
	let rec = services.get(name);
	if (!rec) {
		rec = { name, latest: '0.0.0', versions: new Map() };
		services.set(name, rec);
	}
	return rec;
}

function resolveVersion(record: ServiceRecord, version?: string): ServiceVersionRecord | undefined {
	const target = version ?? record.latest;
	return record.versions.get(target);
}

// Handlers ---------------------------------------------------------------------------
async function registerServiceHandler(
	input: Record<string, unknown>,
): Promise<McpToolResultContent> {
	await Promise.resolve(); // placeholder to satisfy async rule & future IO
	if (!checkRate('register_service')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('register_service');
	let parsed: z.infer<typeof RegisterServiceInputSchema>;
	try {
		parsed = RegisterServiceInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}
	const nowIso = new Date().toISOString();
	const nameSanitized = sanitizeString(parsed.name);
	if (!nameSanitized) return error('VALIDATION_ERROR', 'Service name empty after sanitization');
	const name = nameSanitized;
	const version = sanitizeString(parsed.version) || '0.1.0';
	const service = getOrCreateService(name);
	const existing = service.versions.get(version);
	if (existing && !parsed.replaceExisting) {
		return error('ALREADY_EXISTS', `Service ${name}@${version} already registered`);
	}
	const record: ServiceVersionRecord = {
		version,
		endpoint: parsed.endpoint.trim(),
		healthCheck: parsed.healthCheck?.trim(),
		metadata: parsed.metadata,
		disabled: false,
		createdAt: existing ? existing.createdAt : nowIso,
		updatedAt: nowIso,
		quota: existing?.quota,
		stats: existing?.stats || { calls: 0, errors: 0 },
	};
	service.versions.set(version, record);
	service.latest = version; // naive latest strategy: last registered wins
	return ok(`Registered service ${name}@${version}`);
}

async function getServiceHandler(input: Record<string, unknown>): Promise<McpToolResultContent> {
	await Promise.resolve();
	if (!checkRate('get_service')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('get_service');
	let parsed: z.infer<typeof GetServiceInputSchema>;
	try {
		parsed = GetServiceInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}
	const service = services.get(parsed.name);
	if (!service) return error('NOT_FOUND', `Service ${parsed.name} not found`);
	const versionRec = resolveVersion(service, parsed.version);
	if (!versionRec) return error('NOT_FOUND', `Version not found for ${parsed.name}`);
	if (versionRec.disabled && !parsed.includeDisabled)
		return error('DISABLED', 'Service version is disabled');
	return {
		content: [{ type: 'text', text: JSON.stringify(versionRec, null, 2) }],
	};
}

async function listServicesHandler(input: Record<string, unknown>): Promise<McpToolResultContent> {
	await Promise.resolve(); // keep async for future backend adapters
	if (!checkRate('list_services')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('list_services');
	let parsed: z.infer<typeof ListServicesInputSchema>;
	try {
		parsed = ListServicesInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}
	const out: Array<{
		name: string;
		version: string;
		endpoint: string;
		capabilities?: string[];
		disabled?: boolean;
	}> = [];
	for (const service of services.values()) {
		for (const v of service.versions.values()) {
			const row = filterServiceVersion(service.name, v, parsed);
			if (row) out.push(row);
			if (out.length >= parsed.limit) break;
		}
		if (out.length >= parsed.limit) break;
	}
	return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
}

function filterServiceVersion(
	serviceName: string,
	v: ServiceVersionRecord,
	parsed: z.infer<typeof ListServicesInputSchema>,
): {
	name: string;
	version: string;
	endpoint: string;
	capabilities?: string[];
	disabled?: boolean;
} | null {
	if (v.disabled && !parsed.includeDisabled) return null;
	if (parsed.capability && !v.metadata?.capabilities?.includes(parsed.capability)) return null;
	if (parsed.tag && !v.metadata?.tags?.includes(parsed.tag)) return null;
	return {
		name: serviceName,
		version: v.version,
		endpoint: v.endpoint,
		capabilities: v.metadata?.capabilities,
		disabled: v.disabled,
	};
}

async function discoverServiceHandler(
	input: Record<string, unknown>,
): Promise<McpToolResultContent> {
	if (!checkRate('discover_service')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('discover_service');
	let parsed: z.infer<typeof DiscoverServiceInputSchema>;
	try {
		parsed = DiscoverServiceInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}

	if (parsed.name) return discoverByName(parsed.name, parsed);
	return discoverByCapability(parsed);
}

async function discoverByName(
	name: string,
	parsed: z.infer<typeof DiscoverServiceInputSchema>,
): Promise<McpToolResultContent> {
	const s = services.get(name);
	if (!s) return error('NOT_FOUND', `Service ${name} not found`);
	const rec = resolveVersion(s);
	if (!rec) return error('NOT_FOUND', 'Latest version not found');
	const healthErr = await evaluateHealth(rec, parsed.healthyOnly);
	if (healthErr) return healthErr;
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(
					{ name: s.name, version: rec.version, endpoint: rec.endpoint },
					null,
					2,
				),
			},
		],
	};
}

async function discoverByCapability(
	parsed: z.infer<typeof DiscoverServiceInputSchema>,
): Promise<McpToolResultContent> {
	const matches: Array<{ name: string; version: string; endpoint: string }> = [];
	for (const s of services.values()) {
		const rec = resolveVersion(s);
		if (!rec || rec.disabled) continue;
		if (parsed.capability && !rec.metadata?.capabilities?.includes(parsed.capability)) continue;
		const healthErr = await evaluateHealth(rec, parsed.healthyOnly);
		if (healthErr) continue;
		matches.push({
			name: s.name,
			version: rec.version,
			endpoint: rec.endpoint,
		});
	}
	return {
		content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
	};
}

async function evaluateHealth(
	rec: ServiceVersionRecord,
	healthyOnly: boolean,
): Promise<McpToolResultContent | null> {
	if (!healthyOnly || !rec.healthCheck) return null;
	try {
		const res = await fetch(rec.healthCheck, { method: 'GET' });
		if (!res.ok) return error('UNHEALTHY', `Health check failed: ${res.status}`);
		return null;
	} catch (e) {
		return error('UNHEALTHY', `Health check error: ${e instanceof Error ? e.message : 'unknown'}`);
	}
}

async function manageServiceHandler(input: Record<string, unknown>): Promise<McpToolResultContent> {
	await Promise.resolve();
	if (!checkRate('manage_service')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('manage_service');
	let parsed: z.infer<typeof ManageServiceInputSchema>;
	try {
		parsed = ManageServiceInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}
	const service = services.get(parsed.name);
	if (!service) return error('NOT_FOUND', `Service ${parsed.name} not found`);
	const rec = resolveVersion(service, parsed.version);
	if (!rec) return error('NOT_FOUND', 'Version not found');
	switch (parsed.action) {
		case 'enable':
			rec.disabled = false;
			rec.updatedAt = new Date().toISOString();
			return ok(`Enabled ${service.name}@${rec.version}`);
		case 'disable':
			rec.disabled = true;
			rec.updatedAt = new Date().toISOString();
			return ok(`Disabled ${service.name}@${rec.version}`);
		case 'set_quota':
			if (!parsed.quota) return error('VALIDATION_ERROR', 'quota required for set_quota');
			rec.quota = parsed.quota;
			rec.updatedAt = new Date().toISOString();
			return ok(`Updated quota for ${service.name}@${rec.version}`);
		case 'purge_cache':
			// Future: integrate with distributed cache invalidation. Here it is a no-op.
			return ok(`Cache purged for ${service.name}@${rec.version}`);
		default:
			return error('UNSUPPORTED_ACTION', 'Unsupported management action');
	}
}

async function getServiceMetricsHandler(
	input: Record<string, unknown>,
): Promise<McpToolResultContent> {
	await Promise.resolve();
	if (!checkRate('get_service_metrics')) return error('RATE_LIMIT', 'Rate limit exceeded');
	securityCheck('get_service_metrics');
	let parsed: z.infer<typeof GetServiceMetricsInputSchema>;
	try {
		parsed = GetServiceMetricsInputSchema.parse(input);
	} catch (e) {
		return error('VALIDATION_ERROR', e instanceof Error ? e.message : 'Invalid input');
	}
	const service = services.get(parsed.name);
	if (!service) return error('NOT_FOUND', `Service ${parsed.name} not found`);
	const rec = resolveVersion(service, parsed.version);
	if (!rec) return error('NOT_FOUND', 'Version not found');
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(
					{
						name: service.name,
						version: rec.version,
						stats: rec.stats,
						quota: rec.quota,
					},
					null,
					2,
				),
			},
		],
	};
}

export const a2aServicesMcpTools: A2aServicesTool[] = [
	{
		name: 'register_service',
		description: 'Register (or update) a service version in the registry',
		inputSchema: RegisterServiceInputSchema,
		handler: registerServiceHandler,
	},
	{
		name: 'get_service',
		description: 'Retrieve a specific service version or latest',
		inputSchema: GetServiceInputSchema,
		handler: getServiceHandler,
	},
	{
		name: 'list_services',
		description: 'List services with optional filtering',
		inputSchema: ListServicesInputSchema,
		handler: listServicesHandler,
	},
	{
		name: 'discover_service',
		description: 'Discover a service by name or capability (latest version)',
		inputSchema: DiscoverServiceInputSchema,
		handler: discoverServiceHandler,
	},
	{
		name: 'manage_service',
		description: 'Enable, disable, set quota, or purge cache for a service version',
		inputSchema: ManageServiceInputSchema,
		handler: manageServiceHandler,
	},
	{
		name: 'get_service_metrics',
		description: 'Retrieve metrics for a service version',
		inputSchema: GetServiceMetricsInputSchema,
		handler: getServiceMetricsHandler,
	},
];

// Public types
// ServiceRecord already exported above via interface declaration (no re-export needed)

// Test utilities (not part of public MCP surface). Prefixed with __ to indicate internal/testing usage.
export function __resetInMemoryA2aServicesRegistry() {
	services.clear();
	rateState.clear();
}
