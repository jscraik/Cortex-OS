/**
 * @file_path packages/orchestration-analytics/src/performance-dashboard.ts
 * @description Performance dashboard data aggregation and visualization helpers
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import type { AgentStatus, Alert, DashboardData, InteractionNode } from './types.js';

/**
 * Performance dashboard utilities and data aggregation
 */
export class PerformanceDashboard {
	/**
	 * Generate interaction nodes for network visualization
	 */
	generateInteractionGraph(agentStatuses: AgentStatus[]): InteractionNode[] {
		return agentStatuses.map((agent, index) => ({
			id: agent.agentId,
			type: 'agent' as const,
			framework: agent.framework,
			position: {
				x: (index % 5) * 150,
				y: Math.floor(index / 5) * 100,
			},
			size: agent.workload * 50 + 20,
			color: this.getAgentColor(agent.status),
			connections: [],
			metrics: {
				activity: agent.workload,
				load: agent.workload,
				health: agent.healthScore,
			},
		}));
	}

	/**
	 * Get agent color based on status
	 */
	private getAgentColor(status: AgentStatus['status']): string {
		const colors = {
			active: '#4CAF50',
			idle: '#FFC107',
			busy: '#FF9800',
			error: '#F44336',
			offline: '#9E9E9E',
		};
		return colors[status] || '#9E9E9E';
	}

	/**
	 * Generate alerts based on thresholds
	 */
	generateAlerts(data: DashboardData): Alert[] {
		const alerts: Alert[] = [];

		// System load alert
		if (data.overview.systemLoad > 0.9) {
			alerts.push({
				id: `high-load-${Date.now()}`,
				type: 'performance',
				severity: 'critical',
				title: 'High System Load',
				description: `System load is at ${(data.overview.systemLoad * 100).toFixed(1)}%`,
				source: 'system-monitor',
				timestamp: new Date(),
				acknowledged: false,
				actions: ['Scale up agents', 'Investigate bottlenecks'],
			});
		}

		return alerts;
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
