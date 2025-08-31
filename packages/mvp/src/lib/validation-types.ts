import type { PRPState } from '../state.js';

export interface ValidationResult {
  passed: boolean;
  details: Record<string, any>;
}

export interface GateValidator {
  validate(state: PRPState): Promise<ValidationResult>;
}

export interface FrontendValidationResult {
  lighthouse: number;
  axe: number;
  details: Record<string, any>;
}

export interface SecurityVulnerability {
  tool: string;
  severity: string;
  type: string;
  message: string;
  file: string;
  line: number;
  column?: number;
  ruleId?: string;
  code?: string;
  confidence?: string;
  [key: string]: any;
}

export interface SecurityScanResult {
  blockers: number;
  majors: number;
  details: {
    tools: string[];
    vulnerabilities: SecurityVulnerability[];
    [key: string]: any;
  };
}

export interface CompilationResult {
  passed: boolean;
  command: string;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface TestResult {
  passed: boolean;
  testsPassed: number;
  testsFailed: number;
  coverage: number;
}
