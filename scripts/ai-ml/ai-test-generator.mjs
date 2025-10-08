#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Anthropic } from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
export const DEFAULT_MAX_TOKENS = 1000;

export const buildPrompt = (source) => {
	return `Write vitest unit tests for the following TypeScript module:\n\n${source}\n`;
};

export const extractAnthropicText = (response) => {
	if (!response || typeof response !== 'object') {
		throw new Error('brAInwav Anthropic SDK response missing body');
	}
	if (
		response.response &&
		typeof response.response === 'object' &&
		typeof response.response.output_text === 'string' &&
		response.response.output_text.trim().length > 0
	) {
		return response.response.output_text;
	}
	const blocks = Array.isArray(response.content) ? response.content : [];
	for (const block of blocks) {
		if (!block || typeof block !== 'object') continue;
		if (block.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) {
			return block.text;
		}
		if (block.type === 'tool_use') {
			const beta = block.response;
			if (
				beta &&
				typeof beta === 'object' &&
				typeof beta.output_text === 'string' &&
				beta.output_text.trim().length > 0
			) {
				return beta.output_text;
			}
		}
		if (block.type === 'tool_result' && Array.isArray(block.content)) {
			for (const segment of block.content) {
				if (segment && typeof segment === 'object') {
					if (typeof segment.output_text === 'string' && segment.output_text.trim().length > 0) {
						return segment.output_text;
					}
					if (typeof segment.text === 'string' && segment.text.trim().length > 0) {
						return segment.text;
					}
				}
			}
		}
	}
	throw new Error('brAInwav Anthropic SDK response missing output text');
};

export const generateWithAnthropic = async ({ source, client, maxTokens = DEFAULT_MAX_TOKENS, model = DEFAULT_MODEL }) => {
	const prompt = buildPrompt(source);
	const response = await client.messages.create({
		model,
		max_tokens: maxTokens,
		messages: [{ role: 'user', content: prompt }],
	});
	return extractAnthropicText(response);
};

export const writeGeneratedTests = async ({
	sourcePath,
	outPath,
	client,
	maxTokens = DEFAULT_MAX_TOKENS,
}) => {
	const source = readFileSync(sourcePath, 'utf8');
	const output = await generateWithAnthropic({ source, client, maxTokens });
	writeFileSync(outPath, output);
	return output;
};

const [, , sourcePath, outPath] = process.argv;

async function main() {
	if (!sourcePath || !outPath) {
		console.error('Usage: ai-test-generator.mjs <source-file> <output-test-file>');
		process.exit(1);
	}
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error('Missing ANTHROPIC_API_KEY environment variable');
		process.exit(1);
	}
	const client = new Anthropic({ apiKey });
	const generated = await writeGeneratedTests({ sourcePath, outPath, client });
	console.log(`Generated tests written to ${outPath}`);
	return generated;
}

const invokedPath = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
