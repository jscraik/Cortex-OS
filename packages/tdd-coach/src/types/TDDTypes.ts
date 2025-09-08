import { z } from 'zod';

// Core TDD States
export enum TDDState {
  RED = 'RED',
  GREEN = 'GREEN',
  REFACTOR = 'REFACTOR',
  UNCLEAR = 'UNCLEAR'
}

// Intervention Levels for Progressive Coaching
export enum InterventionLevel {
  SILENT = 'silent',           // Background suggestions, no blocking
  COACHING = 'coaching',       // Visible guidance with educational content
  WARNING = 'warning',         // Clear warnings but allows override  
  BLOCKING = 'blocking'        // Blocks action, requires compliance
}

// Developer Skill Levels for Adaptive Coaching
export enum TDDSkillLevel {
  BEGINNER = 'beginner',       // New to TDD
  INTERMEDIATE = 'intermediate', // Some experience
  ADVANCED = 'advanced',       // Regular practice
  EXPERT = 'expert'            // Advanced practitioner
}

// Development Context for Smart Coaching
export enum DevelopmentPhase {
  EXPLORATION = 'exploration',
  IMPLEMENTATION = 'implementation',
  REFACTORING = 'refactoring',
  HOTFIX = 'hotfix',
  PROTOTYPE = 'prototype'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Schemas for type safety
export const TestResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pass', 'fail', 'skip']),
  duration: z.number(),
  file: z.string(),
  line: z.number().optional(),
  error: z.string().optional(),
  stack: z.string().optional()
});

export const ChangeSetSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    status: z.enum(['added', 'modified', 'deleted']),
    diff: z.string(),
    linesAdded: z.number(),
    linesDeleted: z.number()
  })),
  totalChanges: z.number(),
  timestamp: z.string(),
  author: z.string().optional()
});

export const DevelopmentContextSchema = z.object({
  phase: z.nativeEnum(DevelopmentPhase),
  urgency: z.nativeEnum(UrgencyLevel),
  experience: z.nativeEnum(TDDSkillLevel),
  teamSize: z.number(),
  projectType: z.enum(['greenfield', 'legacy', 'maintenance']),
  deadline: z.string().optional()
});

export const TDDResponseSchema = z.object({
  level: z.nativeEnum(InterventionLevel),
  message: z.string(),
  alternatives: z.array(z.string()),
  reasoning: z.string(),
  learnMore: z.string().optional(),
  overrideOptions: z.array(z.object({
    reason: z.string(),
    consequences: z.string(),
    futureReminder: z.boolean()
  })).optional()
});

// Type exports from schemas
export type TestResult = z.infer<typeof TestResultSchema>;
export type ChangeSet = z.infer<typeof ChangeSetSchema>;
export type DevelopmentContext = z.infer<typeof DevelopmentContextSchema>;
export type TDDResponse = z.infer<typeof TDDResponseSchema>;

// Additional types
export interface TDDStateData {
  current: TDDState;
  failingTests: TestResult[];
  passingTests: TestResult[];
  lastValidatedChange: ChangeSet | null;
  testCoverage: number;
  timestamp: string;
  sessionId: string;
}

export interface DeveloperProfile {
  id: string;
  name: string;
  tddProficiency: number; // 0-100 scale
  preferredStyle: 'strict' | 'flexible' | 'contextual';
  overrideHistory: OverrideEvent[];
  successPatterns: string[];
  strugglingAreas: string[];
  autonomyLevel: number; // 0-100 scale
}

export interface OverrideEvent {
  timestamp: string;
  reason: string;
  context: DevelopmentContext;
  outcome: 'successful' | 'problematic' | 'unknown';
}

export interface CoachingGuidance {
  primary: string;
  alternatives: Array<{
    description: string;
    tradeoffs: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  whyThisMatters: string;
  skipOption?: {
    reason: string;
    consequences: string;
    futureReminder: boolean;
  };
}

export interface ValidationResult {
  approved: boolean;
  reason: string;
  suggestion?: string;
  blockedFiles?: string[];
  coverage?: {
    required: number;
    actual: number;
  };
  overImplementation?: string[];
}

export interface CoachingSession {
  id: string;
  developerId: string;
  situation: string;
  tddState: TDDState;
  guidance: CoachingGuidance;
  resources: {
    quickHelp: string;
    detailedGuide: string;
    videoTutorial?: string;
    pairProgrammingAvailable: boolean;
  };
  teamContext: {
    similarCases: RecentTeamExample[];
    teamPreferences: TeamStyle;
    availableMentors: string[];
  };
  startTime: string;
  endTime?: string;
  outcome?: 'completed' | 'overridden' | 'abandoned';
}

export interface RecentTeamExample {
  description: string;
  outcome: string;
  developer: string;
  timestamp: string;
}

export interface TeamStyle {
  enforcementLevel: InterventionLevel;
  autonomyThreshold: number;
  preferredPractices: string[];
  exemptionPatterns: string[];
}

// Universal TDD Coach Configuration
export interface TDDCoachConfig {
  universalMode: boolean;
  defaultInterventionLevel: InterventionLevel;
  adaptiveLearning: boolean;
  teamCalibration: boolean;
  emergencyBypassEnabled: boolean;
  metricsCollection: boolean;
  aiToolIntegration: {
    github_copilot: boolean;
    claude_code: boolean;
    vs_code: boolean;
    codex_cli: boolean;
    gemini_cli: boolean;
    qwen_cli: boolean;
  };
}
