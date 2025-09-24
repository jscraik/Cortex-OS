/**
 * React Hooks for A2A Event Management
 *
 * Provides React-friendly hooks for subscribing to and managing A2A events
 * from the cortex-webui frontend.
 */

import { useCallback, useEffect, useState } from 'react';
import {
	type A2AEvent,
	a2aWebSocketManager,
	type MLXEmbeddingEvent,
	type MLXModelEvent,
	type MLXThermalEvent,
	type WebUIAgentEvent,
	type WebUISystemEvent,
	type WebUIUserEvent,
} from '../services/a2a-websocket.js';

// ================================
// Connection Hook
// ================================

export function useA2AConnection(token?: string) {
	const [connected, setConnected] = useState(false);
	const [connectionStats, setConnectionStats] = useState(a2aWebSocketManager.getConnectionStats());

	useEffect(() => {
		if (!token) return;

		// Connect to A2A WebSocket
		a2aWebSocketManager.connect(token);

		// Subscribe to connection events
		const unsubscribeConnected = a2aWebSocketManager.onWebSocketEvent('connected', () => {
			setConnected(true);
			setConnectionStats(a2aWebSocketManager.getConnectionStats());
		});

		const unsubscribeDisconnected = a2aWebSocketManager.onWebSocketEvent('disconnected', () => {
			setConnected(false);
			setConnectionStats(a2aWebSocketManager.getConnectionStats());
		});

		// Initial state
		setConnected(a2aWebSocketManager.isConnected());

		return () => {
			unsubscribeConnected();
			unsubscribeDisconnected();
		};
	}, [token]);

	useEffect(() => {
		return () => {
			// Cleanup on unmount
			a2aWebSocketManager.disconnect();
		};
	}, []);

	return {
		connected,
		connectionStats,
		sessionId: a2aWebSocketManager.getSessionId(),
		connect: (token: string) => a2aWebSocketManager.connect(token),
		disconnect: () => a2aWebSocketManager.disconnect(),
	};
}

// ================================
// Generic A2A Event Hook
// ================================

export function useA2AEvent<T = any>(eventType: string, enabled: boolean = true) {
	const [events, setEvents] = useState<(A2AEvent & { data: T })[]>([]);
	const [latestEvent, setLatestEvent] = useState<(A2AEvent & { data: T }) | null>(null);

	const handleEvent = useCallback((event: A2AEvent & { data: T }) => {
		setLatestEvent(event);
		setEvents((prev) => [...prev, event]);
	}, []);

	useEffect(() => {
		if (!enabled) return;

		const unsubscribe = a2aWebSocketManager.onA2AEvent<T>(eventType, handleEvent);

		return unsubscribe;
	}, [eventType, enabled, handleEvent]);

	const clearEvents = useCallback(() => {
		setEvents([]);
		setLatestEvent(null);
	}, []);

	return {
		events,
		latestEvent,
		clearEvents,
		eventCount: events.length,
	};
}

// ================================
// Specific Event Hooks
// ================================

export function useMLXThermalEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<MLXThermalEvent>('mlx.thermal', enabled);

	const criticalEvents = events.filter((e) => e.severity === 'critical');
	const warningEvents = events.filter((e) => e.severity === 'warning');

	return {
		events,
		latestEvent,
		criticalEvents,
		warningEvents,
		clearEvents,
		hasCritical: criticalEvents.length > 0,
		hasWarnings: warningEvents.length > 0,
	};
}

export function useMLXModelEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<MLXModelEvent>('mlx.model', enabled);

	const loadedModels = events.filter((e) => e.data.eventType === 'loaded');
	const failedModels = events.filter((e) => e.data.eventType === 'error');

	return {
		events,
		latestEvent,
		loadedModels,
		failedModels,
		clearEvents,
		currentModel: loadedModels[loadedModels.length - 1]?.data.modelName,
	};
}

export function useMLXEmbeddingEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<MLXEmbeddingEvent>(
		'mlx.embedding',
		enabled,
	);

	const successfulEmbeddings = events.filter((e) => e.data.success);
	const failedEmbeddings = events.filter((e) => !e.data.success);

	const totalProcessingTime = successfulEmbeddings.reduce(
		(sum, e) => sum + e.data.processingTime,
		0,
	);
	const totalTextsProcessed = successfulEmbeddings.reduce((sum, e) => sum + e.data.textCount, 0);

	return {
		events,
		latestEvent,
		successfulEmbeddings,
		failedEmbeddings,
		clearEvents,
		totalProcessingTime,
		totalTextsProcessed,
		averageProcessingTime: totalTextsProcessed > 0 ? totalProcessingTime / totalTextsProcessed : 0,
	};
}

export function useWebUIUserEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<WebUIUserEvent>(
		'webui.user.event',
		enabled,
	);

	const connections = events.filter((e) => e.data.eventType === 'user_connected');
	const disconnections = events.filter((e) => e.data.eventType === 'user_disconnected');
	const messages = events.filter((e) => e.data.eventType === 'user_message');

	return {
		events,
		latestEvent,
		connections,
		disconnections,
		messages,
		clearEvents,
		activeUsers: connections.length - disconnections.length,
	};
}

export function useWebUISystemEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<WebUISystemEvent>(
		'webui.system.event',
		enabled,
	);

	const errors = events.filter((e) => e.data.eventType === 'error_notification');
	const statusUpdates = events.filter((e) => e.data.eventType === 'system_status');
	const modelUpdates = events.filter((e) => e.data.eventType === 'model_update');

	return {
		events,
		latestEvent,
		errors,
		statusUpdates,
		modelUpdates,
		clearEvents,
		hasErrors: errors.length > 0,
		latestStatus: statusUpdates[statusUpdates.length - 1]?.data.status,
	};
}

export function useWebUIAgentEvents(enabled: boolean = true) {
	const { events, latestEvent, clearEvents } = useA2AEvent<WebUIAgentEvent>(
		'webui.agent.event',
		enabled,
	);

	const responses = events.filter((e) => e.data.eventType === 'agent_response');
	const thinkingEvents = events.filter((e) => e.data.eventType === 'agent_thinking');
	const errors = events.filter((e) => e.data.eventType === 'agent_error');

	return {
		events,
		latestEvent,
		responses,
		thinkingEvents,
		errors,
		clearEvents,
		isThinking: thinkingEvents.some((e) => e.data.thinking),
		hasErrors: errors.length > 0,
	};
}

// ================================
// Event History Hook
// ================================

export function useA2AEventHistory() {
	const [history, setHistory] = useState<A2AEvent[]>([]);

	useEffect(() => {
		// Subscribe to all events to maintain history
		const unsubscribe = a2aWebSocketManager.onA2AEvent('*', () => {
			setHistory(a2aWebSocketManager.getEventHistory());
		});

		// Initial load
		setHistory(a2aWebSocketManager.getEventHistory());

		return unsubscribe;
	}, []);

	const getEventsByType = useCallback((eventType: string) => {
		return a2aWebSocketManager.getEventsByType(eventType);
	}, []);

	const getRecentEvents = useCallback((limit: number = 50) => {
		return a2aWebSocketManager.getRecentEvents(limit);
	}, []);

	const clearHistory = useCallback(() => {
		a2aWebSocketManager.clearEventHistory();
		setHistory([]);
	}, []);

	return {
		history,
		getEventsByType,
		getRecentEvents,
		clearHistory,
		eventCount: history.length,
		eventTypes: Array.from(new Set(history.map((e) => e.type))),
	};
}

// ================================
// Event Publishing Hook
// ================================

export function useA2AEventPublisher() {
	const publishUserEvent = useCallback((data: Omit<WebUIUserEvent, 'sessionId' | 'timestamp'>) => {
		a2aWebSocketManager.publishUserEvent({
			...data,
			sessionId: a2aWebSocketManager.getSessionId(),
			timestamp: new Date().toISOString(),
		});
	}, []);

	const publishSystemEvent = useCallback(
		(data: Omit<WebUISystemEvent, 'sessionId' | 'timestamp'>) => {
			a2aWebSocketManager.publishSystemEvent({
				...data,
				sessionId: a2aWebSocketManager.getSessionId(),
				timestamp: new Date().toISOString(),
			});
		},
		[],
	);

	const publishAgentEvent = useCallback(
		(data: Omit<WebUIAgentEvent, 'sessionId' | 'timestamp'>) => {
			a2aWebSocketManager.publishAgentEvent({
				...data,
				sessionId: a2aWebSocketManager.getSessionId(),
				timestamp: new Date().toISOString(),
			});
		},
		[],
	);

	return {
		publishUserEvent,
		publishSystemEvent,
		publishAgentEvent,
		sessionId: a2aWebSocketManager.getSessionId(),
	};
}

// ================================
// Real-time Notification Hook
// ================================

export function useA2ANotifications() {
	const [notifications, setNotifications] = useState<A2AEvent[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);

	useEffect(() => {
		const unsubscribe = a2aWebSocketManager.onA2AEvent('*', (event) => {
			// Add notifications for important events
			if (event.severity === 'critical' || event.severity === 'error') {
				setNotifications((prev) => [...prev, event]);
				setUnreadCount((prev) => prev + 1);
			}
		});

		return unsubscribe;
	}, []);

	const markAsRead = useCallback((eventId: string) => {
		setNotifications((prev) => prev.filter((n) => n.id !== eventId));
		setUnreadCount((prev) => Math.max(0, prev - 1));
	}, []);

	const markAllAsRead = useCallback(() => {
		setNotifications([]);
		setUnreadCount(0);
	}, []);

	return {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		hasUnread: unreadCount > 0,
	};
}

// ================================
// Performance Monitoring Hook
// ================================

export function useA2APerformanceMonitor() {
	const [metrics, setMetrics] = useState({
		eventRate: 0,
		averageLatency: 0,
		connectionUptime: 0,
		totalEvents: 0,
	});

	useEffect(() => {
		const startTime = Date.now();
		let eventCount = 0;
		const latencies: number[] = [];

		const unsubscribe = a2aWebSocketManager.onA2AEvent('*', (event) => {
			eventCount++;

			// Calculate latency if timestamp is available
			if (event.timestamp) {
				const eventTime = new Date(event.timestamp).getTime();
				const latency = Date.now() - eventTime;
				latencies.push(latency);
			}

			const uptime = Date.now() - startTime;
			const eventRate = eventCount / (uptime / 1000);
			const averageLatency =
				latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;

			setMetrics({
				eventRate,
				averageLatency,
				connectionUptime: uptime,
				totalEvents: eventCount,
			});
		});

		return unsubscribe;
	}, []);

	return metrics;
}
