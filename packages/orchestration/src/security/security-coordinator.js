export class SecurityCoordinator {
	review(input) {
		const security = input.request.planningResult?.security;
		if (!security) {
			return { telemetry: [], statePatch: {} };
		}
		const severity = this.classifyRisk(security.aggregateRisk);
		const telemetry = [
			{
				branding: 'brAInwav',
				timestamp: input.timestamp,
				message: `Security posture ${severity} for task ${input.request.task.id}`,
				metadata: {
					risk: security.aggregateRisk,
					summary: security.summary,
					standards: security.standards,
					firstAction: security.playbook[0]?.action,
					confidence: input.confidence,
				},
			},
		];
		if (security.playbook.length > 0) {
			telemetry.push({
				branding: 'brAInwav',
				timestamp: input.timestamp,
				message: `Security playbook queued: ${security.playbook[0].action}`,
				metadata: {
					action: security.playbook[0],
					totalActions: security.playbook.length,
				},
			});
		}
		const statePatch = {
			security: {
				risk: security.aggregateRisk,
				summary: security.summary,
				standards: security.standards,
				playbook: security.playbook,
				lastCheckedAt: security.lastCheckedAt,
			},
		};
		return { telemetry, statePatch };
	}
	classifyRisk(risk) {
		if (risk >= 0.7) {
			return 'critical';
		}
		if (risk >= 0.4) {
			return 'elevated';
		}
		return 'nominal';
	}
}
//# sourceMappingURL=security-coordinator.js.map
