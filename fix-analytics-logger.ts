import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const baseDir = '/Users/jamiecraik/.Cortex-OS/apps/cortex-os/packages/evidence/analytics/src';

const files = [
  'metrics-collector.ts',
  'analytics-engine.ts',
  'optimization-engine.ts',
  'pattern-analyzer.ts',
  'system-probe.ts'
];

async function fixFile(filename: string) {
  const filePath = join(baseDir, filename);
  let content = await readFile(filePath, 'utf-8');

  // Fix logger patterns - replace logger.method('message', { obj }) with logger.method({ msg: 'message', ...obj })
  content = content.replace(
    /this\.logger\.(info|warn|error|debug)\('([^']+)'\s*,\s*({[\s\S]*?})\s*\)/g,
    'this.logger.$1({ msg: $2, ...$3 })'
  );

  // Fix logger patterns - replace logger.method('message') with logger.method({ msg: 'message' })
  content = content.replace(
    /this\.logger\.(info|warn|error|debug)\('([^']+)'\)/g,
    'this.logger.$1({ msg: $2 })'
  );

  // Fix error.message references - replace error.message with proper error handling
  content = content.replace(
    /error\.message(?!\s*\))/g,
    'error instanceof Error ? error.message : String(error)'
  );

  // Fix unused _agentId variables (keep underscore prefix)
  // No changes needed for these as they're already properly prefixed

  await writeFile(filePath, content);
  console.log(`Fixed ${filename}`);
}

async function main() {
  for (const file of files) {
    try {
      await fixFile(file);
    } catch (error) {
      console.error(`Error fixing ${file}:`, error);
    }
  }
}

main().catch(console.error);