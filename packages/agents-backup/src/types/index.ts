/**
 * Core type definitions for Cortex-OS Agents Package
 * Based on the VoltAgent architecture pattern with multi-modal capabilities
 */

import { z } from 'zod';

// ===== Basic Types =====
export interface AgentId {
  id: string;
  name: string;
  version: string;
}

export interface AgentCapabilities {
  capabilities: string[];
  maxInputLength: number;
  supportsStreaming: boolean;
  supportedModalities: ModalityType[];
}

export type ModalityType = 'text' | 'image' | 'audio' | 'video';

// ===== Multi-Modal Input Types =====
export interface TextInput {
  type: 'text';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ImageInput {
  type: 'image';
  url?: string;
  base64?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioInput {
  type: 'audio';
  url?: string;
  base64?: string;
  duration?: number;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoInput {
  type: 'video';
  url?: string;
  base64?: string;
  duration?: number;
  frames?: ImageInput[];
  metadata?: Record<string, unknown>;
}

export type MultiModalInput = TextInput | ImageInput | AudioInput | VideoInput;

export interface AgentInput {
  inputs: MultiModalInput[];
  context?: ConversationContext;
  tools?: ToolCall[];
  memory?: MemoryQuery;
  options?: ExecutionOptions;
}

// ===== Context Types =====
export interface ConversationContext {
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  previousMessages?: Message[];
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ===== Memory System Types =====
export interface MemoryQuery {
  query: string;
  type: 'working' | 'contextual' | 'episodic';
  limit?: number;
  filter?: MemoryFilter;
}

export interface MemoryFilter {
  tags?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  relevanceThreshold?: number;
}

export interface MemoryItem {
  id: string;
  type: 'working' | 'contextual' | 'episodic';
  content: string;
  embedding?: number[];
  tags: string[];
  timestamp: string;
  ttl?: string;
  metadata?: Record<string, unknown>;
}

export interface MemorySystem {
  working: Map<string, MemoryItem>;
  contextual: VectorStore;
  episodic: ConversationHistory;
}

// ===== Tool System Types =====
export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  timeout?: number;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  success: boolean;
  error?: string;
  duration: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  handler: (params: unknown) => Promise<unknown>;
  timeout?: number;
  tags?: string[];
}

// ===== Model Provider Types =====
export interface ModelProvider {
  name: string;
  type: 'mlx' | 'ollama' | 'openai' | 'anthropic' | 'google';
  capabilities: ModelCapabilities;
  isAvailable: () => Promise<boolean>;
  generate: (request: GenerateRequest) => Promise<GenerateResponse>;
  stream?: (request: GenerateRequest) => AsyncIterable<GenerateChunk>;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsTools: boolean;
  costPerToken?: number;
}

export interface GenerateRequest {
  prompt: string;
  images?: string[];
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  seed?: number;
}

export interface GenerateResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

export interface GenerateChunk {
  type: 'content' | 'tool_call' | 'done';
  content?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ===== Streaming Types =====
export interface StreamEvent {
  type: 'token' | 'tool_call' | 'memory' | 'event' | 'error' | 'done';
  data: unknown;
  timestamp: string;
}

export interface StreamProcessor {
  process: (input: AgentInput) => AsyncIterable<StreamEvent>;
  cancel: () => void;
}

// ===== Communication Types =====
export interface A2AMessage {
  id: string;
  type: string;
  source: string;
  target?: string;
  data: unknown;
  timestamp: string;
  correlationId?: string;
}

export interface MCPRequest {
  method: string;
  params?: Record<string, unknown>;
  id?: string;
}

export interface MCPResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: string;
}

// ===== Execution Types =====
export interface ExecutionOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  memoryPolicy?: MemoryPolicy;
}

export interface MemoryPolicy {
  workingMemoryTTL?: string;
  contextualMemoryTTL?: string;
  episodicMemoryTTL?: string;
  maxWorkingMemoryItems?: number;
  maxContextualMemoryItems?: number;
  redactPII?: boolean;
}

// ===== Response Types =====
export interface AgentResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  memoryUpdates?: MemoryItem[];
  events?: A2AMessage[];
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

export interface StreamingAgentResponse {
  id: string;
  stream: AsyncIterable<StreamEvent>;
  metadata?: Record<string, unknown>;
}

// ===== Error Types =====
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ModelProviderError extends AgentError {
  constructor(message: string, public provider: string, details?: Record<string, unknown>) {
    super(message, 'MODEL_PROVIDER_ERROR', { provider, ...details });
    this.name = 'ModelProviderError';
  }
}

export class ToolExecutionError extends AgentError {
  constructor(message: string, public toolName: string, details?: Record<string, unknown>) {
    super(message, 'TOOL_EXECUTION_ERROR', { toolName, ...details });
    this.name = 'ToolExecutionError';
  }
}

// ===== Helper Types =====
export interface VectorStore {
  add: (items: MemoryItem[]) => Promise<void>;
  search: (query: string, limit?: number) => Promise<MemoryItem[]>;
  delete: (ids: string[]) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ConversationHistory {
  add: (message: Message) => Promise<void>;
  get: (conversationId: string, limit?: number) => Promise<Message[]>;
  search: (query: string, filters?: MemoryFilter) => Promise<Message[]>;
  clear: (conversationId?: string) => Promise<void>;
}

// ===== Configuration Types =====
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  instructions: string;
  capabilities: AgentCapabilities;
  modelProviders: ModelProvider[];
  tools: ToolDefinition[];
  memory: MemoryConfig;
  communication: CommunicationConfig;
}

export interface MemoryConfig {
  working: {
    maxItems: number;
    ttl: string;
  };
  contextual: {
    maxItems: number;
    ttl: string;
    vectorStore: VectorStore;
  };
  episodic: {
    maxItems: number;
    ttl: string;
    store: ConversationHistory;
  };
}

export interface CommunicationConfig {
  a2a: {
    enabled: boolean;
    eventBus?: EventBus;
  };
  mcp: {
    enabled: boolean;
    serverUrl?: string;
    client?: MCPClient;
  };
}

export interface EventBus {
  publish: (event: A2AMessage) => Promise<void>;
  subscribe: (eventType: string, handler: (event: A2AMessage) => void) => () => void;
  unsubscribe: (eventType: string, handler: (event: A2AMessage) => void) => void;
}

export interface MCPClient {
  call: (method: string, params?: unknown) => Promise<MCPResponse>;
  notify: (method: string, params?: unknown) => Promise<void>;
  close: () => Promise<void>;
}