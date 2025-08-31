declare module '@cortex-os/mcp-registry/fs-store' {
  export function readAll(): Promise<any[]>;
  export function upsert(si: any): Promise<void>;
  export function remove(name: string): Promise<void>;
}

