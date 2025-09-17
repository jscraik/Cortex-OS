/**
 * A2A Event Dashboard Component
 *
 * Real-time dashboard for displaying A2A events in the Cortex WebUI
 */

import type React from 'react';
import { useState } from 'react';
import {
	useA2AConnection,
	useA2AEventHistory,
	useA2ANotifications,
	useMLXEmbeddingEvents,
	useMLXModelEvents,
	useMLXThermalEvents,
	useWebUISystemEvents,
} from '../../hooks/useA2AEvents';

// Types for A2A events
interface ConnectionStats {
	sessionId?: string;
	eventTypes?: string[];
	eventCount?: number;
}

interface Notification {
	id: string;
	type: string;
	timestamp: string;
	severity: 'info' | 'warning' | 'critical';
}

interface A2AEventDashboardProps {
	token?: string;
	className?: string;
}

export const A2AEventDashboard: React.FC<A2AEventDashboardProps> = ({
	token,
	className = '',
}) => {
	const [activeTab, setActiveTab] = useState('overview');
	const { connected, connectionStats } = useA2AConnection(token);
	const { notifications, unreadCount, markAllAsRead } = useA2ANotifications();

	if (!token) {
		return (
			<div className={`p-4 ${className}`}>
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<p className="text-yellow-800">Please log in to view A2A events</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`bg-white rounded-lg shadow-lg ${className}`}>
			{/* Header */}
			<div className="border-b border-gray-200 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<h2 className="text-xl font-semibold text-gray-900">
							A2A Event Dashboard
						</h2>
						<div
							className={`px-2 py-1 rounded-full text-xs font-medium ${
								connected
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'
							}`}
						>
							{connected ? 'Connected' : 'Disconnected'}
						</div>
					</div>

					{unreadCount > 0 && (
						<button
							type="button"
							onClick={markAllAsRead}
							className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
						>
							Clear {unreadCount} notifications
						</button>
					)}
				</div>

				{/* Tab Navigation */}
				<div className="mt-4">
					<nav className="flex space-x-4">
						{[
							{ id: 'overview', label: 'Overview' },
							{ id: 'mlx', label: 'MLX Events' },
							{ id: 'system', label: 'System Events' },
							{ id: 'history', label: 'Event History' },
						].map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`px-3 py-2 text-sm font-medium rounded-md ${
									activeTab === tab.id
										? 'bg-blue-100 text-blue-700'
										: 'text-gray-500 hover:text-gray-700'
								}`}
							>
								{tab.label}
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{activeTab === 'overview' && (
					<OverviewTab
						connected={connected}
						connectionStats={connectionStats}
						notifications={notifications}
					/>
				)}
				{activeTab === 'mlx' && <MLXEventsTab />}
				{activeTab === 'system' && <SystemEventsTab />}
				{activeTab === 'history' && <EventHistoryTab />}
			</div>
		</div>
	);
};

// ================================
// Overview Tab Component
// ================================

const OverviewTab: React.FC<{
	connected: boolean;
	connectionStats: ConnectionStats;
	notifications: Notification[];
}> = ({ connected, connectionStats, notifications }) => {
	return (
		<div className="space-y-6">
			{/* Connection Status */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-gray-50 rounded-lg p-4">
					<h3 className="text-sm font-medium text-gray-500 mb-2">
						Connection Status
					</h3>
					<div
						className={`text-lg font-semibold ${
							connected ? 'text-green-600' : 'text-red-600'
						}`}
					>
						{connected ? 'Connected' : 'Disconnected'}
					</div>
					<p className="text-xs text-gray-500 mt-1">
						Session:{' '}
						{connectionStats.sessionId
							? `${connectionStats.sessionId.substring(0, 8)}...`
							: 'N/A'}
					</p>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<h3 className="text-sm font-medium text-gray-500 mb-2">
						Event Types
					</h3>
					<div className="text-lg font-semibold text-blue-600">
						{connectionStats.eventTypes ? connectionStats.eventTypes.length : 0}
					</div>
					<p className="text-xs text-gray-500 mt-1">Unique event types</p>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<h3 className="text-sm font-medium text-gray-500 mb-2">
						Total Events
					</h3>
					<div className="text-lg font-semibold text-purple-600">
						{connectionStats.eventCount ?? 0}
					</div>
					<p className="text-xs text-gray-500 mt-1">Events received</p>
				</div>
			</div>

			{/* Recent Notifications */}
			{notifications.length > 0 && (
				<div>
					<h3 className="text-lg font-medium text-gray-900 mb-3">
						Recent Notifications
					</h3>
					<div className="space-y-2">
						{notifications.slice(0, 5).map((notification) => (
							<div
								key={notification.id}
								className={`p-3 rounded-lg border-l-4 ${
									notification.severity === 'critical'
										? 'bg-red-50 border-red-400'
										: 'bg-yellow-50 border-yellow-400'
								}`}
							>
								<div className="flex justify-between">
									<div>
										<p className="text-sm font-medium text-gray-900">
											{notification.type}
										</p>
										<p className="text-xs text-gray-500">
											{new Date(notification.timestamp).toLocaleTimeString()}
										</p>
									</div>
									<span
										className={`px-2 py-1 rounded text-xs font-medium ${
											notification.severity === 'critical'
												? 'bg-red-100 text-red-800'
												: 'bg-yellow-100 text-yellow-800'
										}`}
									>
										{notification.severity}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

// ================================
// MLX Events Tab Component
// ================================

const MLXEventsTab: React.FC = () => {
	const thermalEvents = useMLXThermalEvents();
	const modelEvents = useMLXModelEvents();
	const embeddingEvents = useMLXEmbeddingEvents();

	return (
		<div className="space-y-6">
			{/* Thermal Events */}
			<div>
				<h3 className="text-lg font-medium text-gray-900 mb-3">
					Thermal Events
					{thermalEvents.hasCritical && (
						<span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
							Critical
						</span>
					)}
				</h3>

				{thermalEvents.events.length === 0 ? (
					<p className="text-gray-500 text-sm">No thermal events</p>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{thermalEvents.events.slice(-4).map((event) => (
							<div
								key={event.id}
								className={`p-4 rounded-lg border ${
									event.severity === 'critical'
										? 'border-red-200 bg-red-50'
										: 'border-yellow-200 bg-yellow-50'
								}`}
							>
								<div className="flex justify-between items-start">
									<div>
										<p className="font-medium">Device: {event.data.deviceId}</p>
										<p className="text-sm text-gray-600">
											{event.data.temperature}°C / {event.data.threshold}°C
										</p>
										<p className="text-xs text-gray-500 mt-1">
											{new Date(event.timestamp).toLocaleString()}
										</p>
									</div>
									<span
										className={`px-2 py-1 rounded text-xs font-medium ${
											event.severity === 'critical'
												? 'bg-red-100 text-red-800'
												: 'bg-yellow-100 text-yellow-800'
										}`}
									>
										{event.data.status}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Model Events */}
			<div>
				<h3 className="text-lg font-medium text-gray-900 mb-3">
					Model Events
					{modelEvents.currentModel && (
						<span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
							{modelEvents.currentModel}
						</span>
					)}
				</h3>

				{modelEvents.events.length === 0 ? (
					<p className="text-gray-500 text-sm">No model events</p>
				) : (
					<div className="space-y-2">
						{modelEvents.events.slice(-5).map((event) => (
							<div
								key={event.id}
								className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
							>
								<div>
									<span className="font-medium">{event.data.modelName}</span>
									<span
										className={`ml-2 px-2 py-1 rounded text-xs ${
											event.data.eventType === 'loaded'
												? 'bg-green-100 text-green-800'
												: event.data.eventType === 'error'
													? 'bg-red-100 text-red-800'
													: 'bg-gray-100 text-gray-800'
										}`}
									>
										{event.data.eventType}
									</span>
								</div>
								<span className="text-xs text-gray-500">
									{new Date(event.timestamp).toLocaleTimeString()}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Embedding Events */}
			<div>
				<h3 className="text-lg font-medium text-gray-900 mb-3">
					Embedding Events
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
					<div className="bg-blue-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-blue-800 mb-1">
							Total Processed
						</h4>
						<div className="text-lg font-semibold text-blue-600">
							{embeddingEvents.totalTextsProcessed}
						</div>
					</div>
					<div className="bg-green-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-green-800 mb-1">
							Success Rate
						</h4>
						<div className="text-lg font-semibold text-green-600">
							{embeddingEvents.events.length > 0
								? Math.round(
										(embeddingEvents.successfulEmbeddings.length /
											embeddingEvents.events.length) *
											100,
									)
								: 0}
							%
						</div>
					</div>
					<div className="bg-purple-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-purple-800 mb-1">
							Avg Time
						</h4>
						<div className="text-lg font-semibold text-purple-600">
							{embeddingEvents.averageProcessingTime.toFixed(2)}s
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// ================================
// System Events Tab Component
// ================================

const SystemEventsTab: React.FC = () => {
	const systemEvents = useWebUISystemEvents();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium text-gray-900 mb-3">
					System Events
					{systemEvents.hasErrors && (
						<span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
							Errors Present
						</span>
					)}
				</h3>

				{systemEvents.events.length === 0 ? (
					<p className="text-gray-500 text-sm">No system events</p>
				) : (
					<div className="space-y-2">
						{systemEvents.events.slice(-10).map((event) => (
							<div
								key={event.id}
								className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
							>
								<div>
									<span className="font-medium">{event.data.eventType}</span>
									{event.data.status && (
										<span className="ml-2 text-sm text-gray-600">
											Status: {event.data.status}
										</span>
									)}
									{event.data.error && (
										<span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
											Error
										</span>
									)}
								</div>
								<span className="text-xs text-gray-500">
									{new Date(event.timestamp).toLocaleTimeString()}
								</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

// ================================
// Event History Tab Component
// ================================

const EventHistoryTab: React.FC = () => {
	const { history, eventTypes, clearHistory } = useA2AEventHistory();
	const [selectedEventType, setSelectedEventType] = useState<string>('all');

	const filteredEvents =
		selectedEventType === 'all'
			? history
			: history.filter((event) => event.type === selectedEventType);

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<label
						htmlFor="event-type-filter"
						className="text-sm font-medium text-gray-700"
					>
						Filter by type:
					</label>
					<select
						id="event-type-filter"
						value={selectedEventType}
						onChange={(e) => setSelectedEventType(e.target.value)}
						className="border border-gray-300 rounded-md px-3 py-1 text-sm"
					>
						<option value="all">All Events ({history.length})</option>
						{eventTypes.map((type) => (
							<option key={type} value={type}>
								{type} ({history.filter((e) => e.type === type).length})
							</option>
						))}
					</select>
				</div>

				<button
					type="button"
					onClick={clearHistory}
					className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
				>
					Clear History
				</button>
			</div>

			{/* Event List */}
			<div className="max-h-96 overflow-y-auto">
				{filteredEvents.length === 0 ? (
					<p className="text-gray-500 text-sm">No events to display</p>
				) : (
					<div className="space-y-2">
						{filteredEvents
							.slice()
							.reverse()
							.map((event) => (
								<div key={event.id} className="p-3 bg-gray-50 rounded-lg">
									<div className="flex justify-between items-start">
										<div className="flex-1">
											<div className="flex items-center space-x-2">
												<span className="font-medium text-sm">
													{event.type}
												</span>
												<span className="text-xs text-gray-500">
													from {event.source}
												</span>
												{event.severity && (
													<span
														className={`px-2 py-1 rounded text-xs ${
															event.severity === 'critical'
																? 'bg-red-100 text-red-800'
																: event.severity === 'error'
																	? 'bg-red-100 text-red-800'
																	: event.severity === 'warning'
																		? 'bg-yellow-100 text-yellow-800'
																		: 'bg-blue-100 text-blue-800'
														}`}
													>
														{event.severity}
													</span>
												)}
											</div>
											<div className="mt-1 text-xs text-gray-600">
												{JSON.stringify(event.data).substring(0, 100)}...
											</div>
										</div>
										<span className="text-xs text-gray-500">
											{new Date(event.timestamp).toLocaleTimeString()}
										</span>
									</div>
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
};

export default A2AEventDashboard;
