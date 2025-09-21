/**
 * Lightweight memory and resource utilities for tests
 */

export function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function measureHeapUsed(): number {
  return process.memoryUsage().heapUsed;
}

export function getActiveResources(): { handles: number; requests: number } {
  // These are Node private APIs but stable enough for diagnostics in tests
  const anyProc = process as unknown as {
    _getActiveHandles?: () => unknown[];
    _getActiveRequests?: () => unknown[];
  };
  const handles = anyProc._getActiveHandles ? anyProc._getActiveHandles().length : 0;
  const requests = anyProc._getActiveRequests ? anyProc._getActiveRequests().length : 0;
  return { handles, requests };
}

export async function forceGC(): Promise<void> {
  interface GlobalWithGC {
    gc?: () => void;
  }
  const g = (global as unknown as GlobalWithGC).gc;
  if (typeof g === 'function') g();
  // Give the event loop a tick for cleanup
  await new Promise((r) => setTimeout(r, 0));
}
