import { z } from 'zod';

export const ConversationMessageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	parts: z.array(
		z.object({
			text: z.string(),
		}),
	),
	sessionId: z.string().optional(),
	timestamp: z.string().datetime(),
});

export const ConversationSchema = z.object({
	sessionId: z.string(),
	agentId: z.string(),
	messages: z.array(ConversationMessageSchema),
	context: z.array(z.unknown()).default([]),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	isActive: z.boolean().default(true),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

export class ConversationStore {
	private readonly conversations = new Map<string, Conversation>();

	async startConversation(agentId: string, context?: unknown[]): Promise<string> {
		const sessionId = this.generateSessionId();
		const now = new Date().toISOString();

		const conversation: Conversation = {
			sessionId,
			agentId,
			messages: [],
			context: context || [],
			createdAt: now,
			updatedAt: now,
			isActive: true,
		};

		this.conversations.set(sessionId, conversation);
		return sessionId;
	}

	async continueConversation(
		sessionId: string,
		message: ConversationMessage['role'] extends 'user'
			? Omit<ConversationMessage, 'sessionId' | 'timestamp'>
			: ConversationMessage,
	): Promise<Conversation | null> {
		const conversation = this.conversations.get(sessionId);
		if (!conversation || !conversation.isActive) {
			return null;
		}

		const now = new Date().toISOString();
		const fullMessage: ConversationMessage = {
			...message,
			sessionId,
			timestamp: now,
		};

		conversation.messages.push(fullMessage);
		conversation.updatedAt = now;

		// Generate assistant response if user message
		if (message.role === 'user') {
			await this.generateAssistantResponse(conversation);
		}

		return conversation;
	}

	async getConversation(sessionId: string): Promise<Conversation | null> {
		return this.conversations.get(sessionId) || null;
	}

	async endConversation(sessionId: string): Promise<boolean> {
		const conversation = this.conversations.get(sessionId);
		if (!conversation) return false;

		conversation.isActive = false;
		conversation.updatedAt = new Date().toISOString();
		return true;
	}

	private async generateAssistantResponse(conversation: Conversation): Promise<void> {
		// Simulate processing delay
		await this.delay(1000);

		const lastUserMessage = conversation.messages.filter((m) => m.role === 'user').slice(-1)[0];

		if (!lastUserMessage) return;

		const assistantMessage: ConversationMessage = {
			role: 'assistant',
			parts: [
				{
					text: `I understand you said: "${lastUserMessage.parts[0]?.text}". How can I help you further?`,
				},
			],
			sessionId: conversation.sessionId,
			timestamp: new Date().toISOString(),
		};

		conversation.messages.push(assistantMessage);
		conversation.updatedAt = assistantMessage.timestamp;
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export const createConversationStore = (): ConversationStore => {
	return new ConversationStore();
};
