// A2A Events - Main Export
export const A2A_EVENTS_VERSION = '1.0.0';

// GitHub Events
export * from './github';

// Re-export key types for convenience
export type {
  // GitHub specific
  RepositoryEvent,
  PullRequestEvent,
  IssueEvent,
  WorkflowEvent,
  ErrorEvent,
  GitHubEvent,
  
  // A2A Infrastructure
  A2AEventEnvelope,
  GitHubEventData,
  EventPriority,
  DeliveryMode,
  RetryPolicy,
  CorrelationInfo,
  RoutingInfo,
  EnvelopeMetadata,
  
  // Routing
  RoutingRule,
  RoutingConfiguration,
  RouteMatch,
  
  // Analytics
  GitHubEventStats,
  GitHubEventFilter,
} from './github';

// Re-export key functions
export {
  // Event validation
  isGitHubEvent,
  validateGitHubEvent,
  getGitHubEventType,
  
  // Envelope operations  
  isA2AEventEnvelope,
  validateA2AEventEnvelope,
  createA2AEventEnvelope,
  
  // Analytics
  analyzeGitHubEvents,
  filterGitHubEvents,
  
  // Batch processing
  createGitHubEventBatch,
  processEventStream,
  
  // Routing
  GitHubEventRouter,
  createRoutingRule,
  validateRoutingConfiguration,
  isValidRoutingConfiguration,
  DEFAULT_GITHUB_ROUTING_CONFIG,
} from './github';