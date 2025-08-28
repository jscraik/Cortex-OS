/**
 * TypeScript types generated from devops.plan.schema.json
 * @fileoverview DevOps Planning Configuration Types
 */

export interface DevOpsPlan {
  id: string;
  version: string;
  name: string;
  description?: string;
  metadata?: PlanMetadata;
  environments: Record<string, Environment>;
  stages: Stage[];
  deploymentStrategy: DeploymentStrategy;
  dependencies?: Dependencies;
  notifications?: Notifications;
  monitoring?: Monitoring;
  rollback?: Rollback;
  security?: Security;
}

export interface PlanMetadata {
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  team?: string;
  tags?: string[];
}

export interface Environment {
  name: string;
  type: 'development' | 'staging' | 'production' | 'test' | 'qa' | 'demo';
  region?: string;
  provider?: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker' | 'bare-metal';
  configuration?: Record<string, string | number | boolean>;
  secrets?: string[];
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
}

export interface Stage {
  name: string;
  environment: string;
  dependsOn?: string[];
  condition?: string;
  steps: Step[];
  parallel?: boolean;
  timeout?: number;
  retries?: number;
}

export interface Step {
  name: string;
  type:
    | 'build'
    | 'test'
    | 'deploy'
    | 'validate'
    | 'security-scan'
    | 'approval'
    | 'notification'
    | 'script';
  command?: string;
  script?: string;
  image?: string;
  env?: Record<string, string>;
  timeout?: number;
  continueOnError?: boolean;
  artifacts?: string[];
}

export interface DeploymentStrategy {
  type: 'rolling' | 'blue-green' | 'canary' | 'recreate' | 'a-b-testing';
  rollingUpdate?: RollingUpdateStrategy;
  blueGreen?: BlueGreenStrategy;
  canary?: CanaryStrategy;
  abTesting?: ABTestingStrategy;
}

export interface RollingUpdateStrategy {
  maxUnavailable?: number | string;
  maxSurge?: number | string;
}

export interface BlueGreenStrategy {
  autoPromote?: boolean;
  scaleDownDelay?: number;
  prePromotionAnalysis?: AnalysisTemplate;
  postPromotionAnalysis?: AnalysisTemplate;
}

export interface CanaryStrategy {
  steps: CanaryStep[];
  analysis?: AnalysisTemplate;
  trafficSplitting?: {
    method?: 'header' | 'cookie' | 'weight';
    headerName?: string;
    headerValue?: string;
  };
}

export interface ABTestingStrategy {
  httpHeaderMatches?: Array<{
    headerName: string;
    headerValue: string;
  }>;
  match?: Array<{
    headers?: Record<string, string>;
  }>;
}

export interface CanaryStep {
  setWeight?: number;
  pause?: {
    duration?: string;
  };
  analysis?: AnalysisTemplate;
}

export interface AnalysisTemplate {
  templates?: Array<{
    templateName: string;
    clusterScope?: boolean;
  }>;
  args?: Array<{
    name: string;
    value: string;
  }>;
}

export interface Dependencies {
  services?: ServiceDependency[];
  infrastructure?: InfrastructureDependency[];
}

export interface ServiceDependency {
  name: string;
  type: 'database' | 'cache' | 'queue' | 'storage' | 'api' | 'monitoring';
  version?: string;
  endpoint?: string;
  required?: boolean;
  healthCheck?: HealthCheck;
}

export interface InfrastructureDependency {
  name: string;
  type: 'cluster' | 'network' | 'load-balancer' | 'cdn' | 'dns' | 'certificate';
  provider?: string;
  region?: string;
  required?: boolean;
}

export interface Notifications {
  channels?: NotificationChannel[];
  events?: Array<
    | 'deployment-start'
    | 'deployment-success'
    | 'deployment-failure'
    | 'rollback-start'
    | 'rollback-complete'
    | 'health-check-failure'
  >;
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'webhook' | 'teams' | 'discord';
  target: string;
  events?: string[];
}

export interface Monitoring {
  healthChecks?: HealthCheck[];
  metrics?: Metric[];
  alerts?: Alert[];
}

export interface HealthCheck {
  type: 'http' | 'tcp' | 'grpc' | 'exec';
  endpoint: string;
  interval?: string;
  timeout?: string;
  retries?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  source: 'prometheus' | 'datadog' | 'newrelic' | 'cloudwatch' | 'custom';
  query?: string;
  labels?: Record<string, string>;
}

export interface Alert {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  threshold?: number;
  duration?: string;
  channels?: string[];
}

export interface Rollback {
  strategy: 'automatic' | 'manual' | 'conditional';
  triggers?: Array<'health-check-failure' | 'error-rate-threshold' | 'manual-trigger' | 'timeout'>;
  timeout?: number;
}

export interface Security {
  scanners?: Array<'sast' | 'dast' | 'dependency-scan' | 'container-scan' | 'iac-scan'>;
  approvals?: {
    required: boolean;
    approvers?: string[];
    environments?: string[];
  };
  compliance?: {
    frameworks?: Array<'SOC2' | 'ISO27001' | 'PCI-DSS' | 'GDPR' | 'HIPAA' | 'FedRAMP'>;
    auditLog?: boolean;
  };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * Schema validation configuration
 */
export interface ValidationConfig {
  strict?: boolean;
  allowUnknownFormats?: boolean;
  removeAdditional?: boolean | 'all' | 'failing';
  useDefaults?: boolean;
  coerceTypes?: boolean | 'array';
}
