import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const JSON_EOL = '\n';
const TMP_PREFIX = '.tmp-';

export interface WriteJsonResult {
	path: string;
	digest: string;
	bytes: number;
}

export interface ReadJsonResult<T> {
	value: T;
	digest: string;
}

export async function readJsonFile<T>(path: string): Promise<T | undefined> {
	try {
		const contents = await readFile(path, 'utf-8');
		return JSON.parse(contents) as T;
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return undefined;
		}
		throw error;
	}
}

export async function readJsonFileWithDigest<T>(
	path: string,
): Promise<ReadJsonResult<T> | undefined> {
	try {
		const contents = await readFile(path, 'utf-8');
		const digest = createHash('sha256').update(contents).digest('hex');
		return { value: JSON.parse(contents) as T, digest };
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return undefined;
		}
		throw error;
	}
}

export async function writeJsonFile(
	targetPath: string,
	payload: unknown,
): Promise<WriteJsonResult> {
	const directory = dirname(targetPath);
	await mkdir(directory, { recursive: true });

	const serialized = `${JSON.stringify(payload, null, 2)}${JSON_EOL}`;
	const tmpName = `${TMP_PREFIX}${randomUUID()}-${basename(targetPath)}`;
	const tmpPath = join(directory, tmpName);

	await writeFile(tmpPath, serialized, 'utf-8');

	const digest = createHash('sha256').update(serialized).digest('hex');
	const bytes = Buffer.byteLength(serialized, 'utf-8');

	try {
		await rename(tmpPath, targetPath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') {
			await rm(targetPath, { force: true });
			await rename(tmpPath, targetPath);
		} else {
			await rm(tmpPath, { force: true });
			throw error;
		}
	}

	return { path: targetPath, digest, bytes };
}

export async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}
