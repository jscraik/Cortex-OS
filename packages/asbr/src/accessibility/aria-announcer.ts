/**
 * ARIA Live Region Manager
 * Manages accessibility announcements for WCAG 2.2 AA compliance
 */

import type { Event, EventType, Profile } from '../types/index.js';

export type AriaLivePriority = 'polite' | 'assertive';
export type AnnouncementType = 'status' | 'progress' | 'error' | 'success' | 'info';

export interface AnnouncementOptions {
	priority?: AriaLivePriority;
	type?: AnnouncementType;
	profileId?: string;
}

export interface AccessibilityProfile {
	screenReader: boolean;
	reducedMotion: boolean;
	highContrast: boolean;
	keyboardOnly: boolean;
	verbosity: 'minimal' | 'standard' | 'verbose';
	announceProgress: boolean;
	announceErrors: boolean;
	announceSuccess: boolean;
}

/**
 * ARIA announcer for accessible status updates
 */
export class AriaAnnouncer {
	private profiles = new Map<string, AccessibilityProfile>();
	private announcementQueue: Array<{
		message: string;
		priority: AriaLivePriority;
		timestamp: number;
		profileId?: string;
	}> = [];

	/**
	 * Set accessibility profile for a user
	 */
	setProfile(profileId: string, profile: AccessibilityProfile): void {
		this.profiles.set(profileId, profile);
	}

	/**
	 * Get accessibility profile for a user
	 */
	getProfile(profileId: string): AccessibilityProfile | undefined {
		return this.profiles.get(profileId);
	}

	/**
	 * Create ARIA live hint for an event
	 */
	createAriaLiveHint(event: Event, options: AnnouncementOptions = {}): string {
		const profile = options.profileId ? this.getProfile(options.profileId) : null;
		const verbosity = profile?.verbosity || 'standard';

		// Get base message from event
		let message = event.ariaLiveHint || this.generateDefaultHint(event);

		// Adjust message based on profile and verbosity
		message = this.adjustMessageForProfile(message, event, profile || null, verbosity);

		// Add contextual information if needed
		if (verbosity === 'verbose' && event.step) {
			message = `${message}. Current step: ${event.step}`;
		}

		return message;
	}

	/**
	 * Generate announcement for task progress
	 */
	announceProgress(taskId: string, step: string, progress: number, profileId?: string): string {
		const profile = profileId ? this.getProfile(profileId) : null;

		if (profile && !profile.announceProgress) {
			return '';
		}

		const verbosity = profile?.verbosity || 'standard';
		let message: string;

		switch (verbosity) {
			case 'minimal':
				message = `${Math.round(progress * 100)}% complete`;
				break;
			case 'verbose':
				message = `Task progress update: ${step} is ${Math.round(progress * 100)}% complete. Task ID: ${taskId}`;
				break;
			default:
				message = `${step}: ${Math.round(progress * 100)}% complete`;
		}

		this.queueAnnouncement(message, 'polite', profileId);
		return message;
	}

	/**
	 * Generate announcement for errors
	 */
	announceError(error: string, context?: string, profileId?: string): string {
		const profile = profileId ? this.getProfile(profileId) : null;

		if (profile && !profile.announceErrors) {
			return '';
		}

		const verbosity = profile?.verbosity || 'standard';
		let message: string;

		switch (verbosity) {
			case 'minimal':
				message = `Error: ${error}`;
				break;
			case 'verbose':
				message = `Error encountered${context ? ` in ${context}` : ''}: ${error}. Please review and take appropriate action.`;
				break;
			default:
				message = `Error${context ? ` in ${context}` : ''}: ${error}`;
		}

		this.queueAnnouncement(message, 'assertive', profileId);
		return message;
	}

	/**
	 * Generate announcement for success
	 */
	announceSuccess(action: string, result?: string, profileId?: string): string {
		const profile = profileId ? this.getProfile(profileId) : null;

		if (profile && !profile.announceSuccess) {
			return '';
		}

		const verbosity = profile?.verbosity || 'standard';
		let message: string;

		switch (verbosity) {
			case 'minimal':
				message = `${action} completed`;
				break;
			case 'verbose':
				message = `Success: ${action} has been completed successfully${result ? `. Result: ${result}` : ''}.`;
				break;
			default:
				message = `${action} completed${result ? `: ${result}` : ''}`;
		}

		this.queueAnnouncement(message, 'polite', profileId);
		return message;
	}

	/**
	 * Create keyboard navigation instructions
	 */
	createKeyboardInstructions(
		context: 'task-list' | 'task-details' | 'evidence' | 'general',
	): string {
		const instructions: Record<string, string> = {
			'task-list': 'Use Tab to navigate between tasks, Enter to select, Space to toggle actions',
			'task-details':
				'Use Tab to navigate sections, Arrow keys for details, Enter to activate buttons',
			evidence: 'Use Tab to navigate evidence items, Enter to view details, Escape to close',
			general: 'Use Tab to navigate, Enter to activate, Escape to cancel, Arrow keys for lists',
		};

		return instructions[context] || instructions.general;
	}

	/**
	 * Generate landmark announcements
	 */
	announceLandmark(
		landmark: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary',
		content?: string,
	): string {
		const landmarkNames = {
			main: 'main content area',
			navigation: 'navigation menu',
			banner: 'page header',
			contentinfo: 'page footer',
			complementary: 'sidebar content',
		};

		const name = landmarkNames[landmark];
		return content ? `Entering ${name}: ${content}` : `Entering ${name}`;
	}

	/**
	 * Queue announcement for delivery
	 */
	private queueAnnouncement(
		message: string,
		priority: AriaLivePriority = 'polite',
		profileId?: string,
	): void {
		this.announcementQueue.push({
			message,
			priority,
			timestamp: Date.now(),
			profileId,
		});

		// Keep queue size manageable
		if (this.announcementQueue.length > 100) {
			this.announcementQueue.splice(0, 50);
		}
	}

	/**
	 * Get queued announcements for a profile
	 */
	getQueuedAnnouncements(profileId?: string): Array<{
		message: string;
		priority: AriaLivePriority;
		timestamp: number;
	}> {
		const filtered = this.announcementQueue.filter(
			(a) => !profileId || a.profileId === profileId || !a.profileId,
		);

		return filtered.map((a) => ({
			message: a.message,
			priority: a.priority,
			timestamp: a.timestamp,
		}));
	}

	/**
	 * Clear announcements queue
	 */
	clearQueue(profileId?: string): void {
		if (profileId) {
			this.announcementQueue = this.announcementQueue.filter((a) => a.profileId !== profileId);
		} else {
			this.announcementQueue = [];
		}
	}

	private generateDefaultHint(event: Event): string {
		const eventMessages: Record<EventType, string> = {
			PlanStarted: 'Planning has started',
			StepCompleted: 'Step completed',
			AwaitingApproval: 'Waiting for approval',
			Canceled: 'Task canceled',
			Resumed: 'Task resumed',
			DeliverableReady: 'Deliverable is ready',
			Failed: 'Task failed',
		};

		return eventMessages[event.type] || 'Status updated';
	}

	private adjustMessageForProfile(
		message: string,
		event: Event,
		profile: AccessibilityProfile | null,
		verbosity: 'minimal' | 'standard' | 'verbose',
	): string {
		if (!profile) {
			return message;
		}

		// Adjust for verbosity level
		switch (verbosity) {
			case 'minimal':
				// Strip unnecessary words
				return message
					.replace(/has been /g, '')
					.replace(/successfully /g, '')
					.replace(/please /gi, '');

			case 'verbose': {
				// Add helpful context
				const taskInfo = event.taskId ? ` for task ${event.taskId.substring(0, 8)}` : '';
				return `${message}${taskInfo}. ${this.getVerboseContext(event)}`;
			}

			default:
				return message;
		}
	}

	private getVerboseContext(event: Event): string {
		const contextMessages: Record<EventType, string> = {
			PlanStarted: 'The system is analyzing requirements and creating an execution plan',
			StepCompleted: 'Moving to the next step in the process',
			AwaitingApproval: 'User confirmation is required to proceed',
			Canceled: 'All related activities have been stopped',
			Resumed: 'Processing will continue from where it left off',
			DeliverableReady: 'Output is available for review and use',
			Failed: 'An error occurred and the task could not be completed',
		};

		return contextMessages[event.type] || 'Status has been updated';
	}
}

/**
 * Create default accessibility profile
 */
export function createDefaultAccessibilityProfile(): AccessibilityProfile {
	return {
		screenReader: false,
		reducedMotion: false,
		highContrast: false,
		keyboardOnly: false,
		verbosity: 'standard',
		announceProgress: true,
		announceErrors: true,
		announceSuccess: true,
	};
}

/**
 * Create accessibility profile from user preferences
 */
export function createAccessibilityProfileFromProfile(profile: Profile): AccessibilityProfile {
	return {
		screenReader: profile.a11y.screenReader || false,
		reducedMotion: profile.a11y.reducedMotion || false,
		highContrast: profile.a11y.highContrast || false,
		keyboardOnly: profile.a11y.keyboardOnly || false,
		verbosity: 'standard', // Could be derived from profile preferences
		announceProgress: true,
		announceErrors: true,
		announceSuccess: true,
	};
}
