import { z } from 'zod';

// Authentication configuration schema
export const AUTH_SCHEMA = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('token'),
    token: z.string().min(1, 'GitHub token is required'),
  }),
  z.object({
    method: z.literal('app'),
    appId: z.string().min(1, 'GitHub App ID is required'),
    privateKey: z.string().min(1, 'GitHub App private key is required'),
    installationId: z.string().min(1, 'GitHub App installation ID is required'),
  }),
  z.object({
    method: z.literal('oauth'),
    clientId: z.string().min(1, 'OAuth client ID is required'),
    clientSecret: z.string().min(1, 'OAuth client secret is required'),
    accessToken: z.string().min(1, 'OAuth access token is required'),
    refreshToken: z.string().optional(),
  }),
]);

// Server configuration schema
export const SERVER_SCHEMA = z.object({
  name: z.string().default('cortex-github'),
  version: z.string().default('1.0.0'),
  description: z.string().default('GitHub MCP Server for Cortex-OS'),
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().default('localhost'),
});

// A2A event bus configuration schema
export const A2A_SCHEMA = z.object({
  enabled: z.boolean().default(true),
  eventBusUrl: z.string().url().optional(),
  publisherId: z.string().default('github-mcp-server'),
  subscriberTopics: z.array(z.string()).default([
    'github.repository',
    'github.pullrequest',
    'github.issue',
    'github.workflow',
  ]),
  publisherTopics: z.array(z.string()).default([
    'github.repository.created',
    'github.repository.updated',
    'github.pullrequest.opened',
    'github.pullrequest.closed',
    'github.pullrequest.merged',
    'github.issue.opened',
    'github.issue.closed',
    'github.workflow.started',
    'github.workflow.completed',
    'github.workflow.failed',
  ]),
});

// Feature configuration schema
export const FEATURES_SCHEMA = z.object({
  realTimeEvents: z.boolean().default(true),
  webhookSupport: z.boolean().default(false),
  rateLimitingEnabled: z.boolean().default(true),
  caching: z.boolean().default(true),
  allowRepositoryCreation: z.boolean().default(false),
  allowRepositoryDeletion: z.boolean().default(false),
  allowForceOperations: z.boolean().default(false),
});

// Rate limiting configuration schema
export const RATE_LIMITS_SCHEMA = z.object({
  requestsPerHour: z.number().int().min(1).default(5000),
  requestsPerMinute: z.number().int().min(1).default(100),
  burstLimit: z.number().int().min(1).default(10),
  backoffMultiplier: z.number().min(1).default(2),
  maxBackoffSeconds: z.number().int().min(1).default(300),
});

// Security configuration schema
export const SECURITY_SCHEMA = z.object({
  webhookSecret: z.string().optional(),
  allowedRepositories: z.array(z.string()).default([]),
  blockedRepositories: z.array(z.string()).default([]),
  allowedOperations: z.array(z.string()).default([
    'repository.read',
    'repository.write',
    'issue.read',
    'issue.write',
    'pullrequest.read',
    'pullrequest.write',
    'workflow.read',
    'workflow.trigger',
  ]),
  sensitiveDataRedaction: z.boolean().default(true),
});

// Logging configuration schema
export const LOGGING_SCHEMA = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  format: z.enum(['json', 'text']).default('json'),
  destinations: z.array(z.enum(['console', 'file'])).default(['console']),
  filePath: z.string().optional(),
  maxFileSize: z.string().default('10MB'),
  maxFiles: z.number().int().min(1).default(5),
});

// Main configuration schema
export const CONFIG_SCHEMA = z.object({
  auth: AUTH_SCHEMA,
  server: SERVER_SCHEMA.default({}),
  defaultRepository: z.string().optional(),
  features: FEATURES_SCHEMA.default({}),
  a2a: A2A_SCHEMA.default({}),
  rateLimits: RATE_LIMITS_SCHEMA.default({}),
  security: SECURITY_SCHEMA.default({}),
  logging: LOGGING_SCHEMA.default({}),
});

// Type exports
export type GitHubAuthConfig = z.infer<typeof AUTH_SCHEMA>;
export type ServerConfig = z.infer<typeof SERVER_SCHEMA>;
export type A2AConfig = z.infer<typeof A2A_SCHEMA>;
export type FeaturesConfig = z.infer<typeof FEATURES_SCHEMA>;
export type RateLimitsConfig = z.infer<typeof RATE_LIMITS_SCHEMA>;
export type SecurityConfig = z.infer<typeof SECURITY_SCHEMA>;
export type LoggingConfig = z.infer<typeof LOGGING_SCHEMA>;
export type GitHubMCPConfig = z.infer<typeof CONFIG_SCHEMA>;

// Configuration validation helpers
export function validateConfig(config: unknown): GitHubMCPConfig {
  return CONFIG_SCHEMA.parse(config);
}

export function validatePartialConfig(config: unknown): Partial<GitHubMCPConfig> {
  return CONFIG_SCHEMA.partial().parse(config);
}

// Environment variable mappings
export const ENV_MAPPINGS = {
  // Authentication
  'GITHUB_TOKEN': 'auth.token',
  'CORTEX_GITHUB_TOKEN': 'auth.token',
  'GITHUB_APP_ID': 'auth.appId',
  'GITHUB_APP_PRIVATE_KEY': 'auth.privateKey',
  'GITHUB_APP_INSTALLATION_ID': 'auth.installationId',
  'CORTEX_GITHUB_AUTH_METHOD': 'auth.method',
  
  // Server
  'CORTEX_GITHUB_MCP_NAME': 'server.name',
  'CORTEX_GITHUB_MCP_VERSION': 'server.version',
  'CORTEX_GITHUB_MCP_PORT': 'server.port',
  'CORTEX_GITHUB_MCP_HOST': 'server.host',
  
  // Repository
  'CORTEX_GITHUB_REPO': 'defaultRepository',
  'CORTEX_GITHUB_DEFAULT_REPO': 'defaultRepository',
  
  // Features
  'CORTEX_GITHUB_REAL_TIME': 'features.realTimeEvents',
  'CORTEX_GITHUB_WEBHOOKS': 'features.webhookSupport',
  'CORTEX_GITHUB_RATE_LIMIT': 'features.rateLimitingEnabled',
  'CORTEX_GITHUB_CACHE': 'features.caching',
  
  // A2A
  'CORTEX_A2A_ENABLED': 'a2a.enabled',
  'CORTEX_A2A_EVENT_BUS_URL': 'a2a.eventBusUrl',
  'CORTEX_A2A_PUBLISHER_ID': 'a2a.publisherId',
  
  // Rate Limits
  'CORTEX_GITHUB_RATE_LIMIT_HOUR': 'rateLimits.requestsPerHour',
  'CORTEX_GITHUB_RATE_LIMIT_MIN': 'rateLimits.requestsPerMinute',
  'CORTEX_GITHUB_RATE_BURST': 'rateLimits.burstLimit',
  
  // Security
  'CORTEX_GITHUB_WEBHOOK_SECRET': 'security.webhookSecret',
  'CORTEX_GITHUB_ALLOWED_REPOS': 'security.allowedRepositories',
  'CORTEX_GITHUB_BLOCKED_REPOS': 'security.blockedRepositories',
  
  // Logging
  'CORTEX_LOG_LEVEL': 'logging.level',
  'CORTEX_LOG_FORMAT': 'logging.format',
  'CORTEX_LOG_FILE': 'logging.filePath',
} as const;

// Default configurations for different environments
export const DEFAULT_CONFIGS = {
  development: {
    logging: {
      level: 'debug' as const,
      format: 'text' as const,
      destinations: ['console' as const],
    },
    features: {
      realTimeEvents: true,
      webhookSupport: false,
      rateLimitingEnabled: false,
      caching: false,
    },
    rateLimits: {
      requestsPerHour: 1000,
      requestsPerMinute: 60,
      burstLimit: 5,
    },
  },
  
  production: {
    logging: {
      level: 'info' as const,
      format: 'json' as const,
      destinations: ['console' as const, 'file' as const],
    },
    features: {
      realTimeEvents: true,
      webhookSupport: true,
      rateLimitingEnabled: true,
      caching: true,
    },
    security: {
      sensitiveDataRedaction: true,
      allowRepositoryCreation: false,
      allowRepositoryDeletion: false,
      allowForceOperations: false,
    },
  },
  
  testing: {
    logging: {
      level: 'error' as const,
      destinations: [],
    },
    features: {
      realTimeEvents: false,
      webhookSupport: false,
      rateLimitingEnabled: false,
      caching: false,
    },
    a2a: {
      enabled: false,
    },
  },
} as const;

// Configuration builder utility
export class ConfigBuilder {
  private config: Partial<GitHubMCPConfig> = {};

  static forEnvironment(env: keyof typeof DEFAULT_CONFIGS): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder.config = { ...DEFAULT_CONFIGS[env] };
    return builder;
  }

  auth(auth: GitHubAuthConfig): ConfigBuilder {
    this.config.auth = auth;
    return this;
  }

  repository(repo: string): ConfigBuilder {
    this.config.defaultRepository = repo;
    return this;
  }

  features(features: Partial<FeaturesConfig>): ConfigBuilder {
    this.config.features = { ...this.config.features, ...features };
    return this;
  }

  a2a(a2a: Partial<A2AConfig>): ConfigBuilder {
    this.config.a2a = { ...this.config.a2a, ...a2a };
    return this;
  }

  security(security: Partial<SecurityConfig>): ConfigBuilder {
    this.config.security = { ...this.config.security, ...security };
    return this;
  }

  build(): GitHubMCPConfig {
    return CONFIG_SCHEMA.parse(this.config);
  }
}

// Validation utilities
export function isValidRepositoryName(repo: string): boolean {
  const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  return repoRegex.test(repo);
}

export function isValidGitHubToken(token: string): boolean {
  // GitHub personal access tokens start with ghp_, gho_, ghu_, ghs_, or ghr_
  const tokenRegex = /^gh[pous]_[A-Za-z0-9_]{36,}$/;
  return tokenRegex.test(token);
}

export function sanitizeConfigForLogging(config: GitHubMCPConfig): any {
  const sanitized = JSON.parse(JSON.stringify(config));
  
  // Redact sensitive information
  if (sanitized.auth?.token) {
    sanitized.auth.token = '***REDACTED***';
  }
  if (sanitized.auth?.privateKey) {
    sanitized.auth.privateKey = '***REDACTED***';
  }
  if (sanitized.auth?.clientSecret) {
    sanitized.auth.clientSecret = '***REDACTED***';
  }
  if (sanitized.security?.webhookSecret) {
    sanitized.security.webhookSecret = '***REDACTED***';
  }
  
  return sanitized;
}