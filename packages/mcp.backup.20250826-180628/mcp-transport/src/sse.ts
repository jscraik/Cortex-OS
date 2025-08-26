export function createSSE(si: { endpoint?: string }) {
  if (!si.endpoint) throw new Error('sse requires endpoint');
  // Placeholder; real implementation would use EventSource
  return {
    connect: async () => void 0,
  };
}
