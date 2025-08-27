import chalk from "chalk";
import { configManager } from "./config.js";

export type PermissionMode = "plan" | "ask" | "auto";

export interface GuardContext {
  modeOverride?: PermissionMode;
  prompter?: (message: string) => Promise<boolean>;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
  };
}

async function getModeFromConfig(): Promise<PermissionMode> {
  const cfgMode = (await configManager.getValue("permissions.mode")) as
    | PermissionMode
    | undefined;
  const env = String(
    (globalThis as any).process?.env?.CORTEX_PERMISSION_MODE || "",
  ).toLowerCase();
  const envMode = (["plan", "ask", "auto"] as const).includes(
    env as PermissionMode,
  )
    ? (env as PermissionMode)
    : undefined;
  return envMode || cfgMode || "ask";
}

async function defaultPrompt(message: string): Promise<boolean> {
  const proc: any = (globalThis as any).process;
  // Check for Node.js process, interactive TTY, and required methods
  if (
    !proc?.stdin ||
    !proc?.stdout ||
    typeof proc.stdin.once !== "function" ||
    typeof proc.stdin.off !== "function" ||
    typeof proc.stdout.write !== "function" ||
    !proc.stdin.isTTY ||
    !proc.stdout.isTTY
  ) {
    return false;
  }
  return await new Promise<boolean>((resolve) => {
    try {
      proc.stdout.write(`${message} (y/N) `);
      const onData = (chunk: any) => {
        const ans = String(chunk ?? "").trim();
        proc.stdin.off?.("data", onData);
        resolve(/^y(es)?$/i.test(ans));
      };
      proc.stdin.once("data", onData);
    } catch {
      resolve(false);
    }
  });
}

export class PermissionEngine {
  static async getMode(ctx?: GuardContext): Promise<PermissionMode> {
    if (ctx?.modeOverride) return ctx.modeOverride;
    return getModeFromConfig();
  }

  static async setMode(mode: PermissionMode): Promise<void> {
    await configManager.set("permissions.mode", mode);
  }

  static async guardShell<T>(
    description: string,
    exec: () => Promise<T>,
    ctx?: GuardContext,
  ): Promise<{ executed: boolean; result?: T }> {
    const logger = ctx?.logger || { info: console.log, warn: console.warn };
    const mode = await this.getMode(ctx);
    if (mode === "plan") {
      logger.warn(chalk.yellow(`PLAN MODE – would execute: ${description}`));
      return { executed: false };
    }
    if (mode === "ask") {
      const prompt = ctx?.prompter || defaultPrompt;
      const ok = await prompt(`Execute: ${description}?`);
      if (!ok) {
        logger.warn(chalk.yellow("Operation cancelled by user"));
        return { executed: false };
      }
    }
    const result = await exec();
    return { executed: true, result };
  }

  static async guardWrite<T>(
    preview: string,
    apply: () => Promise<T>,
    ctx?: GuardContext,
  ): Promise<{ executed: boolean; result?: T }> {
    const logger = ctx?.logger || { info: console.log, warn: console.warn };
    const mode = await this.getMode(ctx);
    if (mode === "plan") {
      logger.warn(chalk.yellow("PLAN MODE – would write changes:"));
      logger.info(preview);
      return { executed: false };
    }
    if (mode === "ask") {
      const prompt = ctx?.prompter || defaultPrompt;
      const ok = await prompt("Apply these changes?");
      if (!ok) {
        logger.warn(chalk.yellow("Write cancelled by user"));
        return { executed: false };
      }
    }
    const result = await apply();
    return { executed: true, result };
  }
}
