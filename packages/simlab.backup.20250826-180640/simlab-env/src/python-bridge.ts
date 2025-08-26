export function pythonEnv(endpoint: string) {
  return {
    async reset() { const r = await fetch(`${endpoint}/reset`, { method:"POST" }); return r.json(); },
    async step(action: string) {
      const r = await fetch(`${endpoint}/step`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ action }) });
      return r.json() as Promise<{ ctx:any; reward:number; done:boolean }>;
    }
  };
}

