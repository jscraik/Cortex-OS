import fs from 'node:fs';
import readline from 'node:readline';
import { z } from 'zod';

const eventSchema = z.object({
	id: z.string(),
	type: z.string(),
	data: z.record(z.unknown()),
	metadata: z.record(z.unknown()).optional(),
});

export function sanitizeEvent(event) {
	const parsed = eventSchema.parse(event);
	const { sessionId, ...sanitizedData } = parsed.data;
	let sanitizedMetadata;
	if (parsed.metadata) {
		const { sessionId: _sid, eventManagerId: _emid, ...restMetadata } = parsed.metadata;
		sanitizedMetadata = restMetadata;
	}
	return {
		...parsed,
		data: sanitizedData,
		metadata: parsed.metadata ? sanitizedMetadata : undefined,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const [inputPath, outputPath] = process.argv.slice(2);
	if (!inputPath || !outputPath) {
		console.error('Usage: node scripts/sanitize-events.mjs <input.jsonl> <output.jsonl>');
		process.exit(1);
	}

	const input = fs.createReadStream(inputPath, 'utf8');
	const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
	const rl = readline.createInterface({ input, crlfDelay: Infinity });

	let lineNumber = 0;
	rl.on('line', (line) => {
		lineNumber++;
		if (!line.trim()) return;
		try {
			const event = JSON.parse(line);
			const sanitized = sanitizeEvent(event);
			output.write(`${JSON.stringify(sanitized)}\n`);
		} catch (err) {
			const truncatedLine = line.length > 100 ? `${line.slice(0, 100)}...` : line;
			console.error(`Failed to sanitize line ${lineNumber}: "${truncatedLine}"`, err);
		}
	});

	rl.on('close', () => {
		output.end();
	});
}
