import { z } from 'zod';
import {
	type GitHubRepository,
	GitHubRepositorySchema,
	type GitHubUser,
	GitHubUserSchema,
} from './repository.js';

// Error Severity Levels
export const ErrorSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;

// Error Categories
export const ErrorCategorySchema = z.enum([
	'authentication',
	'authorization',
	'rate_limit',
	'network',
	'api',
	'validation',
	'timeout',
	'internal',
	'configuration',
	'webhook',
]);
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

// Error Context Schema
export const ErrorContextSchema = z.object({
	operation: z.string(),
	endpoint: z.string().optional(),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
	status_code: z.number().optional(),
	retry_count: z.number().default(0),
	request_id: z.string().optional(),
	user_agent: z.string().optional(),
	rate_limit_remaining: z.number().optional(),
	rate_limit_reset: z.string().datetime().optional(),
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// GitHub Error Schema
export const GitHubErrorSchema = z.object({
	id: z.string().uuid(),
	message: z.string(),
	category: ErrorCategorySchema,
	severity: ErrorSeveritySchema,
	is_retryable: z.boolean(),
	context: ErrorContextSchema,
	timestamp: z.string().datetime(),
	stack_trace: z.string().optional(),
	correlation_id: z.string().optional(),

	// GitHub-specific error details
	documentation_url: z.string().url().optional(),
	github_error_code: z.string().optional(),
	github_error_details: z.record(z.unknown()).optional(),
});

export type GitHubError = z.infer<typeof GitHubErrorSchema>;

// Error Event Schema
export const ErrorEventSchema = z.object({
	event_id: z.string().uuid(),
	event_type: z.literal('github.error'),
	source: z.literal('github-client'),
	timestamp: z.string().datetime(),

	// Event-specific data
	error: GitHubErrorSchema,
	repository: GitHubRepositorySchema.optional(),
	actor: GitHubUserSchema.optional(),

	// Recovery information
	recovery_suggestion: z.string().optional(),
	auto_retry_scheduled: z.boolean().default(false),
	next_retry_at: z.string().datetime().optional(),

	// Metadata
	metadata: z.record(z.string()).optional(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

// Error Event Topic
export const ERROR_EVENT_TOPIC = 'github.error';

// Validation Functions
export function validateErrorEvent(data: unknown): ErrorEvent {
	return ErrorEventSchema.parse(data);
}

export function isErrorEvent(data: unknown): data is ErrorEvent {
	return ErrorEventSchema.safeParse(data).success;
}

// Helper Functions
export function createErrorEvent(
	error: GitHubError,
	repository?: GitHubRepository,
	actor?: GitHubUser,
	additionalData?: {
		recoverySuggestion?: string;
		autoRetryScheduled?: boolean;
		nextRetryAt?: string;
	},
): Omit<ErrorEvent, 'event_id' | 'timestamp'> {
	return {
		event_type: 'github.error',
		source: 'github-client',
		error,
		repository,
		actor,
		recovery_suggestion: additionalData?.recoverySuggestion,
		auto_retry_scheduled: additionalData?.autoRetryScheduled ?? false,
		next_retry_at: additionalData?.nextRetryAt,
		metadata: {
			error_category: error.category,
			error_severity: error.severity,
			is_retryable: error.is_retryable.toString(),
			operation: error.context.operation,
			status_code: error.context.status_code?.toString(),
			retry_count: error.context.retry_count.toString(),
			repository_id: repository?.id.toString(),
			repository_name: repository?.full_name,
			actor_id: actor?.id.toString(),
			actor_login: actor?.login,
		},
	};
}

export function getErrorEventTopic(): string {
	return ERROR_EVENT_TOPIC;
}

// Error Classification Helpers
export function isRetryableError(error: GitHubError): boolean {
	return error.is_retryable;
}

export function isRateLimitError(error: GitHubError): boolean {
	return error.category === 'rate_limit';
}

export function isAuthenticationError(error: GitHubError): boolean {
	return error.category === 'authentication' || error.category === 'authorization';
}

export function isNetworkError(error: GitHubError): boolean {
	return error.category === 'network' || error.category === 'timeout';
}

export function isCriticalError(error: GitHubError): boolean {
	return error.severity === 'critical';
}

// Error Creation Helpers
export function createAuthenticationError(
	message: string,
	context: Partial<ErrorContext>,
	additionalData?: {
		documentationUrl?: string;
		githubErrorCode?: string;
	},
): GitHubError {
	return {
		id: crypto.randomUUID(),
		message,
		category: 'authentication',
		severity: 'high',
		is_retryable: false,
		context: {
			operation: context.operation ?? 'unknown',
			...context,
		},
		timestamp: new Date().toISOString(),
		documentation_url: additionalData?.documentationUrl,
		github_error_code: additionalData?.githubErrorCode,
	};
}

export function createRateLimitError(
	message: string,
	context: Partial<ErrorContext>,
	rateLimitReset?: string,
): GitHubError {
	return {
		id: crypto.randomUUID(),
		message,
		category: 'rate_limit',
		severity: 'medium',
		is_retryable: true,
		context: {
			operation: context.operation ?? 'unknown',
			rate_limit_reset: rateLimitReset,
			...context,
		},
		timestamp: new Date().toISOString(),
	};
}

export function createNetworkError(message: string, context: Partial<ErrorContext>): GitHubError {
	return {
		id: crypto.randomUUID(),
		message,
		category: 'network',
		severity: 'medium',
		is_retryable: true,
		context: {
			operation: context.operation ?? 'unknown',
			...context,
		},
		timestamp: new Date().toISOString(),
	};
}

export function createValidationError(
	message: string,
	context: Partial<ErrorContext>,
): GitHubError {
	return {
		id: crypto.randomUUID(),
		message,
		category: 'validation',
		severity: 'low',
		is_retryable: false,
		context: {
			operation: context.operation ?? 'unknown',
			...context,
		},
		timestamp: new Date().toISOString(),
	};
}

// Error Analysis
export interface ErrorAnalysis {
	totalErrors: number;
	errorsByCategory: Record<ErrorCategory, number>;
	errorsBySeverity: Record<ErrorSeverity, number>;
	retryableErrors: number;
	criticalErrors: number;
	mostCommonCategory: ErrorCategory;
	averageRetryCount: number;
	timespan: {
		earliest: string;
		latest: string;
		durationMinutes: number;
	};
}

export function analyzeErrors(errors: GitHubError[]): ErrorAnalysis {
	if (errors.length === 0) {
		return {
			totalErrors: 0,
			errorsByCategory: {} as Record<ErrorCategory, number>,
			errorsBySeverity: {} as Record<ErrorSeverity, number>,
			retryableErrors: 0,
			criticalErrors: 0,
			mostCommonCategory: 'internal',
			averageRetryCount: 0,
			timespan: {
				earliest: new Date().toISOString(),
				latest: new Date().toISOString(),
				durationMinutes: 0,
			},
		};
	}

	const analysis: ErrorAnalysis = {
		totalErrors: errors.length,
		errorsByCategory: {} as Record<ErrorCategory, number>,
		errorsBySeverity: {} as Record<ErrorSeverity, number>,
		retryableErrors: 0,
		criticalErrors: 0,
		mostCommonCategory: 'internal',
		averageRetryCount: 0,
		timespan: {
			earliest: errors[0].timestamp,
			latest: errors[0].timestamp,
			durationMinutes: 0,
		},
	};

	let totalRetryCount = 0;
	let earliestTime = new Date(errors[0].timestamp);
	let latestTime = new Date(errors[0].timestamp);

	// Initialize counters
	const categories: ErrorCategory[] = [
		'authentication',
		'authorization',
		'rate_limit',
		'network',
		'api',
		'validation',
		'timeout',
		'internal',
		'configuration',
		'webhook',
	];
	const severities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];

	for (const cat of categories) {
		analysis.errorsByCategory[cat] = 0;
	}
	for (const sev of severities) {
		analysis.errorsBySeverity[sev] = 0;
	}

	// Analyze each error
	for (const error of errors) {
		analysis.errorsByCategory[error.category]++;
		analysis.errorsBySeverity[error.severity]++;

		if (error.is_retryable) {
			analysis.retryableErrors++;
		}

		if (error.severity === 'critical') {
			analysis.criticalErrors++;
		}

		totalRetryCount += error.context.retry_count;

		const errorTime = new Date(error.timestamp);
		if (errorTime < earliestTime) {
			earliestTime = errorTime;
			analysis.timespan.earliest = error.timestamp;
		}
		if (errorTime > latestTime) {
			latestTime = errorTime;
			analysis.timespan.latest = error.timestamp;
		}
	}

	// Calculate derived metrics
	analysis.averageRetryCount = totalRetryCount / errors.length;
	analysis.timespan.durationMinutes = Math.floor(
		(latestTime.getTime() - earliestTime.getTime()) / (1000 * 60),
	);

	// Find most common category
	let maxCount = 0;
	for (const [category, count] of Object.entries(analysis.errorsByCategory)) {
		if (count > maxCount) {
			maxCount = count;
			analysis.mostCommonCategory = category as ErrorCategory;
		}
	}

	return analysis;
}

// Recovery Helpers
export function shouldRetryError(error: GitHubError, maxRetries: number = 3): boolean {
	return error.is_retryable && error.context.retry_count < maxRetries;
}

export function calculateRetryDelay(error: GitHubError, baseDelayMs: number = 1000): number {
	if (error.category === 'rate_limit' && error.context.rate_limit_reset) {
		const resetTime = new Date(error.context.rate_limit_reset);
		const now = new Date();
		return Math.max(0, resetTime.getTime() - now.getTime());
	}

	// Exponential backoff with jitter
	const exponentialDelay = baseDelayMs * 2 ** error.context.retry_count;
	const jitter = Math.random() * 0.1 * exponentialDelay;
	return exponentialDelay + jitter;
}

export function getRecoverySuggestion(error: GitHubError): string {
	switch (error.category) {
		case 'authentication':
			return 'Check your GitHub personal access token or app credentials';
		case 'authorization':
			return 'Verify that your token has the required permissions for this operation';
		case 'rate_limit':
			return `Wait until ${error.context.rate_limit_reset} before retrying`;
		case 'network':
		case 'timeout':
			return 'Check your network connection and try again';
		case 'validation':
			return 'Review the request parameters and ensure they meet GitHub API requirements';
		case 'configuration':
			return 'Check your GitHub client configuration settings';
		case 'webhook':
			return 'Verify webhook URL is accessible and signature validation is correct';
		default:
			return 'Review the error details and consult GitHub API documentation';
	}
}
