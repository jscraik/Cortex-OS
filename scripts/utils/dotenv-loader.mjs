import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_FILES = ['.env.local', '.env'];
const BRAND = '[brAInwav][dotenv-loader]';
let cachedDotenv;

const isDebugEnabled = (explicit) => explicit ?? process.env.BRAINWAV_ENV_DEBUG === '1';

const logMessage = (level, message) => {
	const logger = typeof console[level] === 'function' ? console[level] : console.log;
	logger(`${BRAND} ${message}`);
};

const createResult = (candidate, overrides) => ({
	path: candidate.path,
	source: candidate.source,
	...overrides,
});

const resolveCandidates = (cwd) => {
	const results = [];
	const seen = new Set();
	const pushCandidate = (filePath, source) => {
		const normalized = path.resolve(cwd, filePath);
		if (seen.has(normalized)) return;
		seen.add(normalized);
		results.push({ path: normalized, source });
	};
	const override = process.env.BRAINWAV_ENV_FILE?.trim();
	if (override) {
		pushCandidate(override, 'BRAINWAV_ENV_FILE');
	}
	for (const file of DEFAULT_FILES) {
		pushCandidate(file, file);
	}
	return results;
};

const statPath = (filePath, debug) => {
	try {
		return fs.statSync(filePath);
	} catch (error) {
		if (debug) {
			const reason = error instanceof Error ? error.message : String(error);
			logMessage('debug', `stat failed for ${filePath}: ${reason}`);
		}
		return undefined;
	}
};

const ensureDotenv = async () => {
	if (!cachedDotenv) {
		cachedDotenv = await import('dotenv');
	}
	return cachedDotenv;
};

const loadCandidateFile = async (candidate, debug) => {
	const stats = statPath(candidate.path, debug);
	if (!stats) {
		return createResult(candidate, { skipped: true, reason: 'missing' });
	}
	if (stats.isFIFO()) {
		logMessage(
			'warn',
			`detected FIFO at ${candidate.path}. Use 'op run' to stream secrets instead of direct dotenv access.`,
		);
		return createResult(candidate, { skipped: true, reason: 'fifo' });
	}
	if (!stats.isFile()) {
		logMessage('warn', `skipping ${candidate.path} because it is not a regular file.`);
		return createResult(candidate, { skipped: true, reason: 'not-file' });
	}
	const dotenv = await ensureDotenv();
	const result = dotenv.config({ path: candidate.path });
	if (result.error) {
		const reason = result.error instanceof Error ? result.error.message : String(result.error);
		logMessage('warn', `failed loading ${candidate.path}: ${reason}`);
		return createResult(candidate, {
			skipped: true,
			reason: 'dotenv-error',
			error: reason,
		});
	}
	if (debug) {
		logMessage('info', `loaded environment variables from ${candidate.path}`);
	}
	return createResult(candidate, { skipped: false, parsed: result.parsed });
};

export const loadDotenv = async (options = {}) => {
	const cwd = options.cwd ?? process.cwd();
	const debug = isDebugEnabled(options.debug);
	for (const candidate of resolveCandidates(cwd)) {
		if (debug) {
			logMessage('debug', `examining candidate ${candidate.source} -> ${candidate.path}`);
		}
		const outcome = await loadCandidateFile(candidate, debug);
		if (!outcome.skipped) {
			return outcome;
		}
		if (outcome.reason === 'fifo' || outcome.reason === 'dotenv-error') {
			return outcome;
		}
	}
	if (debug) {
		logMessage('debug', 'no dotenv file loaded. checked default candidates only.');
	}
	return { skipped: true, reason: 'not-found' };
};
