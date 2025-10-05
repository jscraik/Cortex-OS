import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CbomFilePointer } from './types.js';

export function hashContent(value: string | Buffer): string {
	const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
	return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

export interface RedactorOptions {
	allowContent?: Set<string>;
}

export class CbomRedactor {
	private readonly allowContent: Set<string>;

	constructor(options: RedactorOptions = {}) {
		this.allowContent = options.allowContent ?? new Set();
	}

	redactText(key: string, value: string): { pointer: string; hash: string } {
		const buffer = Buffer.from(value, 'utf8');
		return this.redactBuffer(key, buffer);
	}

	redactBuffer(key: string, buffer: Buffer): { pointer: string; hash: string } {
		const hash = hashContent(buffer);
		if (this.allowContent.has(key)) {
			return { pointer: buffer.toString('utf8'), hash };
		}
		return { pointer: `redacted://${key}`, hash };
	}

	async redactFile(filePath: string): Promise<CbomFilePointer> {
		const absolutePath = path.resolve(filePath);
		const data = await fs.readFile(absolutePath);
		const { hash, pointer } = this.redactBuffer(absolutePath, data);
		return {
			path: absolutePath,
			hash,
			redacted: pointer.startsWith('redacted://'),
		};
	}
}
