/**
 * brAInwav Skill YAML Frontmatter Parser
 * Extracts and parses YAML frontmatter from skill markdown files
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/loaders/skill-parser
 */

import { load as parseYaml } from 'js-yaml';
import { skillFrontmatterSchema } from '@cortex-os/contracts/skill-events';
import type { SkillFileParsed, SkillFileRaw } from '../types.js';

// ============================================================================
// Constants
// ============================================================================

const FRONTMATTER_DELIMITER = '---';
const FRONTMATTER_START_PATTERN = /^---\s*$/m;
const FRONTMATTER_END_PATTERN = /^---\s*$/m;
const MAX_FRONTMATTER_SIZE = 10000; // 10KB limit for frontmatter
const CONTENT_MIN_LENGTH = 50;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error for skill parsing failures
 */
export class SkillParseError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly filePath?: string,
		public readonly details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'SkillParseError';
	}
}

/**
 * Error for malformed YAML frontmatter
 */
export class YamlParseError extends SkillParseError {
	constructor(message: string, filePath?: string, originalError?: Error) {
		super(
			`brAInwav Skill Parser: ${message}`,
			'YAML_PARSE_ERROR',
			filePath,
			originalError ? { originalError: originalError.message } : undefined
		);
		this.name = 'YamlParseError';
	}
}

/**
 * Error for missing or invalid frontmatter
 */
export class FrontmatterError extends SkillParseError {
	constructor(message: string, filePath?: string) {
		super(
			`brAInwav Skill Parser: ${message}`,
			'FRONTMATTER_ERROR',
			filePath
		);
		this.name = 'FrontmatterError';
	}
}

/**
 * Error for content validation failures
 */
export class ContentValidationError extends SkillParseError {
	constructor(message: string, filePath?: string, details?: Record<string, unknown>) {
		super(
			`brAInwav Skill Parser: ${message}`,
			'CONTENT_VALIDATION_ERROR',
			filePath,
			details
		);
		this.name = 'ContentValidationError';
	}
}

// ============================================================================
// Parser Interface
// ============================================================================

/**
 * Options for skill file parsing
 */
export interface SkillParseOptions {
	/** Whether to validate frontmatter schema (default: true) */
	validateSchema?: boolean;

	/** Whether to normalize content whitespace (default: true) */
	normalizeContent?: boolean;

	/** Whether to trim leading/trailing whitespace (default: true) */
	trimContent?: boolean;

	/** Whether to allow empty content (default: false) */
	allowEmptyContent?: boolean;

	/** Maximum frontmatter size in bytes (default: 10KB) */
	maxFrontmatterSize?: number;
}

/**
 * Result of frontmatter extraction
 */
interface FrontmatterExtraction {
	frontmatter: string;
	content: string;
	startIndex: number;
	endIndex: number;
}

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Extract YAML frontmatter from markdown content
 *
 * @param rawContent - Raw markdown file content
 * @param filePath - File path for error reporting
 * @returns Extracted frontmatter and content
 * @throws {FrontmatterError} If frontmatter is missing or malformed
 */
export function extractFrontmatter(
	rawContent: string,
	filePath?: string
): FrontmatterExtraction {
	const trimmedContent = rawContent.trim();

	// Check if file starts with frontmatter delimiter
	if (!trimmedContent.startsWith(FRONTMATTER_DELIMITER)) {
		throw new FrontmatterError(
			'Missing frontmatter: file must start with "---"',
			filePath
		);
	}

	// Find the end of frontmatter
	const contentAfterFirstDelimiter = trimmedContent.slice(FRONTMATTER_DELIMITER.length);
	const endMatch = contentAfterFirstDelimiter.match(FRONTMATTER_END_PATTERN);

	if (!endMatch || endMatch.index === undefined) {
		throw new FrontmatterError(
			'Malformed frontmatter: missing closing "---"',
			filePath
		);
	}

	const frontmatterEndIndex = endMatch.index;
	const frontmatter = contentAfterFirstDelimiter.slice(0, frontmatterEndIndex).trim();
	const content = contentAfterFirstDelimiter.slice(
		frontmatterEndIndex + FRONTMATTER_DELIMITER.length
	).trim();

	// Validate frontmatter size
	if (frontmatter.length > MAX_FRONTMATTER_SIZE) {
		throw new FrontmatterError(
			`Frontmatter too large: ${frontmatter.length} bytes exceeds ${MAX_FRONTMATTER_SIZE} byte limit`,
			filePath
		);
	}

	// Validate frontmatter is not empty
	if (frontmatter.length === 0) {
		throw new FrontmatterError(
			'Empty frontmatter: YAML content required between delimiters',
			filePath
		);
	}

	return {
		frontmatter,
		content,
		startIndex: 0,
		endIndex: FRONTMATTER_DELIMITER.length + frontmatterEndIndex + FRONTMATTER_DELIMITER.length,
	};
}

/**
 * Parse YAML frontmatter string
 *
 * @param yamlString - YAML content to parse
 * @param filePath - File path for error reporting
 * @returns Parsed object
 * @throws {YamlParseError} If YAML is invalid
 */
export function parseYamlFrontmatter(
	yamlString: string,
	filePath?: string
): unknown {
	try {
		const parsed = parseYaml(yamlString);

		if (parsed === null || parsed === undefined) {
			throw new YamlParseError(
				'YAML parsing resulted in null or undefined',
				filePath
			);
		}

		if (typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new YamlParseError(
				'YAML frontmatter must be an object, not an array or primitive',
				filePath
			);
		}

		return parsed;
	} catch (error) {
		if (error instanceof YamlParseError) {
			throw error;
		}

		throw new YamlParseError(
			`Invalid YAML syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
			filePath,
			error instanceof Error ? error : undefined
		);
	}
}

/**
 * Normalize content whitespace and formatting
 *
 * @param content - Raw content string
 * @param options - Normalization options
 * @returns Normalized content
 */
export function normalizeContent(
	content: string,
	options: Pick<SkillParseOptions, 'normalizeContent' | 'trimContent'> = {}
): string {
	const { normalizeContent: shouldNormalize = true, trimContent: shouldTrim = true } = options;

	let normalized = content;

	if (shouldTrim) {
		normalized = normalized.trim();
	}

	if (shouldNormalize) {
		// Replace multiple blank lines with maximum of 2
		normalized = normalized.replace(/\n{3,}/g, '\n\n');

		// Normalize line endings to \n
		normalized = normalized.replace(/\r\n/g, '\n');

		// Remove trailing whitespace from each line
		normalized = normalized.split('\n').map(line => line.trimEnd()).join('\n');
	}

	return normalized;
}

/**
 * Validate content meets minimum requirements
 *
 * @param content - Content to validate
 * @param filePath - File path for error reporting
 * @param options - Validation options
 * @throws {ContentValidationError} If content is invalid
 */
export function validateContent(
	content: string,
	filePath?: string,
	options: Pick<SkillParseOptions, 'allowEmptyContent'> = {}
): void {
	const { allowEmptyContent = false } = options;

	if (!allowEmptyContent && content.length === 0) {
		throw new ContentValidationError(
			'Empty content: skill must have content after frontmatter',
			filePath
		);
	}

	if (!allowEmptyContent && content.length < CONTENT_MIN_LENGTH) {
		throw new ContentValidationError(
			`Content too short: ${content.length} characters, minimum ${CONTENT_MIN_LENGTH} required`,
			filePath,
			{ contentLength: content.length, minimumLength: CONTENT_MIN_LENGTH }
		);
	}

	// Check for potential encoding issues
	if (content.includes('\u0000')) {
		throw new ContentValidationError(
			'Invalid content: contains null bytes (possible binary data)',
			filePath
		);
	}
}

/**
 * Parse a skill file with YAML frontmatter
 *
 * @param skillFile - Raw skill file data
 * @param options - Parser options
 * @returns Parsed skill file with frontmatter and content
 * @throws {SkillParseError} If parsing fails
 */
export async function parseSkillFile(
	skillFile: SkillFileRaw,
	options: SkillParseOptions = {}
): Promise<SkillFileParsed> {
	const {
		validateSchema = true,
		normalizeContent: shouldNormalize = true,
		trimContent = true,
		allowEmptyContent = false,
		maxFrontmatterSize = MAX_FRONTMATTER_SIZE,
	} = options;

	const startTime = performance.now();
	const { rawContent, filePath } = skillFile;

	try {
		// Step 1: Extract frontmatter and content
		const extraction = extractFrontmatter(rawContent, filePath);
		const { frontmatter: rawYaml, content: rawContentBody } = extraction;

		// Step 2: Parse YAML frontmatter
		const parsedFrontmatter = parseYamlFrontmatter(rawYaml, filePath);

		// Step 3: Validate frontmatter schema if requested
		if (validateSchema) {
			const validationResult = skillFrontmatterSchema.safeParse(parsedFrontmatter);

			if (!validationResult.success) {
				const errors = validationResult.error.errors.map(err => ({
					path: err.path.join('.'),
					message: err.message,
					code: err.code,
				}));

				throw new YamlParseError(
					`Frontmatter validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join('; ')}`,
					filePath
				);
			}
		}

		// Step 4: Normalize content
		const normalizedContent = normalizeContent(rawContentBody, {
			normalizeContent: shouldNormalize,
			trimContent,
		});

		// Step 5: Validate content
		validateContent(normalizedContent, filePath, { allowEmptyContent });

		// Step 6: Build result
		const parseTime = performance.now() - startTime;

		return {
			filePath,
			fileName: skillFile.fileName,
			frontmatter: parsedFrontmatter as any, // Type validated by Zod if validateSchema=true
			content: normalizedContent,
			rawYaml,
			parseTime,
		};
	} catch (error) {
		// Re-throw our custom errors
		if (error instanceof SkillParseError) {
			throw error;
		}

		// Wrap unexpected errors
		throw new SkillParseError(
			`Unexpected parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			'UNEXPECTED_ERROR',
			filePath,
			error instanceof Error ? { originalError: error.message, stack: error.stack } : undefined
		);
	}
}

/**
 * Parse multiple skill files in batch
 *
 * @param skillFiles - Array of raw skill files
 * @param options - Parser options
 * @returns Array of successfully parsed files and errors
 */
export async function parseSkillFilesBatch(
	skillFiles: SkillFileRaw[],
	options: SkillParseOptions = {}
): Promise<{
	parsed: SkillFileParsed[];
	errors: Array<{ file: SkillFileRaw; error: SkillParseError }>;
}> {
	const parsed: SkillFileParsed[] = [];
	const errors: Array<{ file: SkillFileRaw; error: SkillParseError }> = [];

	await Promise.allSettled(
		skillFiles.map(async (file) => {
			try {
				const result = await parseSkillFile(file, options);
				parsed.push(result);
			} catch (error) {
				if (error instanceof SkillParseError) {
					errors.push({ file, error });
				} else {
					errors.push({
						file,
						error: new SkillParseError(
							`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
							'UNEXPECTED_ERROR',
							file.filePath
						),
					});
				}
			}
		})
	);

	return { parsed, errors };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if content has valid frontmatter structure
 *
 * @param content - Raw content to check
 * @returns True if content appears to have frontmatter
 */
export function hasFrontmatter(content: string): boolean {
	const trimmed = content.trim();
	return (
		trimmed.startsWith(FRONTMATTER_DELIMITER) &&
		trimmed.slice(FRONTMATTER_DELIMITER.length).includes(FRONTMATTER_DELIMITER)
	);
}

/**
 * Extract frontmatter delimiter positions
 *
 * @param content - Raw content
 * @returns Start and end positions of frontmatter delimiters, or null if not found
 */
export function getFrontmatterBounds(content: string): { start: number; end: number } | null {
	try {
		const extraction = extractFrontmatter(content);
		return {
			start: extraction.startIndex,
			end: extraction.endIndex,
		};
	} catch {
		return null;
	}
}
