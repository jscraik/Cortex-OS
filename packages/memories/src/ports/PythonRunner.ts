export interface PythonRunner {
  run(path: string, args: string[], options?: Record<string, unknown>): Promise<string>;
}
