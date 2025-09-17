/**
 * Subagent types and interfaces for Cortex-OS
 *
 * This module defines the core types for disk-defined subagents that can be
 * materialized as tools in the main CortexAgent.
 */

import { z } from 'zod';

/**
 * Core subagent configuration schema
 */
export const SubagentConfigSchema = z.object({
  // Basic identification
  name: z.string()
    .min(1, "Name is required")
    .regex(/^[a-z][a-z0-9-]*$/, "Name must be lowercase with hyphens"),
  version: z.string().default("1.0.0"),
  description: z.string().min(1, "Description is required"),

  // Authorization and scoping
  scope: z.enum(["project", "user"]).default("project"),
  allowed_tools: z.array(z.string()).optional(),
  blocked_tools: z.array(z.string()).optional(),

  // Model configuration
  model: z.string().optional(),
  model_provider: z.enum(["mlx", "ollama", "openai", "anthropic", "google"]).optional(),
  model_config: z.record(z.any()).optional(),

  // Behavior flags
  parallel_fanout: z.boolean().default(false),
  auto_delegate: z.boolean().default(true),
  max_recursion: z.number().min(0).max(10).default(3),

  // Context management
  context_isolation: z.boolean().default(true),
  context_window: z.number().positive().optional(),
  memory_enabled: z.boolean().default(true),

  // Execution limits
  timeout_ms: z.number().positive().default(30000),
  max_tokens: z.number().positive().optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  created: z.string().optional(),
  modified: z.string().optional(),
});

export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;

/**
 * Subagent execution context
 */
export interface SubagentContext {
  /** Unique ID for this execution instance */
  id: string;
  /** The subagent configuration */
  config: SubagentConfig;
  /** User message that triggered execution */
  input: string;
  /** Available tools (filtered by allow/block lists) */
  tools: any[];
  /** Execution metadata */
  metadata: {
    startTime: number;
    parentId?: string;
    recursionDepth: number;
    delegated: boolean;
  };
}

/**
 * Subagent execution result
 */
export interface SubagentResult {
  /** Execution success status */
  success: boolean;
  /** Agent response/output */
  output?: string;
  /** Any tool calls made during execution */
  toolCalls?: any[];
  /** Execution metrics */
  metrics: {
    duration: number;
    tokensUsed?: number;
    toolCalls: number;
  };
  /** Error details if failed */
  error?: string;
}

/**
 * Subagent runner interface
 */
export interface ISubagentRunner {
  /** Execute the subagent with given context */
  execute(context: SubagentContext): Promise<SubagentResult>;
  /** Check if subagent is healthy/available */
  healthCheck(): Promise<boolean>;
  /** Get subagent capabilities */
  getCapabilities(): Promise<string[]>;
}

/**
 * Tool materialization interface
 */
export interface SubagentTool {
  /** Tool ID (agent.{name}) */
  id: string;
  /** Tool name for LLM consumption */
  name: string;
  /** Tool description */
  description: string;
  /** Tool parameter schema */
  parameters: {
    type: "object";
    properties: {
      message: {
        type: "string";
        description: "Message or task for the subagent";
      };
      context?: {
        type: "string";
        description: "Optional context or background information";
      };
    };
    required: string[];
  };
  /** Tool execution function */
  execute: (params: any) => Promise<any>;
}

/**
 * Delegation request structure
 */
export interface DelegationRequest {
  /** Target subagent name */
  to: string;
  /** Original message */
  message: string;
  /** Additional context */
  context?: string;
  /** Request metadata */
  metadata?: {
    priority?: number;
    timeout?: number;
    tags?: string[];
  };
}

/**
 * Delegation result
 */
export interface DelegationResult {
  /** Success status */
  success: boolean;
  /** Response from delegated agent */
  response?: string;
  /** Error if delegation failed */
  error?: string;
  /** Delegation metrics */
  metrics: {
    duration: number;
    agent: string;
  };
}

/**
 * Subagent registry interface
 */
export interface ISubagentRegistry {
  /** Register a new subagent */
  register(config: SubagentConfig): Promise<void>;
  /** Unregister a subagent */
  unregister(name: string): Promise<void>;
  /** Get a subagent by name */
  get(name: string): Promise<SubagentConfig | null>;
  /** List all registered subagents */
  list(filter?: { scope?: "project" | "user"; tags?: string[] }): Promise<SubagentConfig[]>;
  /** Check if a subagent exists */
  exists(name: string): Promise<boolean>;
}

/**
 * File format interfaces
 */
export interface YamlSubagentFile {
  version: "1";
  subagent: SubagentConfig;
}

export interface MarkdownSubagentFile {
  // Front matter contains the configuration
  [key: string]: any;
  // Content below front matter is additional documentation
  content?: string;
}

/**
 * Security and authorization
 */
export interface ToolAccessControl {
  /** List of allowed tool patterns (glob-style) */
  allow: string[];
  /** List of blocked tool patterns (glob-style) */
  block: string[];
  /** Check if a tool is accessible */
  isAccessible(toolName: string): boolean;
}

/**
 * Event types for subagent lifecycle
 */
export const SubagentEvents = {
  REGISTERED: "subagent.registered",
  UNREGISTERED: "subagent.unregistered",
  EXECUTION_START: "subagent.execution.start",
  EXECUTION_END: "subagent.execution.end",
  DELEGATION_START: "subagent.delegation.start",
  DELEGATION_END: "subagent.delegation.end",
  ERROR: "subagent.error",
} as const;

export type SubagentEventType = typeof SubagentEvents[keyof typeof SubagentEvents];