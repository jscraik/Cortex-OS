export declare function loadHnswIndex(): Promise<{ HNSWIndex: new (...args: unknown[]) => unknown }>;
export declare function migrateFromJson(input: string, out: string, opts?: {
  space?: string;
  M?: number;
  efConstruction?: number;
  efSearch?: number;
}): Promise<string>;
