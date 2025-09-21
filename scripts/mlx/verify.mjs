#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Auto-load .env.local if present (for MLX_* envs like MLX_MODEL_PATH)
try {
	const dotenv = await import('dotenv');
	dotenv.config({ path: resolve(process.cwd(), '.env.local') });
} catch (err) {
	if (process.env.DEBUG || process.env.VERBOSE) {
		console.warn('[mlx:verify] dotenv not loaded:', err?.message ?? String(err));
	}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const script = resolve(__dirname, 'verify.py');
const res = spawnSync('python3', [script], { stdio: 'inherit' });
process.exit(res.status ?? 1);
