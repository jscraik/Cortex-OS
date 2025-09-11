import { createRateLimiter } from '@cortex-os/a2a-common';
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

export function createService() {
	const app = express();
	app.use(express.json());
	app.use(createRateLimiter());

	// NOTE: This is a simplified schema registry for demonstration purposes.
	// It uses in-memory storage and will lose all data on restart.
	// For production use, a persistent database (e.g., PostgreSQL, MongoDB) should be used.
	const schemas: Schema[] = [];

	app.post('/schemas', (req, res) => {
		const parsed = schemaForSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ issues: parsed.error.issues });
		}
		const schema = parsed.data;
		if (!isValidVersion(schema.version)) {
			return res.status(400).send('Invalid version');
		}
		const exists = schemas.some(
			(s) => s.name === schema.name && s.version === schema.version,
		);
		if (exists) {
			return res.status(409).send('Schema already exists');
		}
		schemas.push(schema);
		const location = `/schemas/${schema.name}/${schema.version}`;
		res.setHeader('Location', location);
		res.status(201).json({ ...schema, location });
	});

	app.get('/schemas', (_req, res) => {
		res.json(schemas);
	});

	app.get('/schemas/:name', (req, res) => {
		const { name } = req.params;
		const namedSchemas = schemas.filter((s) => s.name === name);
		res.json(namedSchemas);
	});

	app.get('/schemas/:name/latest', (req, res) => {
		const { name } = req.params;
		const candidates = schemas.filter((s) => s.name === name);
		if (candidates.length === 0) {
			return res.status(404).send('Schema not found');
		}
		const sorted = candidates
			.slice()
			.sort((a, b) => compareVersions(a.version, b.version));
		const latest = sorted[0];
		res.json(latest);
	});

	app.get('/schemas/:name/:version', (req, res) => {
		const { name, version } = req.params;
		const schema = schemas.find(
			(s) => s.name === name && s.version === version,
		);
		if (schema) {
			res.json(schema);
		} else {
			res.status(404).send('Schema not found');
		}
	});

	return app;
}
