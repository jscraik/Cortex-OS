import type { RunResult } from "./runner.js";

// Minimal in-memory recorder to keep surface tiny; replace with durable store later
export type Record = RunResult & { recordedAt: string };
export function createRecorder() {
  const records: Record[] = [];
  return {
    save(r: RunResult) { const rec = { ...r, recordedAt: new Date().toISOString() }; records.push(rec); return rec; },
    all() { return records.slice(); }
  };
}

