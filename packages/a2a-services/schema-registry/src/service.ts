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
}

export function createService(opts: RegistryServiceOptions = {}) {
	const {
		enableSmoothing = envFlag('SCHEMA_SVC_SMOOTHING', true),
		enableQuota = envFlag('SCHEMA_SVC_GLOBAL_QUOTA', true),
		enablePerAgentQuota = envFlag('SCHEMA_SVC_PER_AGENT_QUOTA', true),
		aclConfig,
		redactionPaths = envList('SCHEMA_SVC_REDACT_PATHS', ['schema.secret', 'schema.credentials']),
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

	// NOTE: This is a simplified schema registry for demonstration purposes.
	// It uses in-memory storage and will lose all data on restart.
	// For production use, a persistent database (e.g., PostgreSQL, MongoDB) should be used.
	const schemas: Schema[] = [];

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

	app.post('/schemas', (req, res) => {
		const parsed = schemaForSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ issues: parsed.error.issues });
		}
		const schema = parsed.data;
		if (!isValidVersion(schema.version)) {
			return res.status(400).send('Invalid version');
		}
		const exists = schemas.some((s) => s.name === schema.name && s.version === schema.version);
		if (exists) {
			return res.status(409).send('Schema already exists');
		}
		schemas.push(schema);
		const location = `/schemas/${schema.name}/${schema.version}`;
		res.setHeader('Location', location);
		res.status(201).json({ ...schema, location });
	});

	app.get('/schemas', (_req, res) => {
		// redact potential sensitive fields before responding
		res.json(schemas.map((s) => redactor.redact(s)));
	});

	app.get('/schemas/:name', (req, res) => {
		const { name } = req.params;
		const namedSchemas = schemas.filter((s) => s.name === name).map((s) => redactor.redact(s));
		res.json(namedSchemas);
	});

	app.get('/schemas/:name/latest', (req, res) => {
		const { name } = req.params;
		const candidates = schemas.filter((s) => s.name === name);
		if (candidates.length === 0) {
			return res.status(404).send('Schema not found');
		}
		const sorted = candidates.slice().sort((a, b) => compareVersions(a.version, b.version));
		const latest = redactor.redact(sorted[0]);
		res.json(latest);
	});

	app.get('/schemas/:name/:version', (req, res) => {
		const { name, version } = req.params;
		const schema = schemas.find((s) => s.name === name && s.version === version);
		if (schema) {
			res.json(redactor.redact(schema));
		} else {
			res.status(404).send('Schema not found');
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
