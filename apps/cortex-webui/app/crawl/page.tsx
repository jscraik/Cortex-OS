'use client';

import { useState } from 'react';

export default function CrawlPage() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Failed to crawl');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="p-4">
      <h1 className="text-xl" aria-live="polite">
        Crawl URL
      </h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2" aria-label="Crawl form">
        <label htmlFor="url" className="sr-only">
          URL to crawl
        </label>
        <input
          id="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border rounded p-1 flex-1"
          placeholder="https://example.com"
        />
        <button type="submit" className="border rounded px-2">
          Crawl
        </button>
      </form>
      {error && (
        <p role="alert" className="text-red-600 mt-2">
          {error}
        </p>
      )}
      <ul className="mt-4 list-disc pl-5">
        {results.map((r, idx) => (
          <li key={idx}>
            {r.title} - {r.url}
          </li>
        ))}
      </ul>
    </main>
  );
}
