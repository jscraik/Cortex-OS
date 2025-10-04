import fs from 'node:fs';
import path from 'node:path';

const defaultForbiddenTokens: readonly string[] = ['TODO:', 'Mock', 'not yet implemented'];
const defaultAllowlist: readonly RegExp[] = [
	/^docs\/.*$/,
	/^README\.md$/,
	/^tests\/regression\/__fixtures__\/placeholder-baseline\.json$/,
];
const defaultIncludedExtensions: readonly string[] = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.cts',
	'.mts',
	'.json',
	'.py',
	'.rs',
	'.go',
	'.java',
	'.kt',
	'.kts',
	'.swift',
	'.scala',
	'.cs',
	'.rb',
	'.php',
	'.sh',
	'.sql',
	'.yaml',
	'.yml',
	'.toml',
	'.ini',
	'.env',
];
const defaultIgnoredDirectories: readonly string[] = [
	'node_modules',
	'.git',
	'.cortex',
	'.covenv',
	'.mypy_cache',
	'.uv-cache',
	'dist',
	'coverage',
	'build',
	'.turbo',
	'.nx',
	'.cache',
	'.pnpm',
	'.cortex-cache',
	'.venv',
	'__pycache__',
	'target',
	'dist-test',
	'logs',
	'tmp',
	'.pytest_cache',
	'.ruff_cache',
	'.idea',
];

type PlaceholderResult = { file: string; token: string };

function isAllowed(file: string, allowlist: readonly RegExp[]): boolean {
	// Prevent ReDoS by limiting input length
	if (file.length > 1000) {
		return false;
	}

	// Add timeout to prevent long-running regex operations
	const startTime = Date.now();
	const timeoutMs = 100; // 100ms timeout per regex operation

	return allowlist.some((regex) => {
		try {
			// Check timeout before each regex test
			if (Date.now() - startTime > timeoutMs) {
				return false;
			}
			return regex.test(file);
		} catch {
			// If regex throws an error (e.g., due to complexity), treat as not allowed
			return false;
		}
	});
}

interface ScanOptions {
	readonly rootDir?: string;
	readonly allowlist?: readonly RegExp[];
	readonly ignoredDirectories?: readonly string[];
	readonly extensions?: readonly string[];
}

export async function scanRepoForPlaceholders(
	tokens: readonly string[] = defaultForbiddenTokens,
	allowPatterns: readonly RegExp[] = defaultAllowlist,
	options: ScanOptions = {},
): Promise<PlaceholderResult[]> {
	const rootDir = options.rootDir ?? process.cwd();
	const allowlist = options.allowlist ?? allowPatterns;
	const ignoredDirectories = new Set([
		...defaultIgnoredDirectories,
		...(options.ignoredDirectories ?? []),
	]);
	const includedExtensions = new Set(options.extensions ?? defaultIncludedExtensions);

	const results: PlaceholderResult[] = [];

	function shouldIgnoreDirectory(entry: string): boolean {
		if (ignoredDirectories.has(entry)) {
			return true;
		}

		if (entry.startsWith('.venv')) {
			return true;
		}

		return false;
	}

	function tryStat(filePath: string): fs.Stats | undefined {
		try {
			return fs.statSync(filePath);
		} catch {
			return undefined;
		}
	}

	function tryReadFile(filePath: string): string | undefined {
		try {
			return fs.readFileSync(filePath, 'utf8');
		} catch {
			return undefined;
		}
	}

	function processFile(fullPath: string) {
		if (isAllowed(fullPath, allowlist)) {
			return;
		}

		const extension = path.extname(fullPath);
		if (extension && !includedExtensions.has(extension)) {
			return;
		}

		const content = tryReadFile(fullPath);
		if (!content) {
			return;
		}

		for (const token of tokens) {
			if (!shouldConsiderToken(fullPath, token)) {
				continue;
			}
			if (content.includes(token)) {
				results.push({ file: fullPath, token });
			}
		}
	}

	function shouldConsiderToken(filePath: string, token: string): boolean {
		if (token !== 'Mock') {
			return true;
		}

		const normalized = filePath.replace(/\\/g, '/');
		const testPatterns = [
			'/__tests__/',
			'/__mocks__/',
			'/tests/',
			'/test/',
			'/simple-tests/',
			'.spec.',
			'.test.',
		];
		return !testPatterns.some((pattern) => normalized.includes(pattern));
	}

	function scanDir(dir: string) {
		for (const entry of fs.readdirSync(dir)) {
			const fullPath = path.join(dir, entry);
			const stat = tryStat(fullPath);
			if (!stat) {
				continue;
			}
			if (stat.isDirectory()) {
				if (!shouldIgnoreDirectory(entry)) {
					scanDir(fullPath);
				}
				continue;
			}

			processFile(fullPath);
		}
	}

	scanDir(rootDir);
	return results;
}

const isMain =
	typeof process !== 'undefined' && process.argv[1] === import.meta.url.replace('file://', '');

if (isMain) {
	(async () => {
		const found = await scanRepoForPlaceholders();
		if (found.length) {
			console.error('brAInwav production guard failed:', found);
			process.exit(1);
		} else {
			console.log('brAInwav production guard passed.');
		}
	})();
}
