declare module '@cortex-os/hooks' {
  export type HookEvent =
    | 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit'
    | 'PreToolUse' | 'PostToolUse'
    | 'SubagentStart' | 'SubagentStop'
    | 'PreCompact' | 'Stop' | 'Notify';

  export type HookContext = Record<string, unknown>;
  export type HookResult = { action: string; [k: string]: unknown };

  export class CortexHooks {
    init(): Promise<void>;
    run(event: HookEvent, ctx: HookContext): Promise<HookResult[]>;
  }
}
