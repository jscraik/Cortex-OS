type Role = "user" | "assistant" | "system";

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
	// eslint-disable-next-line no-var
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

export function addMessage(id: string, msg: Omit<ChatMessage, "createdAt">) {
	const s = getOrCreateSession(id);
	const m: ChatMessage = { ...msg, createdAt: new Date().toISOString() };
	s.messages.push(m);
	s.updatedAt = m.createdAt;
	return m;
}

export function getSession(id: string) {
	return getOrCreateSession(id);
}
