import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';

import { ensureDataDir, getDataPath } from './xdg';

const JSON_SPACING = 2;
const TEMP_EXTENSION = '.tmp';

export async function writeJsonFile(segments: string[], value: unknown): Promise<string> {
	if (segments.length === 0) {
		throw new Error('writeJsonFile requires at least one path segment');
	}

	const targetPath = getDataPath(...segments);
	const directorySegments = segments.slice(0, -1);
	await ensureDataDir(...directorySegments);

	const payload = `${JSON.stringify(value, null, JSON_SPACING)}\n`;
	const tempPath = `${targetPath}.${randomUUID()}${TEMP_EXTENSION}`;

	await writeFile(tempPath, payload, 'utf-8');
	await rename(tempPath, targetPath);

	return targetPath;
}

export async function readJsonFile<T = unknown>(segments: string[]): Promise<T | undefined> {
	if (segments.length === 0) {
		throw new Error('readJsonFile requires at least one path segment');
	}

	const targetPath = getDataPath(...segments);

	try {
		const raw = await readFile(targetPath, 'utf-8');
		return JSON.parse(raw) as T;
	} catch (error) {
		if (isNotFoundError(error)) {
			return undefined;
		}
		throw error;
	}
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
	return (
		Boolean(error) &&
		typeof error === 'object' &&
		'code' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT'
	);
}
