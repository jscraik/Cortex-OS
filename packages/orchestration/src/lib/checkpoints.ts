import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type NodeName =
	| 'plan'
	| 'gather'
	| 'critic'
	| 'synthesize'
	| 'verify'
	| 'done';

export interface Checkpoint<TState = any> {
	runId: string;
	threadId: string;
	node: NodeName;
	state: TState;
	ts: string; // ISO timestamp
	idempotencyKey?: string;
}

export interface CheckpointWithIntegrity<TState = any>
	extends Checkpoint<TState> {
	checksum: string;
	version: string;
	size: number;
}

// Current checkpoint format version
const CHECKPOINT_VERSION = '1.0.0';

/**
 * Calculate checksum for checkpoint integrity validation
 */
function calculateChecksum(checkpoint: Checkpoint): string {
	const data = JSON.stringify({
		runId: checkpoint.runId,
		threadId: checkpoint.threadId,
		node: checkpoint.node,
		state: checkpoint.state,
		ts: checkpoint.ts,
		idempotencyKey: checkpoint.idempotencyKey,
	});
	return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Validate checkpoint integrity
 */
function validateCheckpointIntegrity<TState = any>(
	checkpoint: CheckpointWithIntegrity<TState>,
): boolean {
	try {
		const expectedChecksum = calculateChecksum(checkpoint);
		return expectedChecksum === checkpoint.checksum;
	} catch (error) {
		console.warn('Failed to validate checkpoint integrity:', error);
		return false;
	}
}

function getDir(): string {
	const base =
		process.env.CORTEX_CHECKPOINT_DIR ||
		path.join(process.cwd(), 'data', 'events', 'checkpoints');
	return base;
}

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

function fileFor(runId: string): string {
	const dir = getDir();
	return path.join(dir, `${runId}.jsonl`);
}

export async function saveCheckpoint<TState = any>(
	cp: Checkpoint<TState>,
): Promise<void> {
	const dir = getDir();
	await ensureDir(dir);

	// Create checkpoint with integrity validation
	const checkpointData = JSON.stringify(cp);
	const checkpointWithIntegrity: CheckpointWithIntegrity<TState> = {
		...cp,
		checksum: calculateChecksum(cp),
		version: CHECKPOINT_VERSION,
		size: checkpointData.length,
	};

	const line = `${JSON.stringify(checkpointWithIntegrity)}\n`;
	await fs.appendFile(fileFor(cp.runId), line, 'utf8');
}

/**
 * Enhanced checkpoint save with explicit integrity validation
 */
export async function saveCheckpointWithIntegrity<TState = any>(
	cp: Checkpoint<TState>,
): Promise<CheckpointWithIntegrity<TState>> {
	const dir = getDir();
	await ensureDir(dir);

	const checkpointData = JSON.stringify(cp);
	const checkpointWithIntegrity: CheckpointWithIntegrity<TState> = {
		...cp,
		checksum: calculateChecksum(cp),
		version: CHECKPOINT_VERSION,
		size: checkpointData.length,
	};

	// Validate before saving
	if (!validateCheckpointIntegrity(checkpointWithIntegrity)) {
		throw new Error(
			`Checkpoint integrity validation failed for runId: ${cp.runId}`,
		);
	}

	const line = `${JSON.stringify(checkpointWithIntegrity)}\n`;
	await fs.appendFile(fileFor(cp.runId), line, 'utf8');

	return checkpointWithIntegrity;
}

export async function loadCheckpointHistory<TState = any>(
	runId: string,
): Promise<Checkpoint<TState>[]> {
	const file = fileFor(runId);
	try {
		const content = await fs.readFile(file, 'utf8');
		const lines = content.split(/\n+/).filter(Boolean);
		const checkpoints: Checkpoint<TState>[] = [];

		for (const line of lines) {
			try {
				const parsed = JSON.parse(line);

				// Check if this is a checkpoint with integrity validation
				if (parsed.checksum && parsed.version) {
					const checkpointWithIntegrity =
						parsed as CheckpointWithIntegrity<TState>;

					// Validate integrity
					if (!validateCheckpointIntegrity(checkpointWithIntegrity)) {
						console.warn(
							`Checkpoint integrity validation failed for runId: ${runId}, node: ${parsed.node}, skipping`,
						);
						continue;
					}

					// Extract the base checkpoint (remove integrity fields)
					const { checksum, version, size, ...checkpoint } =
						checkpointWithIntegrity;
					checkpoints.push(checkpoint);
				} else {
					// Legacy checkpoint without integrity validation
					console.warn(
						`Loading legacy checkpoint without integrity validation for runId: ${runId}, node: ${parsed.node}`,
					);
					checkpoints.push(parsed);
				}
			} catch (parseError) {
				console.warn(
					`Failed to parse checkpoint line for runId: ${runId}:`,
					parseError,
				);
				// Continue processing other checkpoints
			}
		}

		return checkpoints;
	} catch (err: any) {
		if (err && err.code === 'ENOENT') return [];
		throw err;
	}
}

/**
 * Load checkpoint history with full integrity validation
 */
export async function loadCheckpointHistoryWithIntegrity<TState = any>(
	runId: string,
): Promise<CheckpointWithIntegrity<TState>[]> {
	const file = fileFor(runId);
	try {
		const content = await fs.readFile(file, 'utf8');
		const lines = content.split(/\n+/).filter(Boolean);
		const checkpoints: CheckpointWithIntegrity<TState>[] = [];

		for (const line of lines) {
			try {
				const parsed = JSON.parse(line);

				// Only return checkpoints with integrity validation
				if (parsed.checksum && parsed.version) {
					const checkpointWithIntegrity =
						parsed as CheckpointWithIntegrity<TState>;

					if (validateCheckpointIntegrity(checkpointWithIntegrity)) {
						checkpoints.push(checkpointWithIntegrity);
					} else {
						console.warn(
							`Checkpoint integrity validation failed for runId: ${runId}, node: ${parsed.node}`,
						);
					}
				}
			} catch (parseError) {
				console.warn(
					`Failed to parse checkpoint line for runId: ${runId}:`,
					parseError,
				);
			}
		}

		return checkpoints;
	} catch (err: any) {
		if (err && err.code === 'ENOENT') return [];
		throw err;
	}
}

export async function loadLatestCheckpoint<TState = any>(
	runId: string,
): Promise<Checkpoint<TState> | null> {
	const history = await loadCheckpointHistory<TState>(runId);
	if (history.length === 0) return null;
	return history[history.length - 1] as Checkpoint<TState>;
}

/**
 * Load latest checkpoint with integrity validation
 */
export async function loadLatestCheckpointWithIntegrity<TState = any>(
	runId: string,
): Promise<CheckpointWithIntegrity<TState> | null> {
	const history = await loadCheckpointHistoryWithIntegrity<TState>(runId);
	if (history.length === 0) return null;
	return history[history.length - 1];
}

/**
 * Cleanup old checkpoints for a given runId
 */
export async function cleanupOldCheckpoints(
	runId: string,
	keepCount: number = 10,
): Promise<void> {
	try {
		const history = await loadCheckpointHistoryWithIntegrity(runId);

		if (history.length <= keepCount) {
			return; // Nothing to cleanup
		}

		// Keep only the latest N checkpoints
		const toKeep = history.slice(-keepCount);
		const file = fileFor(runId);

		// Rewrite file with only the checkpoints to keep
		const newContent = `${toKeep.map((checkpoint) => JSON.stringify(checkpoint)).join('\n')}\n`;

		await fs.writeFile(file, newContent, 'utf8');

		console.info(
			`Cleaned up old checkpoints for runId: ${runId}, kept: ${toKeep.length}, removed: ${history.length - toKeep.length}`,
		);
	} catch (error) {
		console.warn(
			`Failed to cleanup old checkpoints for runId: ${runId}:`,
			error,
		);
	}
}

/**
 * Verify all checkpoints in a file for integrity issues
 */
export async function verifyCheckpointFile(runId: string): Promise<{
	total: number;
	valid: number;
	invalid: number;
	legacy: number;
}> {
	const file = fileFor(runId);
	const stats = { total: 0, valid: 0, invalid: 0, legacy: 0 };

	try {
		const content = await fs.readFile(file, 'utf8');
		const lines = content.split(/\n+/).filter(Boolean);

		for (const line of lines) {
			stats.total++;
			try {
				const parsed = JSON.parse(line);

				if (parsed.checksum && parsed.version) {
					// Checkpoint with integrity validation
					if (validateCheckpointIntegrity(parsed)) {
						stats.valid++;
					} else {
						stats.invalid++;
					}
				} else {
					// Legacy checkpoint
					stats.legacy++;
				}
			} catch (_parseError) {
				stats.invalid++;
			}
		}
	} catch (err: any) {
		if (err && err.code !== 'ENOENT') {
			throw err;
		}
	}

	return stats;
}
