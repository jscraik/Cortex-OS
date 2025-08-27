declare module "pino" {
  export interface Logger {
    info: (msg: string, obj?: unknown) => void;
    warn: (msg: string, obj?: unknown) => void;
    error: (msg: string, obj?: unknown) => void;
    debug: (msg: string, obj?: unknown) => void;
  }
  const pino: (options?: Record<string, unknown>) => Logger;
  export default pino;
}
