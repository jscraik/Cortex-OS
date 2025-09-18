import { createRedactor, createTopicAcl } from '@cortex-os/a2a';
import {
	createBurstSmoother,
	createPerAgentQuota,
	createQuota,
	createRateLimiter,
	serviceMetrics,
} from '@cortex-os/a2a-common';
import { busMetrics } from '@cortex-os/a2a-core';
import express from 'express';
import { type SchemaRepository, SqliteSchemaRepository } from './database';
import { type Schema, schemaForSchema } from './schemas';

function isValidVersion(version: string): boolean {
	return /^\d+\.\d+\.\d+$/.test(version);
}

// Sorts versions in descending order (e.g., 2.0.0, 1.1.0, 1.0.0)
function compareVersions(a: string, b: string): number {
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

export interface RegistryServiceOptions {
	enableSmoothing?: boolean;
	enableQuota?: boolean;
	enablePerAgentQuota?: boolean;
	aclConfig?: Parameters<typeof createTopicAcl>[0];
	redactionPaths?: string[]; // simple path redactor
	databasePath?: string; // path to SQLite database file
}

export function createService(opts: RegistryServiceOptions = {}) {
	const {
		enableSmoothing = envFlag('SCHEMA_SVC_SMOOTHING', true),
		enableQuota = envFlag('SCHEMA_SVC_GLOBAL_QUOTA', true),
		enablePerAgentQuota = envFlag('SCHEMA_SVC_PER_AGENT_QUOTA', true),
		aclConfig,
		redactionPaths = envList('SCHEMA_SVC_REDACT_PATHS', ['schema.secret', 'schema.credentials']),
		databasePath = process.env.SCHEMA_REGISTRY_DB_PATH || ':memory:',
	} = opts;

	const app = express();
	app.use(express.json());

	// Resolve numeric/env configs
	const ratePerSec = envNumber('SMOOTH_RATE_PER_SEC', 10);
	const burst = envNumber('SMOOTH_BURST', 20);
	const rlLimit = envNumber('RATE_LIMIT', 50);
	const rlWindow = envNumber('RATE_LIMIT_WINDOW_MS', 60_000);
	const quotaGlobal = envNumber('QUOTA_GLOBAL_LIMIT', 500);
	const quotaWindow = envNumber('QUOTA_WINDOW_MS', 60_000);
	const perAgentGlobal = envNumber('PER_AGENT_GLOBAL_LIMIT', quotaGlobal);
	const perAgentLimit = envNumber('PER_AGENT_LIMIT', 100);
	const perAgentWindow = envNumber('PER_AGENT_WINDOW_MS', quotaWindow);

	// Keep references for metrics
	const smoother = enableSmoothing ? createBurstSmoother({ ratePerSec, burst }) : undefined;
	if (smoother) app.use(smoother);
	const rateLimiter = createRateLimiter({ limit: rlLimit, windowMs: rlWindow });
	app.use(rateLimiter);
	const quotaMw = enableQuota
		? createQuota({ globalLimit: quotaGlobal, windowMs: quotaWindow })
		: undefined;
	if (quotaMw) app.use(quotaMw);
	const perAgentQuotaMw = enablePerAgentQuota
		? createPerAgentQuota({
				globalLimit: perAgentGlobal,
				perAgentLimit,
				windowMs: perAgentWindow,
			})
		: undefined;
	if (perAgentQuotaMw) app.use(perAgentQuotaMw);

	const acl = aclConfig ? createTopicAcl(aclConfig) : undefined;
	const redactor = createRedactor({
		redactPaths: redactionPaths,
		replacement: '***',
	});

	// Initialize database repository
	let schemaRepository: SchemaRepository;
	try {
		schemaRepository = new SqliteSchemaRepository(databasePath);
		console.log(`Schema registry initialized with database: ${databasePath}`);
	} catch (error) {
		console.error('Failed to initialize database, falling back to in-memory storage:', error);
		// Fallback to in-memory storage
		const inMemorySchemas: Schema[] = [];
		schemaRepository = {
			async save(schema: Schema): Promise<void> {
				const exists = inMemorySchemas.some(
					(s) => s.name === schema.name && s.version === schema.version,
				);
				if (!exists) {
					inMemorySchemas.push(schema);
				}
			},
			async findByName(name: string): Promise<Schema[]> {
				return inMemorySchemas.filter((s) => s.name === name);
			},
			async findByNameAndVersion(name: string, version: string): Promise<Schema | null> {
				const schema = inMemorySchemas.find((s) => s.name === name && s.version === version);
				return schema || null;
			},
			async findAll(): Promise<Schema[]> {
				return [...inMemorySchemas];
			},
			async deleteByNameAndVersion(name: string, version: string): Promise<boolean> {
				const _initialLength = inMemorySchemas.length;
				const index = inMemorySchemas.findIndex((s) => s.name === name && s.version === version);
				if (index !== -1) {
					inMemorySchemas.splice(index, 1);
					return true;
				}
				return false;
			},
		};
	}

	// ACL Middleware (example: protect POST and list GET by treating them as pseudo topics)
	app.use((req, res, next) => {
		if (!acl) return next();
		// Map route to pseudo topic + intent (publish for POST, subscribe for GET)
		const intent = req.method === 'POST' ? 'publish' : 'subscribe';
		const pseudoTopic = 'registry.schemas';
		const role = (req.headers['x-role'] as string) || 'anonymous';
		const decision =
			intent === 'publish'
				? acl.canPublish(pseudoTopic, role)
				: acl.canSubscribe(pseudoTopic, role);
		if (!decision.allowed) {
			return res.status(403).json({ error: 'Forbidden', reason: decision.reason });
		}
		return next();
	});

	app.post('/schemas', async (req, res) => {
		const parsed = schemaForSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ issues: parsed.error.issues });
		}
		const schema = parsed.data;
		if (!isValidVersion(schema.version)) {
			return res.status(400).send('Invalid version');
		}

		try {
			// Check if schema already exists
			const existing = await schemaRepository.findByNameAndVersion(schema.name, schema.version);
			if (existing) {
				return res.status(409).send('Schema already exists');
			}

			// Save the schema
			await schemaRepository.save(schema);

			const location = `/schemas/${schema.name}/${schema.version}`;
			res.setHeader('Location', location);
			res.status(201).json({ ...schema, location });
		} catch (error) {
			console.error('Failed to save schema:', error);
			res.status(500).send('Internal server error');
		}
	});

	app.get('/schemas', async (_req, res) => {
		try {
			// Get all schemas and redact potential sensitive fields
			const allSchemas = await schemaRepository.findAll();
			res.json(allSchemas.map((s) => redactor.redact(s)));
		} catch (error) {
			console.error('Failed to retrieve schemas:', error);
			res.status(500).send('Internal server error');
		}
	});

	app.get('/schemas/:name', async (req, res) => {
		try {
			const { name } = req.params;
			const namedSchemas = await schemaRepository.findByName(name);
			res.json(namedSchemas.map((s) => redactor.redact(s)));
		} catch (error) {
			console.error('Failed to retrieve schemas by name:', error);
			res.status(500).send('Internal server error');
		}
	});

	app.get('/schemas/:name/latest', async (req, res) => {
		try {
			const { name } = req.params;
			const candidates = await schemaRepository.findByName(name);
			if (candidates.length === 0) {
				return res.status(404).send('Schema not found');
			}
			const sorted = candidates.slice().sort((a, b) => compareVersions(a.version, b.version));
			const latest = redactor.redact(sorted[0]);
			res.json(latest);
		} catch (error) {
			console.error('Failed to retrieve latest schema:', error);
			res.status(500).send('Internal server error');
		}
	});

	app.get('/schemas/:name/:version', async (req, res) => {
		try {
			const { name, version } = req.params;
			const schema = await schemaRepository.findByNameAndVersion(name, version);
			if (schema) {
				res.json(redactor.redact(schema));
			} else {
				res.status(404).send('Schema not found');
			}
		} catch (error) {
			console.error('Failed to retrieve schema by name and version:', error);
			res.status(500).send('Internal server error');
		}
	});

	// Metrics endpoint (in-memory snapshot; zero allocations beyond serialization)
	app.get('/metrics', (_req, res) => {
		res.json({
			uptimeMs: process.uptime() * 1000,
			smoothing: smoother ? smoother.metrics?.() : undefined,
			config: {
				ratePerSec,
				burst,
				rlLimit,
				rlWindow,
				quotaGlobal,
				quotaWindow,
				perAgentGlobal,
				perAgentLimit,
				perAgentWindow,
			},
		});
	});

	// Optional Prometheus metrics (now wired to real counters)
	if (envFlag('ENABLE_PROM_METRICS', false)) {
		app.get('/metrics/prom', (_req, res) => {
			const bm = busMetrics();
			const sm = serviceMetrics();
			const lines: string[] = [];
			lines.push('# HELP a2a_bus_events_total Total events published');
			lines.push('# TYPE a2a_bus_events_total counter');
			lines.push(`a2a_bus_events_total ${bm.eventsPublished}`);
			lines.push(
				'# HELP a2a_bus_duplicates_dropped_total Total duplicate events dropped by idempotency',
			);
			lines.push('# TYPE a2a_bus_duplicates_dropped_total counter');
			lines.push(`a2a_bus_duplicates_dropped_total ${bm.duplicatesDropped}`);
			lines.push(
				'# HELP a2a_quota_global_reject_total Total requests rejected due to global quota',
			);
			lines.push('# TYPE a2a_quota_global_reject_total counter');
			lines.push(`a2a_quota_global_reject_total ${sm.quotaGlobalReject}`);
			lines.push(
				'# HELP a2a_quota_agent_reject_total Total requests rejected due to per-agent quota',
			);
			lines.push('# TYPE a2a_quota_agent_reject_total counter');
			lines.push(`a2a_quota_agent_reject_total ${sm.quotaAgentReject}`);
			res.setHeader('Content-Type', 'text/plain; version=0.0.4');
			res.send(`${lines.join('\n')}\n`);
		});
	}

	return app;
}

// --- environment helpers (kept local; consider extracting if reused) ---
function envFlag(name: string, def: boolean): boolean {
	const v = process.env[name];
	if (v === undefined) return def;
	return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}
function envNumber(name: string, def: number): number {
	const v = process.env[name];
	if (!v) return def;
	const n = Number(v);
	return Number.isFinite(n) ? n : def;
}
function envList(name: string, def: string[]): string[] {
	const v = process.env[name];
	if (!v) return def;
	return v
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}
