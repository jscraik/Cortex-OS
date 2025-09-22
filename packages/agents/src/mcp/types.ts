export interface MCPEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
}

export interface MCPToolMetadata {
  correlationId: string;
  timestamp: string;
  tool: string;
  duration?: number;
}

export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: MCPToolMetadata;
}

export interface SearchStartedEvent {
  executionId: string;
  toolName: string;
  toolType: 'search' | 'codemod' | 'validation' | 'multi-search';
  parameters: Record<string, unknown>;
  initiatedBy: string;
  startedAt: string;
}

export interface SearchResultsEvent {
  executionId: string;
  query: string;
  searchType: 'ripgrep' | 'semgrep' | 'ast-grep' | 'multi';
  resultsCount: number;
  paths: string[];
  duration: number;
  foundAt: string;
}

export interface CodeModificationEvent {
  executionId: string;
  modificationType: 'transform' | 'rename' | 'format' | 'other';
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  modifiedAt: string;
}

export interface ValidationReportEvent {
  executionId: string;
  validationType: 'syntax' | 'lint' | 'typecheck' | 'security' | 'format';
  status: 'passed' | 'warning' | 'failed';
  issuesFound: number;
  filesValidated: string[];
  reportedAt: string;
}

export interface BatchCompletedEvent {
  batchId: string;
  operationType: 'search' | 'validation' | 'codemod';
  totalOperations: number;
  successfulOperations: number;
  completedAt: string;
}

export interface BatchFailedEvent {
  batchId: string;
  operationType: 'search' | 'validation' | 'codemod';
  error: string;
  failedAt: string;
}

export const createTypedEvent = {
  executionStarted: (data: SearchStartedEvent): MCPEvent<SearchStartedEvent> => ({
    type: 'agent_toolkit.execution.started',
    data,
    timestamp: new Date(),
  }),
  searchResults: (data: SearchResultsEvent): MCPEvent<SearchResultsEvent> => ({
    type: 'agent_toolkit.search.results',
    data,
    timestamp: new Date(),
  }),
  codeModification: (data: CodeModificationEvent): MCPEvent<CodeModificationEvent> => ({
    type: 'agent_toolkit.code.modified',
    data,
    timestamp: new Date(),
  }),
  validationReport: (data: ValidationReportEvent): MCPEvent<ValidationReportEvent> => ({
    type: 'agent_toolkit.validation.report',
    data,
    timestamp: new Date(),
  }),
  batchCompleted: (data: BatchCompletedEvent): MCPEvent<BatchCompletedEvent> => ({
    type: 'agent_toolkit.batch.completed',
    data,
    timestamp: new Date(),
  }),
  batchFailed: (data: BatchFailedEvent): MCPEvent<BatchFailedEvent> => ({
    type: 'agent_toolkit.batch.failed',
    data,
    timestamp: new Date(),
  }),
};
