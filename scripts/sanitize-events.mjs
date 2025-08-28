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
  const sanitized = { ...parsed, data: { ...parsed.data }, metadata: parsed.metadata ? { ...parsed.metadata } : undefined };
  delete sanitized.data.sessionId;
  if (sanitized.metadata) {
    delete sanitized.metadata.sessionId;
    delete sanitized.metadata.eventManagerId;
  }
  return sanitized;
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

  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      const sanitized = sanitizeEvent(event);
      output.write(`${JSON.stringify(sanitized)}\n`);
    } catch (err) {
      console.error('Failed to sanitize line', err);
    }
  });

  rl.on('close', () => {
    output.end();
  });
}
