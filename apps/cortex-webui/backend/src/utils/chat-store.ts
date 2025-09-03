type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
	id: string;
	role: Role;
	content: string;
	createdAt: string;
};
export type ChatSession = {
	id: string;
	modelId: string | null;
	createdAt: string;
	updatedAt: string;
	messages: ChatMessage[];
};

declare global {
	var __cortexChatStore: Map<string, ChatSession> | undefined;
}

const store: Map<string, ChatSession> =
	(globalThis as { __cortexChatStore?: Map<string, ChatSession> })
		.__cortexChatStore || new Map<string, ChatSession>();

(
	globalThis as { __cortexChatStore?: Map<string, ChatSession> }
).__cortexChatStore = store;

export function getOrCreateSession(id: string): ChatSession {
	let s = store.get(id);
	if (!s) {
		const now = new Date().toISOString();
		s = { id, modelId: null, createdAt: now, updatedAt: now, messages: [] };
		store.set(id, s);
	}
	return s;
}

export function setModel(id: string, modelId: string) {
	const s = getOrCreateSession(id);
	s.modelId = modelId;
	s.updatedAt = new Date().toISOString();
}

export function addMessage(id: string, msg: Omit<ChatMessage, 'createdAt'>) {
	const s = getOrCreateSession(id);
	const m: ChatMessage = { ...msg, createdAt: new Date().toISOString() };
	s.messages.push(m);
	s.updatedAt = m.createdAt;
	return m;
}

export function getSession(id: string) {
	return getOrCreateSession(id);
}

// Minimal store hook used by Chat.tsx
export function useChatStore(sessionId: string) {
	const session = getOrCreateSession(sessionId);
	return {
		messages: session.messages,
		addMessage: (msg: Omit<ChatMessage, 'createdAt'>) =>
			addMessage(sessionId, msg),
		updateMessage: (messageId: string, patch: Partial<ChatMessage>) => {
			const s = getOrCreateSession(sessionId);
			const idx = s.messages.findIndex((m) => m.id === messageId);
			if (idx !== -1) {
				s.messages[idx] = { ...s.messages[idx], ...patch } as ChatMessage;
				s.updatedAt = new Date().toISOString();
			}
		},
		deleteMessage: (messageId: string) => {
			const s = getOrCreateSession(sessionId);
			s.messages = s.messages.filter((m) => m.id !== messageId);
			s.updatedAt = new Date().toISOString();
		},
		editMessage: (messageId: string, content: string) => {
			const s = getOrCreateSession(sessionId);
			const idx = s.messages.findIndex((m) => m.id === messageId);
			if (idx !== -1) {
				s.messages[idx] = { ...s.messages[idx], content };
				s.updatedAt = new Date().toISOString();
			}
		},
		clearMessages: () => {
			const s = getOrCreateSession(sessionId);
			s.messages = [];
			s.updatedAt = new Date().toISOString();
		},
	};
}
