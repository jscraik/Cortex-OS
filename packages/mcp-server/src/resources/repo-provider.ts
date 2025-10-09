/**
 * Repository Resource Provider
 *
 * Handles repository file access with security controls,
 * path filtering, and proper error handling.
 */

import { promises as fs } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { ResourceContent } from '../types/mcp-2025.js';

// Repository root directory
const REPO_ROOT = resolve(process.cwd());

// Allowed directories for security
const ALLOWED_DIRECTORIES = ['packages', 'apps', 'docs', 'scripts', 'libs', 'src'];

// Denied patterns for security
const DENIED_PATTERNS = [
	/\.(env|key|secret|password|token|pem|p12|pfx)$/i,
	/\/\.git\//,
	/\/node_modules\//,
	/\/dist\//,
	/\/coverage\//,
	/\/\.cache\//,
];

/**
 * Validate that a path is within allowed directories
 */
function validatePath(absolutePath: string): boolean {
	// Check if path is within allowed directories
	const withinAllowed = ALLOWED_DIRECTORIES.some((dir) =>
		absolutePath.startsWith(resolve(REPO_ROOT, dir) + sep),
	);

	if (!withinAllowed) {
		return false;
	}

	// Check against denied patterns
	const relativePath = absolutePath.replace(REPO_ROOT, '');
	return !DENIED_PATTERNS.some((pattern) => pattern.test(relativePath));
}

/**
 * Read repository file with security validation
 */
export async function readRepoFile(uri: URL, signal?: AbortSignal): Promise<ResourceContent> {
	try {
		// Check for cancellation
		signal?.throwIfAborted();

		const pathParam = uri.searchParams.get('path');
		if (!pathParam) {
			throw new Error('Path parameter is required');
		}

		// Resolve the path and validate it's within the repo
		const absolutePath = resolve(REPO_ROOT, pathParam);

		// Security validation
		if (!validatePath(absolutePath)) {
			throw new Error(`[brAInwav] repo-provider: Access denied for path "${pathParam}"`);
		}

		// Check for cancellation again
		signal?.throwIfAborted();

		// Read the file
		const data = await fs.readFile(absolutePath, 'utf8');

		const result = {
			uri: uri.href,
			mimeType: 'text/plain' as const,
			text: data,
		};

		return result;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw error; // Re-throw abort errors
		}

		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`[brAInwav] repo-provider: Failed to read file: ${message}`);
	}
}
