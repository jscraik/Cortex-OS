'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '../../../utils/api-client';
import { openSSE } from '../../../utils/sse';
import MessageInput from './MessageInput/MessageInput';
import Messages from './Messages/Messages';
import ModelSelector from './ModelSelector/ModelSelector';

interface Model {
  id: string;
  name: string;
  description?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
}

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

const messageSchema = z.object({
  content: z.string().min(1),
  modelId: z.string(),
  messageId: z.string(),
});

interface ChatProps {
  sessionId?: string;
}

const Chat: React.FC<ChatProps> = ({ sessionId: initialSessionId }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load models and create session lazily
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/models');
        const parsed = modelsSchema.parse(res);
        const modelList = parsed.models.map((m) => ({
          id: m.id,
          name: m.label,
        }));
        setModels(modelList);
        const defaultModel = parsed.default || parsed.models[0]?.id || '';
        if (!activeModel && defaultModel) setActiveModel(defaultModel);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [activeModel]);

  const ensureSession = useCallback(async () => {
    let sid = sessionId;
    if (!sid) {
      sid = crypto.randomUUID();
      setSessionId(sid);
    }
    return sid;
  }, [sessionId]);

  const appendToken = useCallback((token: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((m) => (m.id === 'stream' ? { ...m, content: m.content + token } : m)),
    );
  }, []);

  const finalizeStream = useCallback((messageId?: string, text?: string) => {
    setStreaming(false);
    setMessages((prevMessages) => prevMessages.filter((m) => m.id !== 'stream'));
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId ?? crypto.randomUUID(), role: 'assistant', content: text ?? '' },
    ]);
  }, []);

  const sendMessage = async (content: string) => {
    setError(null);
    if (!content.trim() || !activeModel) return;

    const sid = await ensureSession();
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg, { id: 'stream', role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      // Fire-and-forget send
      const payload = messageSchema.parse({
        content: userMsg.content,
        modelId: activeModel,
        messageId: userMsg.id,
      });

      await apiFetch(`/api/chat/${sid}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Attach stream
      const close = openSSE(
        `/api/chat/${sid}/stream`,
        {},
        {
          onMessage: (data) => {
            try {
              const ev = JSON.parse(data);
              if (ev.type === 'token') {
                appendToken(ev.data);
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
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)),
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold">Chat</h1>
        <ModelSelector
          models={models}
          selectedModelId={activeModel}
          onModelChange={setActiveModel}
        />
      </header>

      <Messages
        messages={messages}
        streaming={streaming}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
      />

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700">Error: {error}</div>
      )}

      <MessageInput
        onSendMessage={sendMessage}
        disabled={streaming}
        placeholder="Type a message..."
      />
    </div>
  );
};

export default Chat;
