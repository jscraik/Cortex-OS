import type { Request, Response } from 'express';
import { streamChat } from '../services/chatGateway';
import { addMessage, getSession, setModel } from '../services/chatStore';
import {
	logEvent,
	makeDoneEvent,
	makeStartEvent,
} from '../utils/observability';

export async function getChatSession(req: Request, res: Response) {
	const { sessionId } = req.params as { sessionId: string };
	const session = getSession(sessionId);
	res.json(session);
}

export async function postChatMessage(req: Request, res: Response) {
	const { sessionId } = req.params as { sessionId: string };
	const { content, modelId, messageId } = (req.body || {}) as {
		content: string;
		modelId?: string;
		messageId?: string;
	};

	if (!content || typeof content !== 'string' || content.length === 0) {
		res.status(400).json({ error: 'content is required' });
		return;
	}

	if (modelId) setModel(sessionId, modelId);
	const id = messageId || crypto.randomUUID();
	addMessage(sessionId, { id, role: 'user', content });
	res.json({ messageId: id });
}

export async function streamChatSSE(req: Request, res: Response) {
	const { sessionId } = req.params as { sessionId: string };
	const session = getSession(sessionId);
	const lastUser = [...session.messages]
		.reverse()
		.find((m) => m.role === 'user');
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
	res.setHeader('Cache-Control', 'no-cache, no-transform');
	res.setHeader('Connection', 'keep-alive');

	if (!lastUser) {
		res.write(
			`data: ${JSON.stringify({ type: 'error', error: 'no message' })}\n\n`,
		);
		res.end();
		return;
	}

	const OBS =
		process.env.CHAT_OBSERVABILITY === '1' ||
		process.env.CHAT_OBSERVABILITY === 'true';
	const model = session.modelId || 'qwen2.5-0.5b';
	const startedAt = Date.now();
	let tokenCount = 0;
	if (OBS) {
		logEvent(makeStartEvent({ sessionId, model, lastUserId: lastUser.id }));
	}

	try {
		const { text } = await streamChat(
			{ model, messages: session.messages },
			(tok) => {
				tokenCount += tok.length;
				res.write(`data: ${JSON.stringify({ type: 'token', data: tok })}\n\n`);
			},
		);

		const finalId = crypto.randomUUID();
		addMessage(sessionId, { id: finalId, role: 'assistant', content: text });
		const durationMs = Date.now() - startedAt;
		res.write(
			`data: ${JSON.stringify({ type: 'done', messageId: finalId, text, metrics: { durationMs, tokenCount } })}\n\n`,
		);
		res.end();
		if (OBS) {
			logEvent(
				makeDoneEvent({
					sessionId,
					model,
					messageId: finalId,
					durationMs,
					tokenCount,
					textSize: text.length,
				}),
			);
		}
	} catch (e) {
		res.write(
			`data: ${JSON.stringify({ type: 'error', error: (e as Error).message })}\n\n`,
		);
		res.end();
	}
}
