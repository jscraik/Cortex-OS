/**
 * Content Normalizer for Deterministic Diffs
 * Implements configurable normalization as specified in the blueprint
 */

import { createHash } from 'crypto';
import type { Config } from '../types/index.js';

export interface NormalizationOptions {
	newline: 'LF' | 'CRLF';
	trim_trailing_ws: boolean;
	strip_dates: boolean;
	max_normalize_bytes: number;
}

export interface NormalizedContent {
	content: string;
	hash: string;
	size: number;
	skipped: boolean;
	reason?: string;
}

/**
 * Content normalizer for deterministic diff generation
 */
export class ContentNormalizer {
	private options: NormalizationOptions;

	constructor(config: Config) {
		this.options = {
			newline: config.determinism.normalize.newline,
			trim_trailing_ws: config.determinism.normalize.trim_trailing_ws,
			strip_dates: config.determinism.normalize.strip_dates,
			max_normalize_bytes: config.determinism.max_normalize_bytes,
		};
	}

	/**
	 * Normalize content for deterministic comparison
	 */
	normalize(content: string, filename?: string): NormalizedContent {
		const originalSize = Buffer.byteLength(content, 'utf8');

		// Skip normalization if content is too large
		if (originalSize > this.options.max_normalize_bytes) {
			return {
				content,
				hash: this.calculateHash(content),
				size: originalSize,
				skipped: true,
				reason: `Content size ${originalSize} exceeds limit ${this.options.max_normalize_bytes}`,
			};
		}

		let normalized = content;

		// Apply normalization steps
		normalized = this.normalizeNewlines(normalized);

		if (this.options.trim_trailing_ws) {
			normalized = this.trimTrailingWhitespace(normalized);
		}

		if (this.options.strip_dates) {
			normalized = this.stripDates(normalized);
		}

		// Additional normalization based on file type
		if (filename) {
			normalized = this.normalizeByFileType(normalized, filename);
		}

		const hash = this.calculateHash(normalized);
		const finalSize = Buffer.byteLength(normalized, 'utf8');

		return {
			content: normalized,
			hash,
			size: finalSize,
			skipped: false,
		};
	}

	/**
	 * Normalize content specifically for diff generation
	 */
	normalizeForDiff(
		oldContent: string,
		newContent: string,
	): {
		oldNormalized: NormalizedContent;
		newNormalized: NormalizedContent;
	} {
		return {
			oldNormalized: this.normalize(oldContent),
			newNormalized: this.normalize(newContent),
		};
	}

	/**
	 * Check if two contents are equivalent after normalization
	 */
	areEquivalent(content1: string, content2: string): boolean {
		const norm1 = this.normalize(content1);
		const norm2 = this.normalize(content2);

		// If either was skipped, fall back to direct comparison
		if (norm1.skipped || norm2.skipped) {
			return content1 === content2;
		}

		return norm1.hash === norm2.hash;
	}

	private normalizeNewlines(content: string): string {
		if (this.options.newline === 'LF') {
			return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		} else {
			return content.replace(/\r\n/g, '\r\n').replace(/(?<!\r)\n/g, '\r\n');
		}
	}

	private trimTrailingWhitespace(content: string): string {
		return content
			.split('\n')
			.map((line) => {
				// eslint-disable-next-line sonarjs/slow-regex
				return line.replace(/[ \t]+$/, '');
			})
			.join('\n');
	}

	private stripDates(content: string): string {
		// Remove common date/time patterns
		const datePatterns = [
			// ISO 8601 dates
			/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g,
			// Unix timestamps
			/\b\d{10,13}\b/g,
			// Common date formats
			/\d{1,2}\/\d{1,2}\/\d{4}/g,
			/\d{4}-\d{2}-\d{2}/g,
			// Time formats
			/\d{1,2}:\d{2}:\d{2}(?:\.\d{3})?/g,
		];

		let normalized = content;
		for (const pattern of datePatterns) {
			normalized = normalized.replace(pattern, '[TIMESTAMP_REMOVED]');
		}

		return normalized;
	}

	private normalizeByFileType(content: string, filename: string): string {
		const extension = filename.split('.').pop()?.toLowerCase();

		switch (extension) {
			case 'json':
				return this.normalizeJSON(content);
			case 'xml':
				return this.normalizeXML(content);
			case 'yaml':
			case 'yml':
				return this.normalizeYAML(content);
			case 'md':
			case 'markdown':
				return this.normalizeMarkdown(content);
			default:
				return content;
		}
	}

	private normalizeJSON(content: string): string {
		try {
			// Parse and re-stringify with consistent formatting
			const parsed = JSON.parse(content);
			return JSON.stringify(parsed, null, 2);
		} catch {
			// If parsing fails, return original content
			return content;
		}
	}

	private normalizeXML(content: string): string {
		// Basic XML normalization - remove extra whitespace between tags
		// Group alternation to make precedence explicit and prevent backtracking
		return content
			.replace(/>\s+</g, '><')
			.replace(/^(\s+|\s+)$/g, '');
	}

	private normalizeYAML(content: string): string {
		// Normalize YAML indentation and spacing
		return content
			.split('\n')
			.map((line) => {
				// Normalize indentation to 2 spaces - use atomic regex to prevent backtracking
				// eslint-disable-next-line sonarjs/slow-regex
				const match = /^([ \t]*)(.*)$/m.exec(line);
				if (match) {
					const indent = Math.floor(match[1].length / 2) * 2;
					return ' '.repeat(indent) + match[2];
				}
				return line;
			})
			.join('\n');
	}

	private normalizeMarkdown(content: string): string {
		// Normalize markdown formatting
		return (
			content
				// Normalize heading spacing - use atomic replacement to prevent backtracking
				.replace(/^#{1,6}[ \t]+/gm, (match) => match.replace(/[ \t]+/g, ' '))
				// Normalize list formatting - optimize to prevent backtracking
				.replace(/^([ \t]*)[*+-][ \t]+/gm, '$1- ')
				// Normalize link formatting - make more atomic to prevent backtracking
				// eslint-disable-next-line sonarjs/slow-regex
				.replace(/\[([^\]]+)\][ \t]*\([ \t]*([^)]+)[ \t]*\)/g, '[$1]($2)')
		);
	}

	private calculateHash(content: string): string {
		return createHash('sha256').update(content, 'utf8').digest('hex');
	}
}

/**
 * Factory function to create normalizer from config
 */
export async function createNormalizer(
	config: Config,
): Promise<ContentNormalizer> {
	return new ContentNormalizer(config);
}
