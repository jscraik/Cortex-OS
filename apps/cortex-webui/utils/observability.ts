import { z } from 'zod';

// Zod schemas for observability payloads
export const ChatStreamStartSchema = z.object({
	ts: z.string().datetime(),
	evt: z.literal('chat.stream.start'),
	sessionId: z.string().min(1),
	model: z.string().min(1),
	lastUserId: z.string().min(1),
});

export type ChatStreamStart = z.infer<typeof ChatStreamStartSchema>;

export const ChatStreamDoneSchema = z.object({
	ts: z.string().datetime(),
	evt: z.literal('chat.stream.done'),
	sessionId: z.string().min(1),
	model: z.string().min(1),
	messageId: z.string().min(1),
	durationMs: z.number().nonnegative(),
	tokenCount: z.number().nonnegative(),
	textSize: z.number().nonnegative(),
});

export type ChatStreamDone = z.infer<typeof ChatStreamDoneSchema>;

export type ChatStreamEvent = ChatStreamStart | ChatStreamDone;

export const ChatStreamEventSchema = z.discriminatedUnion('evt', [
	ChatStreamStartSchema,
	ChatStreamDoneSchema,
]);

export function makeStartEvent(
	input: Omit<ChatStreamStart, 'ts' | 'evt'>,
): ChatStreamStart {
	const evt: ChatStreamStart = {
		ts: new Date().toISOString(),
		evt: 'chat.stream.start',
		...input,
	};
	return ChatStreamStartSchema.parse(evt);
}

export function makeDoneEvent(
	input: Omit<ChatStreamDone, 'ts' | 'evt'>,
): ChatStreamDone {
	const evt: ChatStreamDone = {
		ts: new Date().toISOString(),
		evt: 'chat.stream.done',
		...input,
	};
	return ChatStreamDoneSchema.parse(evt);
}

export function logEvent(evt: ChatStreamEvent): void {
	const parsed = ChatStreamEventSchema.safeParse(evt);
	if (parsed.success) {
		// eslint-disable-next-line no-console
		console.warn(JSON.stringify(parsed.data));
	} else {
		// eslint-disable-next-line no-console
		console.error('[observability] invalid event', parsed.error.flatten());
	}
}
