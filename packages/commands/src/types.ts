export interface LoadedCommandMeta {
  name: string;
  description?: string;
  argumentHint?: string;
  model?: string; // 'inherit' can be represented as undefined
  allowedTools?: string[]; // e.g., ["Bash(git status:*)", "Bash(git commit:*)"]
  scope: 'project' | 'user' | 'builtin';
  filePath?: string; // source .md path if applicable
}

export interface LoadedCommand extends LoadedCommandMeta {
  // Either provide a template to render or an execute function for built-ins
  template?: string; // markdown template body
  execute?: (args: string[], ctx: RenderContext) => Promise<RunResult> | RunResult;
}

export interface RenderContext {
  cwd: string;
  // Safe execution surfaces provided by kernel
  runBashSafe?: (cmd: string, allowlist: string[]) => Promise<{ stdout: string; stderr: string; code: number }>;
  readFileCapped?: (path: string, maxBytes: number, allowlist: string[]) => Promise<string>;
  fileAllowlist?: string[]; // glob patterns
  timeoutMs?: number;
  maxIncludeBytes?: number; // total cap across @includes
}

export interface SlashParseResult {
  cmd: string;
  args: string[];
}

export type CommandsMap = Map<string, LoadedCommand>;

export interface LoadOptions {
  projectDir?: string; // default process.cwd()
  userDir?: string; // default ~/.cortex/commands
}

export interface RunResult {
  text: string;
  metadata?: Record<string, unknown>;
}

export interface BuiltinsApi {
  listAgents?: () => Promise<AgentInfo[]>;
  createAgent?: (spec?: CreateAgentSpec) => Promise<AgentInfo>;
  getModel?: () => string;
  setModel?: (model: string) => Promise<void> | void;
  compact?: (opts?: { focus?: string }) => Promise<string> | string;
  runTests?: (opts?: { pattern?: string }) => Promise<{ passed: number; failed: number; output?: string }>;
  systemStatus?: () => Promise<{ cwd: string; model?: string; branch?: string } | string>;
  runFormat?: (opts?: { changedOnly?: boolean }) => Promise<{ output?: string; success: boolean }>;
  runLint?: (opts?: { changedOnly?: boolean }) => Promise<{ output?: string; success: boolean }>;
}

export interface ModelStore {
  getModel: (sessionId: string) => string;
  setModel: (sessionId: string, model: string) => void | Promise<void>;
}

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface CreateAgentSpec {
  name: string;
  role?: string;
  description?: string;
  config?: Record<string, unknown>;
}
