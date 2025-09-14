import { beforeAll, expect, it } from 'vitest';
import { archonDescribe } from '../../agents/src/testing/archonTestHarness';
import { createArchonTaskManager } from '../src/integrations/archon-task-manager.js';

const config = {
	enableTaskTracking: false,
	enableProgressUpdates: false,
} as const;

archonDescribe('ArchonTaskManager workflow progression', (ctx) => {
	let manager: ReturnType<typeof createArchonTaskManager>;
	beforeAll(async () => {
		if (!ctx.available) return; // Skip setup if Archon not available
		manager = createArchonTaskManager(config);
		await manager.initialize();
	});

	it('updates status based on completed workflow steps', async () => {
		if (!ctx.available) return; // Graceful skip
		const task = await manager.createTask('wf', 'workflow test');
		await manager.addWorkflowStep(task.id, {
			id: 's1',
			name: 'step1',
			status: 'pending',
		});
		await manager.addWorkflowStep(task.id, {
			id: 's2',
			name: 'step2',
			status: 'pending',
		});

		await manager.updateWorkflowStep(task.id, 's1', { status: 'completed' });
		const mid = manager.getTask(task.id);
		expect(mid?.status).toBe('in_progress');

		await manager.updateWorkflowStep(task.id, 's2', { status: 'completed' });
		const done = manager.getTask(task.id);
		expect(done?.status).toBe('completed');
	});
});
