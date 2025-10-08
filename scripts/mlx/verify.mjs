#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotenv } from '../utils/dotenv-loader.mjs';

await loadDotenv({ debug: Boolean(process.env.DEBUG || process.env.VERBOSE) });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const script = resolve(__dirname, 'verify.py');
const res = spawnSync('python3', [script], { stdio: 'inherit' });
process.exit(res.status ?? 1);
