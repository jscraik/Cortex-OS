/* @ts-nocheck */
'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../../utils/api-client';
import { openSSE } from '../../../utils/sse';

const modelsSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      speed: z.string().optional(),
      costTier: z.string().optional(),
    }),
  ),
  default: z.string().optional(),
});

const toolEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      args: z.record(z.unknown()).optional(),
      status: z.string().optional(),
    }),
  ),
});

const messageSchema = z.object({
  content: z.string().min(1),
  modelId: z.string(),
  messageId: z.string(),
});

type Model = { id: string; label: string; speed?: string; costTier?: string };
type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string };
type ToolEvent = { id: string; name: string; args?: Record<string, unknown>; status?: string };

export default function ChatPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);

  // load models and create session lazily
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/models');
        const parsed = modelsSchema.parse(res);
        setModels(parsed.models);
        const def = parsed.default || parsed.models[0]?.id || '';
        if (!activeModel && def) setActiveModel(def);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [activeModel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function ensureSession() {
    let sid = sessionId;
    if (!sid) {
      sid = crypto.randomUUID();
      // Set session state and wait for it to be updated before proceeding
      setSessionId(sid);
    }
    // Always use the local sid for API calls and return value
    try {
      const res = await apiFetch(`/api/chat/${sid}/tools`);
      const parsed = toolEventsSchema.parse(res);
      setToolEvents(parsed.events);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load tool events';
      console.error('Failed to load tool events:', e);
      setError(message);
    return sid;
  }

  function appendToken(token: string) {
    setMessages((xs) =>
      xs.map((m) => (m.id === 'stream' ? { ...m, content: m.content + token } : m)),
    );
  }

  function finalizeStream(messageId?: string, text?: string) {
    setStreaming(false);
    setMessages((xs) => xs.filter((m) => m.id !== 'stream'));
    setMessages((xs) => [
      ...xs,
      { id: messageId ?? crypto.randomUUID(), role: 'assistant', content: text ?? '' },
    ]);
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
      const payload = messageSchema.parse({
        content: userMsg.content,
        modelId: activeModel,
        messageId: userMsg.id,
      });
      await apiFetch(`/api/chat/${sid}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // attach stream
      const close = openSSE(
        `/api/chat/${sid}/stream`,
        {},
        {
          onMessage: (data) => {
            try {
              const ev = JSON.parse(data);
              if (ev.type === 'token') appendToken(ev.data);
              else if (ev.type === 'tool') {
                setToolEvents((xs) => [
                  ...xs,
                  {
                    id: ev.id || crypto.randomUUID(),
                    name: ev.name,
                    args: ev.args,
                    status: ev.status,
                  },
                ]);
              } else if (ev.type === 'done') {
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
        },
      );
    } catch (e: any) {
      setStreaming(false);
      setError(e.message);
    }
  }

  return (
    <main className="p-4 grid gap-3" aria-label="Chat interface">
      <a href="#composer" className="sr-only focus:not-sr-only focus:underline">
        Skip to composer
      </a>
      <header className="flex items-center gap-2">
        <h1 className="text-xl">Chat</h1>
        <label className="sr-only" htmlFor="model">
          Model
        </label>
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

      <section className="grid md:grid-cols-[2fr_1fr] gap-3" aria-label="Conversation and tools">
        <div
          className="border rounded p-2 min-h-64"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={streaming}
        >
          <ul>
            {messages.map((m) => (
              <li
                key={m.id}
                className={`my-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%]">
                  <div className="text-xs text-gray-500">{m.role}</div>
                  <div
                    className={`rounded px-2 py-1 whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {streaming && (
            <output className="text-sm text-gray-500" aria-live="polite">
              Streaming…
            </output>
          )}
          <div ref={bottomRef} />
        </div>

        <section className="border rounded p-2" aria-labelledby="tool-calls-heading">
          <h2 id="tool-calls-heading" className="text-sm font-semibold">
            Tool activity
          </h2>
          {toolEvents.length === 0 ? (
            <p className="text-xs text-gray-500">No tools used yet.</p>
          ) : (
            <ul className="text-sm break-words">
              {toolEvents.map((t) => (
                <li key={t.id} className="py-1 border-b last:border-b-0">
                  <div className="font-mono text-xs">{t.name}</div>
                  {t.status && <div className="text-xs text-gray-500">{t.status}</div>}
                  {t.args && (
                    <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto">
                      {JSON.stringify(t.args, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
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
          id="composer"
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border rounded p-2 flex-1 min-h-20"
          placeholder="Type a message…"
        />
        <button
          className="border rounded px-3"
          type="submit"
          disabled={streaming}
          aria-disabled={streaming}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </main>
  );
}
