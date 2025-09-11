import { v4 as uuidv4 } from 'uuid';
import type { Event, Task, TaskInput } from '../types/index.js';

/**
 * Emit PlanStarted event for a newly queued task
 */
export async function emitPlanStarted(
	emit: (event: Event) => Promise<void>,
	task: Task,
	input: TaskInput,
): Promise<void> {
	await emit({
		id: uuidv4(),
		type: 'PlanStarted',
		taskId: task.id,
		ariaLiveHint: `Task "${input.title}" has been queued`,
		timestamp: new Date().toISOString(),
	});
}
