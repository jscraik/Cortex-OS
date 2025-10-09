// Browser Executor exports
export { BrowserExecutor } from './browser-executor.js';
export type {
	BrowserExecutorConfig,
	BrowserHealthStatus,
	BrowserTelemetryEvent,
	DOMExtractionRequest,
	DOMExtractionResult,
} from './browser-types.js';

// Database Executor exports
export { DatabaseExecutor } from './database-executor.js';
export type {
	DatabaseExecutorConfig,
	DatabaseHealthStatus,
	DatabaseTelemetryEvent,
	PoolStatus,
	QueryRequest,
	QueryResult,
	TransactionResult,
} from './database-types.js';
export type {
	CircuitBreakerOptions,
	RateLimitOptions,
	RetryOptions,
	StdioHttpBridgeOptions,
} from './stdio-http.js';
export { StdioHttpBridge } from './stdio-http.js';

// Runtime helpers
export {
	resolveTransport,
	type TransportSelection,
	type TransportWarning,
} from './runtime/transport.js';
export {
	initializeMetrics,
	recordAuthOutcome,
	observeHybridSearch,
	getMetricsRegistry,
	setPiecesProxyStatus,
} from './runtime/telemetry/metrics.js';
export {
	startMetricsServer,
	type MetricsServerHandle,
	type MetricsServerOptions,
} from './runtime/telemetry/metrics-server.js';
export {
	initializeTracing,
	shutdownTracing,
	withSpan,
} from './runtime/telemetry/tracing.js';
export {
	RemoteToolProxy,
	type RemoteTool,
	type RemoteToolProxyOptions,
} from './runtime/remote-proxy.js';
