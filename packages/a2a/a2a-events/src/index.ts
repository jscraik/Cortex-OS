// A2A Events - Main Export
export const A2A_EVENTS_VERSION = '1.0.0';

// Re-export key types for convenience
export type {
  // A2A Infrastructure
  A2AEventEnvelope,
  CorrelationInfo,
  DeliveryMode,
  EnvelopeMetadata,
  ErrorEvent,
  EventPriority,
  GitHubEvent,
  GitHubEventData,
  GitHubEventFilter,
  // Analytics
  GitHubEventStats,
  IssueEvent,
  PullRequestEvent,
  // GitHub specific
  RepositoryEvent,
  RetryPolicy,
  RouteMatch,
  RoutingConfiguration,
  RoutingInfo,
  // Routing
  RoutingRule,
  WorkflowEvent,
} from './github';
// GitHub Events
export * from './github';

// Re-export key functions
export {
  // Analytics
  analyzeGitHubEvents,
  createA2AEventEnvelope,
  // Batch processing
  createGitHubEventBatch,
  createRoutingRule,
  DEFAULT_GITHUB_ROUTING_CONFIG,
  filterGitHubEvents,
  // Routing
  GitHubEventRouter,
  getGitHubEventType,
  // Envelope operations
  isA2AEventEnvelope,
  // Event validation
  isGitHubEvent,
  isValidRoutingConfiguration,
  processEventStream,
  validateA2AEventEnvelope,
  validateGitHubEvent,
  validateRoutingConfiguration,
} from './github';
