import * as fs from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { WritableStream } from 'node:stream/web';
import { createGzip } from 'node:zlib';
import type { RotationConfig } from './types';

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
	const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
	const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
	if (!match) {
		throw new Error(`Invalid size format: ${size}`);
	}
	return parseInt(match[1], 10) * units[match[2].toUpperCase() as keyof typeof units];
}

/**
 * Parse time interval to milliseconds
 */
function parseInterval(interval: string): number {
	const intervals: Record<string, number> = {
		'1h': 60 * 60 * 1000,
		'1d': 24 * 60 * 60 * 1000,
		daily: 24 * 60 * 60 * 1000,
		weekly: 7 * 24 * 60 * 60 * 1000,
	};
	return intervals[interval] || intervals['1h'];
}

/**
 * Format filename with date pattern
 */
function formatFilename(pattern: string, date: Date): string {
	return pattern
		.replace('%Y', date.getFullYear().toString())
		.replace('%m', (date.getMonth() + 1).toString().padStart(2, '0'))
		.replace('%d', date.getDate().toString().padStart(2, '0'))
		.replace('%H', date.getHours().toString().padStart(2, '0'))
		.replace('%M', date.getMinutes().toString().padStart(2, '0'))
		.replace('%S', date.getSeconds().toString().padStart(2, '0'));
}

/**
 * Get rotation files sorted by age
 */
function getRotationFiles(filePath: string): string[] {
	const dir = dirname(filePath);
	const base = basename(filePath, extname(filePath));

	if (!fs.existsSync(dir)) {
		return [];
	}

	return fs
		.readdirSync(dir)
		.filter((file) => file.startsWith(base) && file !== basename(filePath))
		.sort()
		.map((file) => join(dir, file));
}

/**
 * Clean up old rotation files
 */
function cleanupOldFiles(filePath: string, maxFiles: number): void {
	const files = getRotationFiles(filePath);

	if (files.length > maxFiles - 1) {
		const toDelete = files.slice(0, files.length - (maxFiles - 1));
		toDelete.forEach((file) => {
			try {
				fs.unlinkSync(file);
			} catch (_e) {
				// Ignore cleanup errors
			}
		});
	}
}

/**
 * Compress a file
 */
async function compressFile(sourcePath: string): Promise<void> {
	const gzipPath = `${sourcePath}.gz`;
	const source = fs.createReadStream(sourcePath);
	const gzip = createGzip();
	const destination = fs.createWriteStream(gzipPath);

	await pipeline(source, gzip, destination);

	// Remove original file
	try {
		fs.unlinkSync(sourcePath);
	} catch (_e) {
		// Ignore unlink errors
	}
}

/**
 * Create a rotating file stream
 */
export function createRotatingFileStream(
	filePath: string,
	config: RotationConfig,
): WritableStream<Uint8Array> {
	// Ensure directory exists
	const dir = dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	let currentSize = 0;
	let lastRotation = Date.now();
	let currentFileStream = fs.createWriteStream(filePath, { flags: 'a' });

	/**
	 * Check if rotation is needed
	 */
	function shouldRotate(): boolean {
		if (config.type === 'size') {
			return currentSize >= parseSize(config.size!);
		} else if (config.type === 'time') {
			const interval = parseInterval(config.interval!);
			return Date.now() - lastRotation >= interval;
		}
		return false;
	}

	/**
	 * Perform rotation
	 */
	async function rotate(): Promise<void> {
		// Close current stream
		currentFileStream.end();

		// Generate rotated filename
		const timestamp = new Date();
		let rotatedPath: string;

		if (config.filenamePattern) {
			rotatedPath = join(dirname(filePath), formatFilename(config.filenamePattern, timestamp));
		} else {
			const ext = extname(filePath);
			const base = basename(filePath, ext);
			rotatedPath = join(dirname(filePath), `${base}.${timestamp.getTime()}${ext}`);
		}

		// Move current file to rotated path
		try {
			if (fs.existsSync(filePath)) {
				const data = fs.readFileSync(filePath);
				fs.writeFileSync(rotatedPath, data);
				fs.writeFileSync(filePath, '');
			}
		} catch (_e) {
			// Ignore move errors
		}

		// Compress if needed
		if (config.compress) {
			await compressFile(rotatedPath);
		}

		// Clean up old files
		cleanupOldFiles(filePath, config.maxFiles);

		// Create new stream
		currentFileStream = fs.createWriteStream(filePath, { flags: 'a' });
		currentSize = 0;
		lastRotation = Date.now();
	}

	return new WritableStream({
		async write(chunk) {
			// Check rotation
			if (shouldRotate()) {
				await rotate();
			}

			// Write chunk
			return new Promise((resolve, reject) => {
				currentFileStream.write(chunk, (error) => {
					if (error) {
						reject(error);
					} else {
						currentSize += chunk.length;
						resolve();
					}
				});
			});
		},
		close() {
			currentFileStream.end();
		},
		abort(reason) {
			currentFileStream.destroy(reason);
		},
	});
}
