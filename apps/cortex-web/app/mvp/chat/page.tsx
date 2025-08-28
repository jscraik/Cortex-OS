/* @ts-nocheck */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../utils/api-client';
import { openSSE } from '../../../utils/sse';

type Model = { id: string; label: string; speed?: string; costTier?: string };
type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string };

export default function ChatPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // load models and create session lazily
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ models: Model[] }>('/api/models');
        setModels(res.models);
        if (res.models.length && !activeModel) setActiveModel(res.models[0].id);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function ensureSession() {
    if (sessionId) return sessionId;
    const sid = crypto.randomUUID();
    setSessionId(sid);
    return sid;
  }

  function appendToken(token: string) {
    setMessages((xs) => xs.map((m) => (m.id === 'stream' ? { ...m, content: m.content + token } : m)));
  }

  function finalizeStream(messageId?: string, text?: string) {
    setStreaming(false);
    setMessages((xs) => xs.filter((m) => m.id !== 'stream'));
    setMessages((xs) => [...xs, { id: messageId ?? crypto.randomUUID(), role: 'assistant', content: text ?? '' }]);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!input.trim() || !activeModel) return;
    const sid = await ensureSession();
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages((xs) => [...xs, userMsg, { id: 'stream', role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      // fire-and-forget send
      await apiFetch(`/api/chat/${sid}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: userMsg.content, modelId: activeModel, messageId: userMsg.id }),
      });

      // attach stream
      const close = openSSE(`/api/chat/${sid}/stream`, {}, {
        onMessage: (data) => {
          try {
            const ev = JSON.parse(data);
            if (ev.type === 'token') appendToken(ev.data);
            else if (ev.type === 'done') {
              finalizeStream(ev.messageId, ev.text);
              close();
            } else if (ev.type === 'error') {
              setStreaming(false);
              setError(ev.error || 'Stream error');
              close();
            }
          } catch {
            appendToken(data);
          }
        },
        onError: () => setStreaming(false),
      });
    } catch (e: any) {
      setStreaming(false);
      setError(e.message);
    }
  }

  return (
    <main className="p-4 grid gap-3" aria-label="Chat interface">
      <header className="flex items-center gap-2">
        <h1 className="text-xl">Chat</h1>
        <label className="sr-only" htmlFor="model">Model</label>
        <select
          id="model"
          value={activeModel}
          onChange={(e) => setActiveModel(e.target.value)}
          className="border rounded p-1"
          aria-label="Select model"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </header>

      <section className="border rounded p-2 min-h-64" aria-live="polite" aria-relevant="additions text">
        {messages.map((m) => (
          <div key={m.id} className="my-2">
            <div className="text-xs text-gray-500">{m.role}</div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {streaming && (
          <output className="text-sm text-gray-500" aria-live="polite">
            Streaming…
          </output>
        )}
        <div ref={bottomRef} />
      </section>

      {error && (
        <div role="alert" className="text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={sendMessage} className="flex gap-2" aria-label="Message composer">
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <textarea
          id="message"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border rounded p-2 flex-1 min-h-20"
          placeholder="Type a message…"
        />
        <button className="border rounded px-3" type="submit" disabled={streaming} aria-disabled={streaming}>
          Send
        </button>
      </form>
    </main>
  );
}
