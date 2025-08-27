import { useEffect, useState } from 'react';

export default function Approvals() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/approvals');
      if (res.ok) setItems(await res.json());
    })();
  }, []);
  async function decide(id: string, approved: boolean) {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, approved }),
    });
    setItems((xs) => xs.filter((x) => x.id !== id));
  }
  return (
    <main className="p-4">
      <h1 className="text-xl">Approvals</h1>
      <ul>
        {items.map((it) => (
          <li key={it.id} className="border rounded p-2 my-2">
            <div className="font-semibold">{it.node}</div>
            <pre className="overflow-auto max-h-64" aria-label="proposal">
              {JSON.stringify(it.proposal, null, 2)}
            </pre>
            <div className="flex gap-2">
              <button onClick={() => decide(it.id, true)} aria-label="Approve">
                Approve
              </button>
              <button onClick={() => decide(it.id, false)} aria-label="Reject">
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
