import fs from 'fs/promises';
import path from 'path';

const CHECKPOINT_DIR = path.join(process.cwd(), '.checkpoints');

/**
 * Persist a serialized checkpoint for a given thread.
 */
export async function saveCheckpoint(threadId: string, state: unknown): Promise<void> {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const file = path.join(CHECKPOINT_DIR, `${threadId}.json`);
  await fs.writeFile(file, JSON.stringify(state), 'utf8');
}

/**
 * Load a checkpoint for a thread. Returns empty object if none exists.
 */
export async function loadCheckpoint(threadId: string): Promise<unknown> {
  const file = path.join(CHECKPOINT_DIR, `${threadId}.json`);
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}
