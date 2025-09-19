/**
 * Event System Utilities for nO System
 *
 * Provides consistent event naming, payload structures, and listener management
 * across all components in the nO system.
 */

import { EventEmitter } from 'node:events';

// Event naming prefixes for different components
export const EVENT_PREFIXES = {
	MASTER_LOOP: 'masterLoop',
	RESOURCE_ALLOCATOR: 'resourceAllocator',
	SUBAGENT_POOL: 'subagentPool',
	SUBAGENT_MANAGER: 'subagentManager',
	EXECUTION_MONITOR: 'executionMonitor',
	A2A: 'a2a',
} as const;

// Event types with consistent naming
export const EVENT_TYPES = {
	// Master Agent Loop events
	MASTER_LOOP_INITIALIZED: 'masterLoopInitialized',
	MASTER_LOOP_INITIALIZATION_ERROR: 'masterLoopInitializationError',
	MASTER_LOOP_REQUEST_RECEIVED: 'masterLoopRequestReceived',
	MASTER_LOOP_RESOURCES_ALLOCATED: 'masterLoopResourcesAllocated',
	MASTER_LOOP_RESOURCES_RELEASED: 'masterLoopResourcesReleased',
	MASTER_LOOP_EXECUTION_STARTED: 'masterLoopExecutionStarted',
	MASTER_LOOP_REQUEST_COMPLETED: 'masterLoopRequestCompleted',
	MASTER_LOOP_REQUEST_CANCELLED: 'masterLoopRequestCancelled',
	MASTER_LOOP_REQUEST_ERROR: 'masterLoopRequestError',
	MASTER_LOOP_STRATEGY_ADAPTED: 'masterLoopStrategyAdapted',
	MASTER_LOOP_ADAPTATION_ERROR: 'masterLoopAdaptationError',
	MASTER_LOOP_EXECUTION_TIMEOUT: 'masterLoopExecutionTimeout',
	MASTER_LOOP_EXECUTION_FAILED: 'masterLoopExecutionFailed',
	MASTER_LOOP_RESOURCE_VIOLATION: 'masterLoopResourceViolation',
	MASTER_LOOP_CANCELLATION_ERROR: 'masterLoopCancellationError',
	MASTER_LOOP_SHUTDOWN_STARTED: 'masterLoopShutdownStarted',
	MASTER_LOOP_SHUTDOWN_COMPLETED: 'masterLoopShutdownCompleted',
	MASTER_LOOP_SHUTDOWN_ERROR: 'masterLoopShutdownError',
	MASTER_LOOP_METRICS_UPDATED: 'masterLoopMetricsUpdated',

	// Resource Allocator events
	RESOURCE_ALLOCATOR_RESOURCES_ALLOCATED: 'resourceAllocatorResourcesAllocated',
	RESOURCE_ALLOCATOR_RESOURCES_RELEASED: 'resourceAllocatorResourcesReleased',
	RESOURCE_ALLOCATOR_REQUEST_QUEUED: 'resourceAllocatorRequestQueued',
	RESOURCE_ALLOCATOR_TOKEN_COUNTER_RESET: 'resourceAllocatorTokenCounterReset',
	RESOURCE_ALLOCATOR_LIMITS_UPDATED: 'resourceAllocatorLimitsUpdated',
	RESOURCE_ALLOCATOR_ALLOCATION_EXPIRED: 'resourceAllocatorAllocationExpired',
	RESOURCE_ALLOCATOR_SHUTDOWN: 'resourceAllocatorShutdown',
	RESOURCE_ALLOCATOR_METRICS_UPDATED: 'resourceAllocatorMetricsUpdated',

	// Subagent Pool events
	SUBAGENT_POOL_SUBAGENT_ADDED: 'subagentPoolSubagentAdded',
	SUBAGENT_POOL_SUBAGENT_ADD_ERROR: 'subagentPoolSubagentAddError',
	SUBAGENT_POOL_SUBAGENT_REMOVED: 'subagentPoolSubagentRemoved',
	SUBAGENT_POOL_SUBAGENT_REMOVE_ERROR: 'subagentPoolSubagentRemoveError',
	SUBAGENT_POOL_TASK_STARTED: 'subagentPoolTaskStarted',
	SUBAGENT_POOL_TASK_COMPLETED: 'subagentPoolTaskCompleted',
	SUBAGENT_POOL_TASK_FAILED: 'subagentPoolTaskFailed',
	SUBAGENT_POOL_TASK_QUEUED: 'subagentPoolTaskQueued',
	SUBAGENT_POOL_HEALTH_STATUS_CHANGED: 'subagentPoolHealthStatusChanged',
	SUBAGENT_POOL_HEALTH_CHECK_FAILED: 'subagentPoolHealthCheckFailed',
	SUBAGENT_POOL_LIMITS_UPDATED: 'subagentPoolLimitsUpdated',
	SUBAGENT_POOL_SHUTDOWN_STARTED: 'subagentPoolShutdownStarted',
	SUBAGENT_POOL_SHUTDOWN_COMPLETED: 'subagentPoolShutdownCompleted',
	SUBAGENT_POOL_SHUTDOWN_ERROR: 'subagentPoolShutdownError',

	// Subagent Manager events
	SUBAGENT_MANAGER_INITIALIZED: 'subagentManagerInitialized',
	SUBAGENT_MANAGER_INITIALIZATION_FAILED: 'subagentManagerInitializationFailed',
	SUBAGENT_MANAGER_SUBAGENT_REGISTERED: 'subagentManagerSubagentRegistered',
	SUBAGENT_MANAGER_SUBAGENT_UNREGISTERED: 'subagentManagerSubagentUnregistered',
	SUBAGENT_MANAGER_CONFIG_LOADED: 'subagentManagerConfigLoaded',
	SUBAGENT_MANAGER_CONFIG_LOAD_FAILED: 'subagentManagerConfigLoadFailed',
	SUBAGENT_MANAGER_CONFIG_CHANGED: 'subagentManagerConfigChanged',
	SUBAGENT_MANAGER_SUBAGENT_RELOADING: 'subagentManagerSubagentReloading',
	SUBAGENT_MANAGER_SUBAGENT_RELOADED: 'subagentManagerSubagentReloaded',
	SUBAGENT_MANAGER_SUBAGENT_RELOAD_FAILED: 'subagentManagerSubagentReloadFailed',
	SUBAGENT_MANAGER_SUBAGENT_LOAD_FAILED: 'subagentManagerSubagentLoadFailed',
	SUBAGENT_MANAGER_SHUTDOWN: 'subagentManagerShutdown',

	// A2A events
	A2A_AGENT_CREATED: 'a2aAgentCreated',
	A2A_TASK_STARTED: 'a2aTaskStarted',
	A2A_TASK_COMPLETED: 'a2aTaskCompleted',
	A2A_COMMUNICATION: 'a2aCommunication',
} as const;

// Base event payload structure
export interface BaseEventPayload {
	timestamp: string;
	source?: string;
}

// Event listener tracking interface
export interface EventListener {
	emitter: EventEmitter;
	event: string;
	listener: (...args: any[]) => void;
}

// Event listener manager class
export class EventListenerManager {
	private listeners: EventListener[] = [];

	/**
	 * Add an event listener and track it for cleanup
	 */
	addListener(emitter: EventEmitter, event: string, listener: (...args: any[]) => void): void {
		emitter.on(event, listener);
		this.listeners.push({ emitter, event, listener });
	}

	/**
	 * Remove a specific event listener
	 */
	removeListener(emitter: EventEmitter, event: string, listener: (...args: any[]) => void): void {
		emitter.removeListener(event, listener);
		const index = this.listeners.findIndex(
			(l) => l.emitter === emitter && l.event === event && l.listener === listener,
		);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * Remove all tracked event listeners
	 */
	removeAllListeners(): void {
		for (const { emitter, event, listener } of this.listeners) {
			emitter.removeListener(event, listener);
		}
		this.listeners = [];
	}

	/**
	 * Get count of tracked listeners
	 */
	getListenerCount(): number {
		return this.listeners.length;
	}
}

// Event emitter wrapper with consistent payload handling
export class ConsistentEventEmitter extends EventEmitter {
	private listenerManager: EventListenerManager = new EventListenerManager();

	/**
	 * Emit event with consistent payload structure
	 */
	emitWithPayload(event: string, payload: Record<string, unknown>): boolean {
		const consistentPayload: BaseEventPayload & Record<string, unknown> = {
			timestamp: new Date().toISOString(),
			...payload,
		};
		return this.emit(event, consistentPayload);
	}

	/**
	 * Add event listener with tracking
	 */
	addTrackedListener(event: string, listener: (...args: any[]) => void): void {
		this.addListener(event, listener);
	}

	/**
	 * Remove all tracked listeners
	 */
	removeAllTrackedListeners(): void {
		this.listenerManager.removeAllListeners();
	}

	/**
	 * Get listener count
	 */
	getTrackedListenerCount(): number {
		return this.listenerManager.getListenerCount();
	}
}

// Helper functions for event payload creation
export const createEventPayload = <T extends Record<string, unknown>>(
	basePayload: T,
): BaseEventPayload & T => ({
	timestamp: new Date().toISOString(),
	...basePayload,
});

export const createErrorEventPayload = (
	error: unknown,
	additionalData?: Record<string, unknown>,
): BaseEventPayload & {
	error: string;
	code?: string;
} & Record<string, unknown> => ({
	timestamp: new Date().toISOString(),
	error: error instanceof Error ? error.message : String(error),
	...(error instanceof Error && (error as any).code ? { code: (error as any).code } : {}),
	...additionalData,
});

export const createResourceEventPayload = (
	resource: string,
	action: string,
	data: Record<string, unknown>,
): BaseEventPayload & {
	resource: string;
	action: string;
} & Record<string, unknown> => ({
	timestamp: new Date().toISOString(),
	resource,
	action,
	...data,
});

// Event validation helpers
export const validateEventPayload = <T>(
	payload: unknown,
	requiredFields: string[],
): payload is T => {
	if (typeof payload !== 'object' || payload === null) {
		return false;
	}

	const payloadObj = payload as Record<string, unknown>;
	return requiredFields.every((field) => field in payloadObj);
};

// Event naming validator
export const isValidEventName = (eventName: string): boolean => {
	return Object.values(EVENT_TYPES).includes(eventName as any);
};

// Event prefix extractor
export const getEventPrefix = (eventName: string): string => {
	const parts = eventName.split('_');
	return parts[0];
};

// Event category classifier
export const classifyEvent = (eventName: string): string => {
	const prefix = getEventPrefix(eventName);
	switch (prefix) {
		case EVENT_PREFIXES.MASTER_LOOP:
			return 'masterLoop';
		case EVENT_PREFIXES.RESOURCE_ALLOCATOR:
			return 'resourceAllocator';
		case EVENT_PREFIXES.SUBAGENT_POOL:
			return 'subagentPool';
		case EVENT_PREFIXES.SUBAGENT_MANAGER:
			return 'subagentManager';
		case EVENT_PREFIXES.EXECUTION_MONITOR:
			return 'executionMonitor';
		case EVENT_PREFIXES.A2A:
			return 'a2a';
		default:
			return 'unknown';
	}
};
