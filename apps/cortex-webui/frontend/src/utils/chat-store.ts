'use client';

import { useEffect, useState } from 'react';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
	id: string;
	role: ChatMessageRole;
	content: string;
	timestamp?: number;
	model?: string;
	// Allow additional UI fields without strict typing
	[key: string]: unknown;
}

export interface ChatState {
	messages: ChatMessage[];
}

type Listener = (state: ChatState) => void;

export interface UseChatStoreApi {
	messages: ChatMessage[];
	addMessage: (msg: ChatMessage) => void;
	updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
	deleteMessage: (id: string) => void;
	editMessage: (id: string, content: string) => void;
	clearMessages: () => void;
}

class ChatStoreImpl {
	private state: ChatState = { messages: [] };
	private listeners: Set<Listener> = new Set();

	getState(): ChatState {
		return this.state;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		// send current state immediately
		listener(this.state);
		return () => this.listeners.delete(listener);
	}

	private emit() {
		this.listeners.forEach((l) => {
			l(this.state);
		});
	}

	addMessage(msg: ChatMessage) {
		this.state = { ...this.state, messages: [...this.state.messages, msg] };
		this.emit();
	}

	updateMessage(id: string, patch: Partial<ChatMessage>) {
		this.state = {
			...this.state,
			messages: this.state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
		};
		this.emit();
	}

	deleteMessage(id: string) {
		this.state = {
			...this.state,
			messages: this.state.messages.filter((m) => m.id !== id),
		};
		this.emit();
	}

	editMessage(id: string, content: string) {
		this.updateMessage(id, { content });
	}

	clearMessages() {
		this.state = { messages: [] };
		this.emit();
	}
}

// Global session stores keyed by sessionId
const sessionStores = new Map<string, ChatStoreImpl>();

function getSessionStore(sessionId: string): ChatStoreImpl {
	let store = sessionStores.get(sessionId);
	if (!store) {
		store = new ChatStoreImpl();
		sessionStores.set(sessionId, store);
	}
	return store;
}

export function useChatStore(sessionId: string): UseChatStoreApi {
	const store = getSessionStore(sessionId);
	const [state, setState] = useState<ChatState>(store.getState());

	useEffect(() => {
		return store.subscribe(setState);
	}, [store]);

	return {
		messages: state.messages,
		addMessage: (msg: ChatMessage) => store.addMessage(msg),
		updateMessage: (id: string, patch: Partial<ChatMessage>) => store.updateMessage(id, patch),
		deleteMessage: (id: string) => store.deleteMessage(id),
		editMessage: (id: string, content: string) => store.editMessage(id, content),
		clearMessages: () => store.clearMessages(),
	} as const;
}
