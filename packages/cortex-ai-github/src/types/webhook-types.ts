/**
 * TypeScript interfaces for GitHub webhook payloads
 * Replaces all 'any' types with proper type safety
 */

export interface GitHubWebhookPayload {
	action: string;
	repository: Repository;
	comment?: Comment;
	pull_request?: PullRequest;
	issue?: Issue;
	sender: User;
	installation?: Installation;
}

export interface Repository {
	id: number;
	name: string;
	full_name: string;
	owner: User;
	clone_url: string;
	default_branch: string;
	private: boolean;
	html_url: string;
}

export interface Comment {
	id: number;
	body: string;
	user: User;
	created_at: string;
	updated_at: string;
	html_url: string;
	author_association: string;
}

export interface PullRequest {
	number: number;
	title: string;
	body: string | null;
	head: GitRef;
	base: GitRef;
	labels: Label[];
	state: 'open' | 'closed' | 'draft';
	html_url: string;
	user: User;
}

export interface Issue {
	number: number;
	title: string;
	body: string | null;
	labels: Label[];
	state: 'open' | 'closed';
	html_url: string;
	user: User;
	pull_request?: PullRequestLink;
}

export interface User {
	login: string;
	id: number;
	type: 'User' | 'Bot';
	html_url: string;
	avatar_url: string;
}

export interface GitRef {
	ref: string;
	sha: string;
	repo: Repository;
	label: string;
}

export interface Label {
	name: string;
	color: string;
	description: string | null;
}

export interface PullRequestLink {
	url: string;
}

export interface Installation {
	id: number;
	account: User;
}

/**
 * Webhook event types for type-safe event handling
 */
export type WebhookEventType =
	| 'issue_comment'
	| 'pull_request'
	| 'issues'
	| 'push'
	| 'pull_request_review'
	| 'pull_request_review_comment';

/**
 * Command context for processing user instructions
 */
export interface CommandContext {
	command: string;
	args: string[];
	user: string;
	repository: Repository;
	issue_number?: number;
	pull_request_number?: number;
	comment_id?: number;
}

/**
 * Progressive status types for emoji reactions
 */
export type ProgressiveStatus =
	| 'reading'
	| 'processing'
	| 'working'
	| 'success'
	| 'error'
	| 'warning';

/**
 * Emoji mappings for progressive status updates
 */
export const STATUS_EMOJIS: Record<ProgressiveStatus, string> = {
	reading: '👀',
	processing: '⚙️',
	working: '🔧',
	success: '🚀',
	error: '❌',
	warning: '⚠️',
};
