import { appendFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { EventBus } from '../lib/types.js';

const DEFAULT_TYPES = [
  'agent.started',
  'agent.completed',
  'agent.failed',
  'provider.fallback',
  'workflow.started',
  'workflow.completed',
  'workflow.cancelled',
  'security.dependabot_config_loaded',
  'security.dependabot_assessed',
];

export const wireOutbox = async (
  bus: EventBus,
  filePath: string,
  types: string[] = DEFAULT_TYPES,
) => {
  const path = resolve(filePath);
  await mkdir(dirname(path), { recursive: true });
  for (const t of types) {
    bus.subscribe(t, async (evt: any) => {
      const line = JSON.stringify({ type: t, ...evt }) + '\n';
      await appendFile(path, line, { encoding: 'utf8' });
    });
  }
};

