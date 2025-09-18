// Hook for managing messages and streaming

import { useCallback, useRef, useState } from 'react';
import { API_BASE_URL } from '../constants';
import type { Message } from '../types';

interface UseMessagesReturn {
	messages: Message[];
	streaming: boolean;
	error: string | null;
	sendMessage: (conversationId: string, content: string) => Promise<void>;
	addMessage: (message: Message) => void;
	updateMessage: (id: string, updates: Partial<Message>) => void;
	clearMessages: () => void;
}

const useMessages = (): UseMessagesReturn => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [streaming, setStreaming] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	const addMessage = useCallback((message: Message) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
		setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	const sendMessage = async (conversationId: string, content: string) => {
		setError(null);

		try {
			// Add user message immediately
			const userMessage: Message = {
				id: `msg_${Date.now()}`,
				conversationId,
				role: 'user',
				content,
				createdAt: new Date().toISOString(),
			};

			addMessage(userMessage);

			// Add temporary assistant message for streaming
			const assistantMessage: Message = {
				id: `stream_${Date.now()}`,
				conversationId,
				role: 'assistant',
				content: '',
				createdAt: new Date().toISOString(),
			};

			addMessage(assistantMessage);
			setStreaming(true);

			// Send message to backend to enqueue user message
			await fetch(`${API_BASE_URL}/chat/${conversationId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content }),
			});

			// Open SSE stream to receive assistant response tokens
			setStreaming(true);
			eventSourceRef.current?.close();
			eventSourceRef.current = new EventSource(`${API_BASE_URL}/chat/${conversationId}/stream`);

			eventSourceRef.current.onmessage = (ev: MessageEvent) => {
				try {
					const payload = JSON.parse(ev.data) as
						| { type: 'token'; data: string }
						| { type: 'done'; messageId: string; text: string }
						| { type: 'error'; error: string };
					if (payload.type === 'token') {
						updateMessage(assistantMessage.id, {
							content:
								(messages.find((m) => m.id === assistantMessage.id)?.content || '') + payload.data,
						});
					} else if (payload.type === 'done') {
						updateMessage(assistantMessage.id, {
							id: payload.messageId,
							content: payload.text,
						});
						setStreaming(false);
						eventSourceRef.current?.close();
						eventSourceRef.current = null;
					} else if (payload.type === 'error') {
						setError(payload.error || 'Streaming error');
						setStreaming(false);
						eventSourceRef.current?.close();
						eventSourceRef.current = null;
					}
				} catch (e) {
					console.error('SSE parse error', e);
				}
			};
			eventSourceRef.current.onerror = () => {
				setError('Connection error');
				setStreaming(false);
				eventSourceRef.current?.close();
				eventSourceRef.current = null;
			};
		} catch (err) {
			setStreaming(false);
			const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
			setError(errorMessage);
			console.error('Error sending message:', err);
		}
	};

	return {
		messages,
		streaming,
		error,
		sendMessage,
		addMessage,
		updateMessage,
		clearMessages,
	};
};

// No longer simulating streaming here; wired to backend SSE

export default useMessages;
