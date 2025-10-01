#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { Anthropic } from '@anthropic-ai/sdk';

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
	const source = readFileSync(sourcePath, 'utf8');
	const prompt = `Write vitest unit tests for the following TypeScript module:\n\n${source}\n`;
	const resp = await client.messages.create({
		model: 'claude-3-5-sonnet-latest',
		max_tokens: 1000,
		messages: [{ role: 'user', content: prompt }],
	});
	let content = '';
	if (
		Array.isArray(resp.content) &&
		resp.content.length > 0 &&
		typeof resp.content[0].text === 'string'
	) {
		content = resp.content[0].text;
	} else {
		console.error("Unexpected API response structure: missing or invalid 'content[0].text'");
		process.exit(1);
	}
	writeFileSync(outPath, content);
	console.log(`Generated tests written to ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
