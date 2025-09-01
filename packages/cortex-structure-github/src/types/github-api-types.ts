/**
 * TypeScript interfaces for GitHub API responses and structure analysis
 * Provides type safety for repository structure operations
 */

export interface GitHubApiRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubApiUser;
  clone_url: string;
  default_branch: string;
  html_url: string;
  language: string | null;
  topics: string[];
  size: number;
}

export interface GitHubApiUser {
  login: string;
  id: number;
  type: 'User' | 'Organization';
  html_url: string;
}

export interface GitHubApiComment {
  id: number;
  body: string;
  user: GitHubApiUser;
  created_at: string;
  updated_at: string;
}

/**
 * Repository structure analysis result types
 */
export interface RepositoryStructureAnalysis {
  type: 'frontend' | 'backend' | 'fullstack' | 'unknown';
  framework: DetectedFramework[];
  structure: ProjectStructure;
  recommendations: string[];
  issues: StructureIssue[];
}

export interface DetectedFramework {
  name: string;
  version: string | null;
  confidence: number;
  files: string[];
}

export interface ProjectStructure {
  directories: DirectoryInfo[];
  files: FileInfo[];
  patterns: StructurePattern[];
}

export interface DirectoryInfo {
  path: string;
  purpose: string;
  fileCount: number;
  subdirectories: string[];
}

export interface FileInfo {
  path: string;
  type: string;
  size: number;
  purpose: string;
}

export interface StructurePattern {
  name: string;
  description: string;
  compliance: number;
  suggestions: string[];
}

export interface StructureIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  file?: string;
  suggestion: string;
}

/**
 * Command processing types
 */
export interface StructureCommand {
  type: 'analyze' | 'scaffold' | 'optimize';
  target: 'frontend' | 'backend' | 'both';
  options: StructureCommandOptions;
}

export interface StructureCommandOptions {
  framework?: string;
  template?: string;
  features?: string[];
  strict?: boolean;
}

/**
 * Progress tracking types
 */
export interface ProgressState {
  taskId: string;
  commentId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: ProgressStep[];
  startTime: Date;
  endTime?: Date;
}

export interface ProgressStep {
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Security validation types
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}
