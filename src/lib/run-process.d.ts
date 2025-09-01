export interface RunProcessOptions {
  timeoutMs?: number;
  input?: string;
  parseJson?: boolean;
  env?: NodeJS.ProcessEnv;
}
export declare function runProcess<T = unknown>(
  command: string,
  args?: string[],
  { timeoutMs, input, parseJson, env }?: RunProcessOptions,
): Promise<T>;
//# sourceMappingURL=run-process.d.ts.map
