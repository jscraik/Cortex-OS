/**
 * Real-time Progress Updates - Copilot-inspired live feedback
 * Updates GitHub comments in real-time to show task progress
 */

import { Octokit } from '@octokit/rest';
import { randomUUID } from 'node:crypto';

export interface ProgressStep {
	step: number;
	totalSteps: number;
	title: string;
	status: 'pending' | 'running' | 'completed' | 'error';
	details?: string;
	startTime?: Date;
	endTime?: Date;
}

export interface ProgressState {
	taskId: string;
	commentId: number;
	user: string;
	taskType: string;
	steps: ProgressStep[];
	startTime: Date;
	endTime?: Date;
	status: 'running' | 'completed' | 'error';
}

type RepoRef = { owner: { login: string }; name: string };
type GitHubPayloadLike = {
	repository: RepoRef;
	issue?: { number: number };
	pull_request?: { number: number };
};

export class LiveProgressUpdater {
	private readonly octokit: Octokit;
	private readonly activeProgress = new Map<string, ProgressState>();
	private readonly cleanupInterval: NodeJS.Timeout;
	private readonly MAX_ACTIVE_TASKS = 100;
	private readonly STALE_TASK_TIMEOUT = 30 * 60 * 1000; // 30 minutes

	constructor(githubToken: string) {
		this.octokit = new Octokit({ auth: githubToken });

		// Auto-cleanup every 5 minutes
		this.cleanupInterval = setInterval(
			() => {
				this.cleanupStaleProgress();
				this.enforceMaxTasks();
			},
			5 * 60 * 1000,
		);
	}

	/**
	 * Start a new progress tracking session
	 */
	async startProgress(
		payload: GitHubPayloadLike,
		taskType: string,
		user: string,
		steps: Array<{ title: string; details?: string }>,
	): Promise<string> {
		const taskId = this.generateTaskId();
		const owner = payload.repository.owner.login;
		const repo = payload.repository.name;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		// Create initial progress comment
		const progressSteps: ProgressStep[] = steps.map((step, index) => ({
			step: index + 1,
			totalSteps: steps.length,
			title: step.title,
			status: 'pending' as const,
			details: step.details,
		}));

		const initialComment = this.generateProgressComment({
			taskId,
			commentId: 0, // Will be updated after comment creation
			user,
			taskType,
			steps: progressSteps,
			startTime: new Date(),
			status: 'running',
		});

		try {
			const comment = await this.octokit.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber as number,
				body: initialComment,
			});

			// Store progress state
			const progressState: ProgressState = {
				taskId,
				commentId: comment.data.id,
				user,
				taskType,
				steps: progressSteps,
				startTime: new Date(),
				status: 'running',
			};

			this.activeProgress.set(taskId, progressState);

			// Start first step
			await this.updateStepStatus(taskId, 1, 'running');

			return taskId;
		} catch (error) {
			console.error('Error creating progress comment:', error);
			throw error;
		}
	}

	/**
	 * Update status of a specific step
	 */
	async updateStepStatus(
		taskId: string,
		stepNumber: number,
		status: 'pending' | 'running' | 'completed' | 'error',
		details?: string,
	): Promise<void> {
		const progressState = this.activeProgress.get(taskId);
		if (!progressState) {
			console.warn(`Progress state not found for task ${taskId}`);
			return;
		}

		const step = progressState.steps.find((s) => s.step === stepNumber);
		if (!step) {
			console.warn(`Step ${stepNumber} not found for task ${taskId}`);
			return;
		}

		// Update step
		step.status = status;
		if (details) step.details = details;

		if (status === 'running') {
			step.startTime = new Date();
		} else if (status === 'completed' || status === 'error') {
			step.endTime = new Date();

			// Auto-start next step if current step completed successfully
			if (status === 'completed' && stepNumber < progressState.steps.length) {
				const nextStep = progressState.steps.find(
					(s) => s.step === stepNumber + 1,
				);
				if (nextStep) {
					nextStep.status = 'running';
					nextStep.startTime = new Date();
				}
			}
		}

		// Update comment
		await this.updateProgressComment(progressState);
	}

	/**
	 * Complete the entire task
	 */
	async completeTask(
		taskId: string,
		status: 'completed' | 'error',
		finalMessage?: string,
	): Promise<void> {
		const progressState = this.activeProgress.get(taskId);
		if (!progressState) return;

		progressState.status = status;
		progressState.endTime = new Date();

		// Mark any remaining steps as completed or error
		progressState.steps.forEach((step) => {
			if (step.status === 'pending' || step.status === 'running') {
				step.status = status === 'completed' ? 'completed' : 'error';
				step.endTime = new Date();
			}
		});

		// Add final message if provided
		if (finalMessage) {
			progressState.steps.push({
				step: progressState.steps.length + 1,
				totalSteps: progressState.steps.length + 1,
				title: 'Result',
				status: 'completed',
				details: finalMessage,
				startTime: new Date(),
				endTime: new Date(),
			});
		}

		await this.updateProgressComment(progressState);

		// Clean up
		this.activeProgress.delete(taskId);
	}

	private async updateProgressComment(
		progressState: ProgressState,
	): Promise<void> {
		try {
			const updatedComment = this.generateProgressComment(progressState);

			// Extract owner/repo from the stored comment data
			// Note: In a production implementation, you'd store these separately
			// For now, we'll need to pass them or extract from context

			// Real-time progress updates removed - use progressive reactions instead
			console.warn('Progress update logged:', updatedComment);
		} catch (error) {
			console.error('Error updating progress comment:', error);
		}
	}

	private generateProgressComment(progressState: ProgressState): string {
		const { user, taskType, steps, startTime, endTime, status } = progressState;

		const elapsed = endTime
			? endTime.getTime() - startTime.getTime()
			: Date.now() - startTime.getTime();
		const elapsedSeconds = Math.round(elapsed / 1000);

		let comment = `@${user} **${taskType.toUpperCase()} Progress**\n\n`;

		// Status indicator
		let statusEmoji = '⚙️';
		let statusText = 'In Progress';
		if (status === 'completed') {
			statusEmoji = '✅';
			statusText = 'Completed';
		} else if (status === 'error') {
			statusEmoji = '❌';
			statusText = 'Failed';
		}

		comment += `${statusEmoji} **Status:** ${statusText} (${elapsedSeconds}s)\n\n`;

		// Progress bar
		const completedSteps = steps.filter((s) => s.status === 'completed').length;
		const totalSteps = steps.length;
		const progressPercent = Math.round((completedSteps / totalSteps) * 100);

		const progressBar =
			'█'.repeat(Math.round(progressPercent / 5)) +
			'░'.repeat(20 - Math.round(progressPercent / 5));
		comment += `**Progress:** ${progressPercent}% [${progressBar}] ${completedSteps}/${totalSteps}\n\n`;

		// Step details
		comment += `**Steps:**\n`;
		for (const step of steps) {
			const stepEmoji = this.getStepEmoji(step.status);
			let duration = '';
			if (step.startTime && step.endTime) {
				const seconds = Math.round(
					(step.endTime.getTime() - step.startTime.getTime()) / 1000,
				);
				duration = ` (${seconds}s)`;
			} else if (step.startTime && step.status === 'running') {
				const seconds = Math.round(
					(Date.now() - step.startTime.getTime()) / 1000,
				);
				duration = ` (${seconds}s)`;
			}

			comment += `${stepEmoji} **${step.step}.** ${step.title}${duration}\n`;

			if (step.details) {
				comment += `   └─ ${step.details}\n`;
			}
		}

		comment += `\n---\n*Live updates • Last updated: ${new Date().toLocaleTimeString()}*`;

		return comment;
	}

	private getStepEmoji(status: ProgressStep['status']): string {
		switch (status) {
			case 'pending':
				return '⏳';
			case 'running':
				return '⚙️';
			case 'completed':
				return '✅';
			case 'error':
				return '❌';
		}
	}

	private generateTaskId(): string {
		return `task_${Date.now()}_${randomUUID().substring(0, 8)}`;
	}

	/**
	 * Get current progress for a task (useful for debugging)
	 */
	getProgress(taskId: string): ProgressState | undefined {
		return this.activeProgress.get(taskId);
	}

	/**
	 * Get all active progress tasks (useful for monitoring)
	 */
	getActiveProgress(): ProgressState[] {
		return Array.from(this.activeProgress.values());
	}

	/**
	 * Clean up stale progress tasks
	 */
	private cleanupStaleProgress(): void {
		const now = Date.now();
		const staleTasks: string[] = [];

		for (const [taskId, progress] of this.activeProgress.entries()) {
			const taskAge = now - progress.startTime.getTime();

			if (taskAge > this.STALE_TASK_TIMEOUT) {
				staleTasks.push(taskId);
				console.warn(
					`Cleaning up stale progress task: ${taskId} (age: ${Math.round(taskAge / 60000)}min)`,
				);
			}
		}

		for (const taskId of staleTasks) {
			this.activeProgress.delete(taskId);
		}
	}

	/**
	 * Enforce maximum number of active tasks
	 */
	private enforceMaxTasks(): void {
		if (this.activeProgress.size > this.MAX_ACTIVE_TASKS) {
			// Remove oldest tasks first
			const entries = Array.from(this.activeProgress.entries()).sort(
				([, a], [, b]) => a.startTime.getTime() - b.startTime.getTime(),
			);

			const toRemove = entries.slice(0, entries.length - this.MAX_ACTIVE_TASKS);
			for (const [taskId] of toRemove) {
				console.warn(`Removing old progress task due to limit: ${taskId}`);
				this.activeProgress.delete(taskId);
			}
		}
	}

	/**
	 * Destroy the progress updater and clean up resources
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.activeProgress.clear();
		console.warn('LiveProgressUpdater destroyed and resources cleaned up');
	}
}
