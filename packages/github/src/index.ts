// GitHub Integration Package - Main exports

// Core functionality (Rust-based, exposed via FFI when needed)
// export * from './client/index';
// export * from './types/index';

// A2A Events
export {
	createGitHubEvent,
	type IssueEvent,
	type PullRequestEvent,
	type RepositoryConnectedEvent,
	type WorkflowEvent,
} from './events/github-events.js';
// MCP Integration
export { githubMcpTools } from './mcp/tools.js';
