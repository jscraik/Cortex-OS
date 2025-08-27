import { useEffect, useState } from 'react';

/* A11y:
  - role="list" / "listitem"
  - aria-live="polite" for updates
  - Keyboard: ? help, Enter accept, Esc cancel, g/G next/prev
*/
export default function Approvals() {
  const [items, setItems] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') alert('Shortcuts: Enter accept, Esc reject, g next, G prev');
      if (e.key === 'Enter') approve();
      if (e.key === 'Escape') reject();
      if (e.key === 'g') setIdx((i) => Math.min(i + 1, items.length - 1));
      if (e.key === 'G') setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items]);

  function approve() {
    /* POST decision */
  }
  function reject() {
    /* POST decision */
  }

  return (
    <section aria-label="Pending approvals">
      <div aria-live="polite" />
      <ul role="list" aria-describedby="list-desc">
        <p id="list-desc" className="sr-only">
          List of proposals awaiting approval
        </p>
        {items.map((it, i) => (
          <li role="listitem" key={it.id} tabIndex={0} aria-selected={i === idx}>
            <h3>{it.node} proposal</h3>
            <pre>{JSON.stringify(it.proposal, null, 2)}</pre>
            <button onClick={approve} aria-label="Approve proposal">
              Approve
            </button>
            <button onClick={reject} aria-label="Reject proposal">
              Reject
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
