/**
 * @file observability/otel.ts
 * @description OpenTelemetry integration for Cortex Kernel
 * @author Cortex-OS Team
 * @version 1.0.0
 */

// Simple OTEL mock implementation for testing
let spans: any[] = [];
let metrics: any[] = [];

export const startSpan = (name: string) => {
	const span = {
		name,
		status: 'OK',
		attributes: {} as Record<string, any>,
		end: function () {
			spans.push(this);
		},
		setStatus: function (status: string) {
			this.status = status;
			return this;
		},
		setAttribute: function (key: string, value: any) {
			this.attributes[key] = value;
			return this;
		},
	};

	return span;
};

export const recordMetric = (
	name: string,
	value: number,
	unit: string = '',
) => {
	metrics.push({ name, value, unit });
};

// For testing purposes
export const getSpans = () => spans;
export const getMetrics = () => metrics;
export const resetTelemetry = () => {
	spans = [];
	metrics = [];
};
