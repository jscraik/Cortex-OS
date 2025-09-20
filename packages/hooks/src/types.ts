export type HookEvent =
  | 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit'
  | 'PreToolUse' | 'PostToolUse'
  | 'SubagentStart' | 'SubagentStop'
  | 'PreCompact' | 'Stop' | 'Notify';

export type Hook = {
  matcher: string;                 // regex for tool/subagent, or "*"
  type: 'command' | 'js' | 'graph' | 'http';
  command?: string;                // for command
  code?: string;                   // for js
  graph?: string;                  // subgraph id/name
  url?: string;                    // for http
  timeout_ms?: number;
};

export type HookEntry = { matcher: string; hooks: Hook[] };

export type HookSettings = {
  command?: {
    allowlist?: string[];
  };
};

export type HookConfig = {
  settings?: HookSettings;
} & Partial<Record<HookEvent, HookEntry[]>>;

export type HookContext = {
  event: HookEvent;
  tool?: { name: string; input: unknown };         // Pre/PostToolUse
  subagent?: { name: string; task?: string };
  files?: string[];                              // edited/target files if available
  model?: string;
  cwd: string;
  user: string;
  tags?: string[];
};

export type HookResult =
  | { action: 'allow'; input?: unknown; note?: string }
  | { action: 'deny'; reason: string }
  | { action: 'emit'; note?: string }
  | { action: 'defer'; when: string }           // ISO or cron-ish
  | { action: 'exec'; output?: string };
