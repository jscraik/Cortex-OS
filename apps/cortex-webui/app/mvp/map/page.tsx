// page.tsx (Next 14+ App Router)
'use client';

import { useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { useMousePosition } from '../../hooks/useMousePosition';

export default function RepoMap() {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = useMousePosition(true);

  useEffect(() => {
    (async () => {
      await fetch('/api/context-map').then((r) => r.json());
      // note: render graph using response.files in a follow-up
    })();
  }, []);

  return (
    <Layout activePage="map">
      <main className="p-4 h-full">
        <h1 className="text-xl" aria-live="polite">
          Repo Map
        </h1>
        <figure
          ref={ref}
          aria-label="Dependency graph"
          className="border rounded-2xl p-2 min-h-96"
        />
        <p className="mt-2 text-sm" aria-live="polite">
          Pointer at {x}, {y}
        </p>
        <p className="sr-only">Use Tab to navigate nodes. Press Enter to open details.</p>
      </main>
    </Layout>
  );
}
