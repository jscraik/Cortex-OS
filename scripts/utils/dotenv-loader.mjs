import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CANDIDATES = ['.env.local', '.env'];
const LOG_PREFIX = '[brAInwav][env]';

const logWith = (logger, level, message) => {
	if (typeof logger?.[level] === 'function') {
		logger[level](message);
		return;
	}
	if (typeof logger?.info === 'function') {
		logger.info(message);
		return;
	}
	console.log(message);
};

const unique = (values) => {
	const seen = new Set();
	const result = [];
	for (const value of values) {
		if (!value || seen.has(value)) continue;
		seen.add(value);
		result.push(value);
	}
	return result;
};

const resolveCandidates = (cwd, rawCandidates = []) => {
	const fromEnv = process.env.BRAINWAV_ENV_FILE ? [process.env.BRAINWAV_ENV_FILE] : [];
	const list = [...fromEnv, ...rawCandidates, ...DEFAULT_CANDIDATES];
	return unique(
		list.map((candidate) =>
			path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate),
		),
	);
};

const detectStats = (candidate) => {
	try {
		return fs.statSync(candidate);
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error;
		return null;
	}
};

const loadFromPath = (dotenv, candidate, override, logger) => {
	const result = dotenv.config({ path: candidate, override });
	if (result.error) throw result.error;
	logWith(logger, 'info', `${LOG_PREFIX} loaded environment from ${candidate}`);
	return result;
};

export const loadDotenv = async ({
	cwd = process.cwd(),
	candidates = [],
	logger = console,
	override = false,
} = {}) => {
	let dotenv;
	try {
		dotenv = await import('dotenv');
	} catch (error) {
		logWith(
			logger,
			'warn',
			`${LOG_PREFIX} dotenv dependency missing. Skipping env file loading (${error.message}).`,
		);
		return { loaded: false, path: null, parsed: {}, reason: 'missing-dotenv' };
	}

	const resolved = resolveCandidates(cwd, candidates);
	if (resolved.length === 0) {
		logWith(logger, 'warn', `${LOG_PREFIX} no env file candidates discovered`);
		return { loaded: false, path: null, parsed: {}, reason: 'no-candidates' };
	}

	for (const candidate of resolved) {
		let stats;
		try {
			stats = detectStats(candidate);
		} catch (error) {
			logWith(logger, 'warn', `${LOG_PREFIX} failed to inspect ${candidate}: ${error.message}`);
			continue;
		}
		if (!stats) continue;

		const fifo = typeof stats.isFIFO === 'function' && stats.isFIFO();
		if (fifo) {
			logWith(
				logger,
				'info',
				`${LOG_PREFIX} detected secure 1Password pipe at ${candidate}. Approve the 1Password prompt to stream secrets.`,
			);
		}

		try {
			const result = loadFromPath(dotenv, candidate, override, logger);
			return { loaded: true, path: candidate, parsed: result.parsed ?? {}, fifo };
		} catch (error) {
			const label = fifo ? 'secure pipe' : 'file';
			logWith(
				logger,
				'warn',
				`${LOG_PREFIX} unable to read ${label} ${candidate}: ${error.message}`,
			);
		}
	}

	logWith(
		logger,
		'warn',
		`${LOG_PREFIX} no env files could be loaded (checked ${resolved.length} candidates)`,
	);
	return { loaded: false, path: null, parsed: {}, reason: 'not-found' };
};
