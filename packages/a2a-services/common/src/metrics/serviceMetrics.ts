// Metrics for service middleware (quota, rate limiting etc.)
export interface ServiceMetricsSnapshot {
	quotaGlobalReject: number;
	quotaAgentReject: number;
}

class ServiceMetricsCollector {
	quotaGlobalReject = 0;
	quotaAgentReject = 0;
	incQuotaGlobal() {
		this.quotaGlobalReject += 1;
	}
	incQuotaAgent() {
		this.quotaAgentReject += 1;
	}
	snapshot(): ServiceMetricsSnapshot {
		return {
			quotaGlobalReject: this.quotaGlobalReject,
			quotaAgentReject: this.quotaAgentReject,
		};
	}
}

let svcMetricsInstance: ServiceMetricsCollector | undefined;
export function serviceMetrics(): ServiceMetricsCollector {
	if (!svcMetricsInstance) svcMetricsInstance = new ServiceMetricsCollector();
	return svcMetricsInstance;
}
