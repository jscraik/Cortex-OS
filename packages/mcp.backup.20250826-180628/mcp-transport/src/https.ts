export function createHTTPS(si: { endpoint?: string }) {
  if (!si.endpoint) throw new Error('https requires endpoint');
  return {
    async callTool(name: string, payload: unknown) {
      const res = await fetch(new URL('/mcp', si.endpoint), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: Date.now(), tool: name, params: payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  };
}
