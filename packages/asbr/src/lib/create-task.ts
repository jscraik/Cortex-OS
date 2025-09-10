import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../types/index.js';

/**
 * Create a new task entity
 */
export function createTask(): Task {
	const now = new Date().toISOString();
	return {
		id: uuidv4(),
		status: 'queued',
		artifacts: [],
		evidenceIds: [],
		approvals: [],
		createdAt: now,
		updatedAt: now,
		schema: 'cortex.task@1',
	};
}
